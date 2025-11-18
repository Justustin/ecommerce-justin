import { Request, Response } from 'express';
import { prisma } from '@repo/database';

export class WebhookController {
    /**
     * Handle Xendit disbursement callback webhook
     * Called when disbursement status changes (COMPLETED, FAILED)
     */
    handleDisbursementCallback = async (req: Request, res: Response) => {
        try {
            const callbackToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || '';
            const receivedToken = req.headers['x-callback-token'] as string;

            // Verify webhook token
            if (receivedToken !== callbackToken) {
                console.warn('Invalid webhook token received');
                return res.status(403).json({ error: 'Invalid webhook token' });
            }

            const payload = req.body;
            const { external_id, id: disbursement_id, status } = payload;

            console.log(`Disbursement webhook received: ${disbursement_id} - Status: ${status}`);

            // Find the withdrawal by external_id (which is our withdrawal.id)
            const withdrawal = await prisma.wallet_withdrawals.findUnique({
                where: { id: external_id }
            });

            if (!withdrawal) {
                console.error(`Withdrawal not found for external_id: ${external_id}`);
                return res.status(404).json({ error: 'Withdrawal not found' });
            }

            // Update withdrawal status based on disbursement status
            if (status === 'COMPLETED') {
                await prisma.wallet_withdrawals.update({
                    where: { id: withdrawal.id },
                    data: {
                        status: 'completed',
                        completed_at: new Date()
                    }
                });
                console.log(`✓ Withdrawal ${withdrawal.id} marked as completed`);
            } else if (status === 'FAILED') {
                const failureReason = payload.failure_code || 'Disbursement failed';

                await prisma.wallet_withdrawals.update({
                    where: { id: withdrawal.id },
                    data: {
                        status: 'failed',
                        failure_reason: failureReason,
                        completed_at: new Date()
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
                                description: `Withdrawal failed - refunded: ${failureReason}`,
                                reference_id: withdrawal.id,
                                reference_type: 'wallet_withdrawal',
                                balance_before: balanceBefore,
                                balance_after: updatedWallet!.balance
                            }
                        });
                    }
                });

                console.log(`✗ Withdrawal ${withdrawal.id} failed: ${failureReason} - Amount refunded to wallet`);
            }

            res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('Disbursement webhook error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}
