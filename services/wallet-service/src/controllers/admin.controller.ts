import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';
import { WalletRepository } from '../repositories/wallet.repository';
import { xenditDisbursementClient } from '../config/xendit';

export class AdminController {
    private repository: WalletRepository;

    constructor() {
        this.repository = new WalletRepository();
    }

    /**
     * 1. Get all wallets with filtering
     */
    getAllWallets = async (req: Request, res: Response) => {
        try {
            const {
                minBalance,
                maxBalance,
                userId,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (userId) where.user_id = userId;
            if (minBalance || maxBalance) {
                where.balance = {};
                if (minBalance) where.balance.gte = Number(minBalance);
                if (maxBalance) where.balance.lte = Number(maxBalance);
            }

            const [wallets, total] = await Promise.all([
                prisma.user_wallets.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { balance: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        }
                    }
                }),
                prisma.user_wallets.count({ where })
            ]);

            res.json({
                success: true,
                data: wallets,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all wallets error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get wallet details by user ID
     */
    getWalletByUserId = async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;

            const wallet = await prisma.user_wallets.findUnique({
                where: { user_id: userId },
                include: {
                    users: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true
                        }
                    },
                    wallet_transactions: {
                        orderBy: { created_at: 'desc' },
                        take: 20
                    },
                    wallet_withdrawals: {
                        orderBy: { created_at: 'desc' },
                        take: 10
                    }
                }
            });

            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    error: 'Wallet not found'
                });
            }

            res.json({
                success: true,
                data: wallet
            });
        } catch (error: any) {
            console.error('Get wallet by user ID error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Manual wallet adjustment (credit/debit)
     */
    adjustWalletBalance = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userId, amount, type, description, adminNote } = req.body;

            if (amount === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount cannot be zero'
                });
            }

            const wallet = await this.repository.findOrCreateWallet(userId);

            // Check if debit would result in negative balance
            if (type === 'debit' && Number(wallet.balance) < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient wallet balance'
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                // Update wallet balance
                const updatedWallet = await tx.user_wallets.update({
                    where: { user_id: userId },
                    data: {
                        balance: type === 'credit'
                            ? { increment: amount }
                            : { decrement: amount },
                        ...(type === 'credit' && {
                            total_earned: { increment: amount }
                        }),
                        ...(type === 'debit' && {
                            total_spent: { increment: amount }
                        })
                    }
                });

                // Create transaction record
                const transaction = await tx.wallet_transactions.create({
                    data: {
                        user_id: userId,
                        transaction_type: type === 'credit' ? 'credit' : 'debit',
                        amount: amount,
                        description: description || `Manual ${type} by admin`,
                        reference_type: 'admin_adjustment',
                        metadata: {
                            admin_note: adminNote,
                            adjusted_by: 'admin'
                        }
                    }
                });

                return { wallet: updatedWallet, transaction };
            });

            res.json({
                success: true,
                message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`,
                data: result
            });
        } catch (error: any) {
            console.error('Adjust wallet balance error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Get all wallet transactions with filtering
     */
    getAllTransactions = async (req: Request, res: Response) => {
        try {
            const {
                userId,
                type,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (userId) where.user_id = userId;
            if (type) where.transaction_type = type;
            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [transactions, total] = await Promise.all([
                prisma.wallet_transactions.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true
                            }
                        }
                    }
                }),
                prisma.wallet_transactions.count({ where })
            ]);

            res.json({
                success: true,
                data: transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all transactions error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Get all withdrawal requests
     */
    getAllWithdrawals = async (req: Request, res: Response) => {
        try {
            const {
                userId,
                status,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (userId) where.user_id = userId;
            if (status) where.status = status;
            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [withdrawals, total] = await Promise.all([
                prisma.wallet_withdrawals.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        }
                    }
                }),
                prisma.wallet_withdrawals.count({ where })
            ]);

            res.json({
                success: true,
                data: withdrawals,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all withdrawals error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Approve/reject withdrawal request
     */
    processWithdrawal = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { action, rejectionReason, adminNote } = req.body;

            const withdrawal = await prisma.wallet_withdrawals.findUnique({
                where: { id },
                include: {
                    users: true
                }
            });

            if (!withdrawal) {
                return res.status(404).json({
                    success: false,
                    error: 'Withdrawal request not found'
                });
            }

            if (withdrawal.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Withdrawal is already ${withdrawal.status}`
                });
            }

            if (action === 'approve') {
                try {
                    // Step 1: Update status to processing
                    await prisma.wallet_withdrawals.update({
                        where: { id },
                        data: {
                            status: 'processing',
                            processed_at: new Date(),
                            admin_note: adminNote
                        }
                    });

                    // Step 2: Create Xendit disbursement to actually send money
                    const disbursement = await xenditDisbursementClient.create({
                        externalID: `WD-${id}-${Date.now()}`,
                        amount: Number(withdrawal.net_amount),
                        bankCode: withdrawal.bank_code,
                        accountHolderName: withdrawal.account_name,
                        accountNumber: withdrawal.account_number,
                        description: `Wallet withdrawal for ${withdrawal.users.first_name} ${withdrawal.users.last_name}`,
                        emailTo: [withdrawal.users.email],
                        emailCC: [],
                        emailBCC: []
                    });

                    // Step 3: Update withdrawal with disbursement details
                    const updated = await prisma.wallet_withdrawals.update({
                        where: { id },
                        data: {
                            status: 'completed',
                            completed_at: new Date(),
                            metadata: {
                                xendit_disbursement_id: disbursement.id,
                                xendit_user_id: disbursement.user_id,
                                disbursement_status: disbursement.status,
                                admin_note: adminNote
                            }
                        }
                    });

                    res.json({
                        success: true,
                        message: 'Withdrawal approved and money disbursed to bank account',
                        data: {
                            withdrawal: updated,
                            disbursement: {
                                id: disbursement.id,
                                status: disbursement.status,
                                amount: disbursement.amount
                            }
                        }
                    });
                } catch (disbursementError: any) {
                    // If disbursement fails, update withdrawal to failed
                    await prisma.wallet_withdrawals.update({
                        where: { id },
                        data: {
                            status: 'failed',
                            admin_note: `Disbursement failed: ${disbursementError.message}`
                        }
                    });

                    console.error('Xendit disbursement failed:', disbursementError);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to disburse funds to bank account',
                        details: disbursementError.message
                    });
                }
            } else {
                // Reject and refund to wallet
                await prisma.$transaction(async (tx) => {
                    // Update withdrawal status
                    await tx.wallet_withdrawals.update({
                        where: { id },
                        data: {
                            status: 'rejected',
                            admin_note: rejectionReason || adminNote
                        }
                    });

                    // Refund amount to wallet
                    await tx.user_wallets.update({
                        where: { user_id: withdrawal.user_id },
                        data: {
                            balance: { increment: withdrawal.amount }
                        }
                    });

                    // Create refund transaction
                    await tx.wallet_transactions.create({
                        data: {
                            user_id: withdrawal.user_id,
                            transaction_type: 'credit',
                            amount: withdrawal.amount,
                            description: `Withdrawal rejected - refund`,
                            reference_type: 'withdrawal_refund',
                            reference_id: id,
                            metadata: {
                                rejection_reason: rejectionReason
                            }
                        }
                    });
                });

                res.json({
                    success: true,
                    message: 'Withdrawal rejected and refunded',
                    refundedAmount: withdrawal.amount
                });
            }
        } catch (error: any) {
            console.error('Process withdrawal error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 7. Get wallet analytics
     */
    getWalletAnalytics = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            const where: any = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [
                totalWallets,
                walletStats,
                transactionStats,
                withdrawalStats,
                pendingWithdrawals
            ] = await Promise.all([
                prisma.user_wallets.count(),
                prisma.user_wallets.aggregate({
                    _sum: {
                        balance: true,
                        total_earned: true,
                        total_spent: true
                    },
                    _avg: {
                        balance: true
                    }
                }),
                prisma.wallet_transactions.aggregate({
                    where,
                    _sum: { amount: true },
                    _count: true
                }),
                prisma.wallet_withdrawals.aggregate({
                    where: {
                        ...where,
                        status: 'completed'
                    },
                    _sum: { amount: true },
                    _count: true
                }),
                prisma.wallet_withdrawals.aggregate({
                    where: {
                        status: 'pending'
                    },
                    _sum: { amount: true },
                    _count: true
                })
            ]);

            const analytics = {
                totalWallets,
                totalBalance: Number(walletStats._sum.balance || 0),
                totalEarned: Number(walletStats._sum.total_earned || 0),
                totalSpent: Number(walletStats._sum.total_spent || 0),
                avgBalance: Number(walletStats._avg.balance || 0),
                transactions: {
                    total: transactionStats._count,
                    totalAmount: Number(transactionStats._sum.amount || 0)
                },
                withdrawals: {
                    completed: {
                        count: withdrawalStats._count,
                        totalAmount: Number(withdrawalStats._sum.amount || 0)
                    },
                    pending: {
                        count: pendingWithdrawals._count,
                        totalAmount: Number(pendingWithdrawals._sum.amount || 0)
                    }
                }
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            console.error('Get wallet analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
