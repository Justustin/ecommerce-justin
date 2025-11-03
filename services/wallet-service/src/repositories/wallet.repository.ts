import { prisma } from '@repo/database';
import { WithdrawalRequestDTO } from '../types';

export class WalletRepository {

    async findOrCreateWallet(userId: string, tx?: any) {
        const prismaClient = tx || prisma;
        let wallet = await prismaClient.user_wallets.findUnique({ where: { user_id: userId } });
        if (!wallet) {
            wallet = await prismaClient.user_wallets.create({ data: { user_id: userId } });
        }
        return wallet;
    }

    async creditWallet(userId: string, amount: number, tx: any) {
        return tx.user_wallets.update({
            where: { user_id: userId },
            data: {
                balance: { increment: amount },
                total_earned: { increment: amount }
            }
        });
    }

    async createTransaction(data: any, tx: any) {
        return tx.wallet_transactions.create({ data });
    }
    
    async createWithdrawal(data: WithdrawalRequestDTO, fee: number, netAmount: number, tx: any) {
        return tx.wallet_withdrawals.create({
            data: {
                user_id: data.userId,
                amount: data.amount,
                withdrawal_fee: fee,
                net_amount: netAmount,
                bank_code: data.bankCode,
                bank_name: data.bankName,
                account_number: data.accountNumber,
                account_name: data.accountName,
                status: 'pending'
            }
        });
    }
}