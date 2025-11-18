import { prisma } from '@repo/database';
import { WalletRepository } from '../repositories/wallet.repository';
import { CreditTransactionDTO, WithdrawalRequestDTO } from '../types';

const WITHDRAWAL_FEE = 2500; // Flat fee from constants

export class WalletService {
    private repository: WalletRepository;

    constructor() {
        this.repository = new WalletRepository();
    }

    async getBalance(userId: string) {
        const wallet = await this.repository.findOrCreateWallet(userId);
        return wallet;
    }

    async credit(data: CreditTransactionDTO) {
        if (data.amount <= 0) {
            throw new Error('Credit amount must be positive.');
        }

        return prisma.$transaction(async (tx) => {
            const wallet = await this.repository.findOrCreateWallet(data.userId, tx);
            const balanceBefore = wallet.balance;

            const updatedWallet = await this.repository.creditWallet(data.userId, data.amount, tx);

            const transaction = await this.repository.createTransaction({
                user_id: data.userId,
                amount: data.amount,
                type: data.type,
                description: data.description,
                reference_id: data.referenceId,
                reference_type: data.referenceType,
                balance_before: balanceBefore,
                balance_after: updatedWallet.balance
            }, tx);
            
            return transaction;
        });
    }

    async requestWithdrawal(data: WithdrawalRequestDTO) {
        if (data.amount <= WITHDRAWAL_FEE) {
            throw new Error(`Withdrawal amount must be greater than the fee of Rp ${WITHDRAWAL_FEE}`);
        }
        
        return prisma.$transaction(async (tx) => {
            const wallet = await this.repository.findOrCreateWallet(data.userId, tx);
            const balanceBefore = wallet.balance;
            const netAmount = data.amount - WITHDRAWAL_FEE;

            // CRITICAL FIX: Atomic balance check and update to prevent race condition
            // Use updateMany with balance check in WHERE clause
            const updateResult = await tx.user_wallets.updateMany({
                where: {
                    user_id: data.userId,
                    balance: { gte: data.amount } // Only update if sufficient balance
                },
                data: {
                    balance: { decrement: data.amount },
                    total_withdrawn: { increment: data.amount }
                }
            });

            // If no rows were updated, balance was insufficient
            if (updateResult.count === 0) {
                throw new Error('Insufficient wallet balance.');
            }

            // Get the updated wallet
            const updatedWallet = await tx.user_wallets.findUnique({
                where: { user_id: data.userId }
            });

            if (!updatedWallet) {
                throw new Error('Wallet not found after update');
            }

            // 2. Create the withdrawal request record
            const withdrawal = await this.repository.createWithdrawal(data, WITHDRAWAL_FEE, netAmount, tx);

            // 3. Create a transaction log for the withdrawal
            await this.repository.createTransaction({
                user_id: data.userId,
                amount: -data.amount, // Negative for debit
                type: 'withdrawal',
                description: `Withdrawal to ${data.bankName} - ${data.accountNumber}`,
                reference_id: withdrawal.id,
                reference_type: 'wallet_withdrawal',
                balance_before: balanceBefore,
                balance_after: updatedWallet.balance
            }, tx);

            return withdrawal;
        });
    }

    /**
     * Process batch withdrawals via Xendit Disbursement API
     * Called by CRON job 2x per week (Tuesday & Friday)
     */
    async processBatchWithdrawals() {
        const xenditApiKey = process.env.XENDIT_SECRET_KEY;
        if (!xenditApiKey) {
            throw new Error('XENDIT_SECRET_KEY not configured');
        }

        // Get all pending withdrawals
        const pendingWithdrawals = await prisma.wallet_withdrawals.findMany({
            where: { status: 'pending' },
            include: { users: { select: { phone_number: true, email: true } } }
        });

        if (pendingWithdrawals.length === 0) {
            return {
                message: 'No pending withdrawals to process',
                processed: 0,
                failed: 0
            };
        }

        console.log(`Processing ${pendingWithdrawals.length} withdrawal requests...`);

        const results = {
            processed: 0,
            failed: 0,
            errors: [] as any[]
        };

        // Process each withdrawal
        for (const withdrawal of pendingWithdrawals) {
            try {
                // Call Xendit Create Disbursement API
                const axios = require('axios');
                const response = await axios.post(
                    'https://api.xendit.co/disbursements',
                    {
                        external_id: withdrawal.id,
                        amount: Math.round(Number(withdrawal.net_amount)),
                        bank_code: withdrawal.bank_code,
                        account_holder_name: withdrawal.account_name,
                        account_number: withdrawal.account_number,
                        description: `Wallet withdrawal - ${withdrawal.id}`,
                        email_to: withdrawal.users.email || undefined,
                        email_cc: undefined,
                        email_bcc: undefined
                    },
                    {
                        auth: {
                            username: xenditApiKey,
                            password: ''
                        },
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );

                // Update withdrawal status to processing
                await prisma.wallet_withdrawals.update({
                    where: { id: withdrawal.id },
                    data: {
                        status: 'processing',
                        xendit_disbursement_id: response.data.id,
                        processed_at: new Date()
                    }
                });

                results.processed++;
                console.log(`✓ Withdrawal ${withdrawal.id} sent to Xendit (xendit_disbursement_id: ${response.data.id})`);

            } catch (error: any) {
                // Mark withdrawal as failed
                const errorMessage = error.response?.data?.message || error.message;

                await prisma.wallet_withdrawals.update({
                    where: { id: withdrawal.id },
                    data: {
                        status: 'failed',
                        failure_reason: errorMessage,
                        processed_at: new Date()
                    }
                });

                // Refund the amount back to user's wallet
                await prisma.$transaction(async (tx) => {
                    const wallet = await tx.user_wallets.findUnique({
                        where: { user_id: withdrawal.user_id }
                    });

                    if (wallet) {
                        const balanceBefore = wallet.balance;

                        await tx.user_wallets.update({
                            where: { user_id: withdrawal.user_id },
                            data: {
                                balance: { increment: withdrawal.amount },
                                total_withdrawn: { decrement: withdrawal.amount }
                            }
                        });

                        const updatedWallet = await tx.user_wallets.findUnique({
                            where: { user_id: withdrawal.user_id }
                        });

                        await tx.wallet_transactions.create({
                            data: {
                                user_id: withdrawal.user_id,
                                amount: withdrawal.amount,
                                type: 'refund',
                                description: `Withdrawal failed - refunded: ${errorMessage}`,
                                reference_id: withdrawal.id,
                                reference_type: 'wallet_withdrawal',
                                balance_before: balanceBefore,
                                balance_after: updatedWallet!.balance
                            }
                        });
                    }
                });

                results.failed++;
                results.errors.push({
                    withdrawal_id: withdrawal.id,
                    error: errorMessage
                });

                console.error(`✗ Withdrawal ${withdrawal.id} failed: ${errorMessage}`);
            }
        }

        return results;
    }
};


