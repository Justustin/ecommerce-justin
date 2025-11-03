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

            if (wallet.balance < data.amount) {
                throw new Error('Insufficient wallet balance.');
            }

            const balanceBefore = wallet.balance;
            const netAmount = data.amount - WITHDRAWAL_FEE;

            // 1. Debit the wallet
            const updatedWallet = await tx.user_wallets.update({
                where: { user_id: data.userId },
                data: {
                    balance: { decrement: data.amount },
                    total_withdrawn: { increment: data.amount }
                }
            });

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
};


