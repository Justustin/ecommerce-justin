import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { TransactionLedgerRepository } from '../repositories/transaction-ledger.repository';
import { RefundService } from '../services/refund.service';
import axios from 'axios';

const XENDIT_API_KEY = process.env.XENDIT_API_KEY || '';
const XENDIT_API_URL = 'https://api.xendit.co';

export class AdminController {
    private paymentRepo: PaymentRepository;
    private refundRepo: RefundRepository;
    private ledgerRepo: TransactionLedgerRepository;
    private refundService: RefundService;

    constructor() {
        this.paymentRepo = new PaymentRepository();
        this.refundRepo = new RefundRepository();
        this.ledgerRepo = new TransactionLedgerRepository();
        this.refundService = new RefundService();
    }

    /**
     * 1. Get all payments with filtering and pagination
     */
    getAllPayments = async (req: Request, res: Response) => {
        try {
            const {
                status,
                isEscrow,
                userId,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (status) where.payment_status = status;
            if (isEscrow !== undefined) where.is_in_escrow = isEscrow === 'true';
            if (userId) where.user_id = userId;

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [payments, total] = await Promise.all([
                prisma.payments.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        orders: {
                            select: {
                                id: true,
                                order_number: true,
                                status: true,
                                total_amount: true
                            }
                        },
                        refunds: {
                            select: {
                                id: true,
                                refund_code: true,
                                refund_status: true,
                                refund_amount: true
                            }
                        }
                    }
                }),
                prisma.payments.count({ where })
            ]);

            res.json({
                success: true,
                data: payments,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all payments error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get payment details by ID
     */
    getPaymentById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const payment = await prisma.payments.findUnique({
                where: { id },
                include: {
                    users: true,
                    orders: {
                        include: {
                            order_items: true
                        }
                    },
                    refunds: true,
                    transaction_ledger: {
                        orderBy: { transaction_time: 'desc' }
                    }
                }
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            res.json({
                success: true,
                data: payment
            });
        } catch (error: any) {
            console.error('Get payment by ID error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Get all refunds with filtering
     */
    getAllRefunds = async (req: Request, res: Response) => {
        try {
            const {
                status,
                userId,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (status) where.refund_status = status;
            if (userId) where.user_id = userId;

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [refunds, total] = await Promise.all([
                prisma.refunds.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        payments: {
                            select: {
                                payment_code: true,
                                order_amount: true,
                                payment_status: true
                            }
                        },
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        orders: {
                            select: {
                                order_number: true,
                                status: true
                            }
                        }
                    }
                }),
                prisma.refunds.count({ where })
            ]);

            res.json({
                success: true,
                data: refunds,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all refunds error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Approve pending refund
     */
    approveRefund = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { adminNote } = req.body;

            const refund = await this.refundRepo.findById(id);
            if (!refund) {
                return res.status(404).json({
                    success: false,
                    error: 'Refund not found'
                });
            }

            if (refund.refund_status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Refund is ${refund.refund_status}, cannot approve`
                });
            }

            // Update refund status with approval details
            await prisma.refunds.update({
                where: { id },
                data: {
                    approved_at: new Date(),
                    admin_note: adminNote,
                    updated_at: new Date()
                }
            });

            // CRITICAL FIX #3: Actually process the refund through Xendit
            // This was a TODO that was never implemented!
            try {
                const result = await this.refundService.processRefund(id);

                res.json({
                    success: true,
                    message: 'Refund approved and processed successfully',
                    data: result.refund
                });
            } catch (refundError: any) {
                console.error('Refund processing failed:', refundError);

                // Mark refund as failed
                await this.refundRepo.markFailed(id, refundError.message);

                return res.status(500).json({
                    success: false,
                    error: 'Refund approved but processing failed',
                    details: refundError.message
                });
            }
        } catch (error: any) {
            console.error('Approve refund error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Reject pending refund
     */
    rejectRefund = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { reason, adminNote } = req.body;

            const refund = await this.refundRepo.findById(id);
            if (!refund) {
                return res.status(404).json({
                    success: false,
                    error: 'Refund not found'
                });
            }

            if (refund.refund_status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Refund is ${refund.refund_status}, cannot reject`
                });
            }

            const updated = await prisma.refunds.update({
                where: { id },
                data: {
                    refund_status: 'rejected',
                    reason_description: reason,
                    admin_note: adminNote,
                    updated_at: new Date()
                }
            });

            res.json({
                success: true,
                message: 'Refund rejected',
                data: updated
            });
        } catch (error: any) {
            console.error('Reject refund error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Process manual refund (for admin-initiated refunds)
     */
    processManualRefund = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { paymentId, amount, reason, description } = req.body;

            const payment = await this.paymentRepo.findById(paymentId);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            if (payment.payment_status !== 'paid') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only refund paid payments'
                });
            }

            // Check if already refunded
            const existingRefund = await prisma.refunds.findFirst({
                where: {
                    payment_id: paymentId,
                    refund_status: { in: ['processing', 'completed'] }
                }
            });

            if (existingRefund) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment already has active refund'
                });
            }

            // Create refund
            const refund = await this.refundRepo.create({
                paymentId,
                orderId: payment.order_id,
                userId: payment.user_id,
                amount: amount || Number(payment.order_amount),
                reason: reason || 'customer_request',
                description: description || 'Manual refund by admin'
            }, payment);

            // CRITICAL FIX: Actually process the refund through Xendit
            // Previously just marked as processing without calling Xendit API
            try {
                const result = await this.refundService.processRefund(refund.id);

                res.json({
                    success: true,
                    message: 'Manual refund created and processed successfully',
                    data: result.refund
                });
            } catch (refundError: any) {
                console.error('Manual refund processing failed:', refundError);

                // Mark refund as failed
                await this.refundRepo.markFailed(refund.id, refundError.message);

                return res.status(500).json({
                    success: false,
                    error: 'Manual refund created but processing failed',
                    details: refundError.message
                });
            }
        } catch (error: any) {
            console.error('Process manual refund error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 7. Get escrow balance summary
     */
    getEscrowBalance = async (req: Request, res: Response) => {
        try {
            const { factoryId, groupSessionId } = req.query;

            const where: any = {
                is_in_escrow: true,
                payment_status: 'paid'
            };

            if (factoryId) {
                where.metadata = {
                    path: ['factoryId'],
                    equals: factoryId
                };
            }

            if (groupSessionId) {
                where.group_session_id = groupSessionId;
            }

            const escrowPayments = await prisma.payments.findMany({
                where,
                include: {
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            const totalEscrow = escrowPayments.reduce(
                (sum, p) => sum + Number(p.order_amount),
                0
            );

            const summary = {
                totalEscrow,
                count: escrowPayments.length,
                payments: escrowPayments
            };

            res.json({
                success: true,
                data: summary
            });
        } catch (error: any) {
            console.error('Get escrow balance error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 8. Release escrow for group session
     */
    releaseEscrow = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { groupSessionId } = req.body;

            const escrowPayments = await prisma.payments.findMany({
                where: {
                    group_session_id: groupSessionId,
                    is_in_escrow: true,
                    payment_status: 'paid'
                }
            });

            if (escrowPayments.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No escrow payments found for this session'
                });
            }

            const paymentIds = escrowPayments.map(p => p.id);

            // Release escrow
            await this.paymentRepo.releaseEscrow(paymentIds);

            // Record in ledger for each payment
            for (const payment of escrowPayments) {
                await this.ledgerRepo.recordEscrowRelease(
                    payment.id,
                    payment.order_id || '',
                    payment.order_amount,
                    groupSessionId
                );
            }

            res.json({
                success: true,
                message: `Released escrow for ${escrowPayments.length} payments`,
                data: {
                    releasedCount: escrowPayments.length,
                    totalAmount: escrowPayments.reduce((sum, p) => sum + Number(p.order_amount), 0)
                }
            });
        } catch (error: any) {
            console.error('Release escrow error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 9. Get transaction ledger with filtering
     */
    getTransactionLedger = async (req: Request, res: Response) => {
        try {
            const {
                transactionType,
                factoryId,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (transactionType) where.transaction_type = transactionType;
            if (factoryId) where.factory_id = factoryId;

            if (startDate || endDate) {
                where.transaction_time = {};
                if (startDate) where.transaction_time.gte = new Date(startDate as string);
                if (endDate) where.transaction_time.lte = new Date(endDate as string);
            }

            const [transactions, total, summary] = await Promise.all([
                prisma.transaction_ledger.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { transaction_time: 'desc' },
                    include: {
                        payments: {
                            select: {
                                payment_code: true,
                                payment_status: true
                            }
                        },
                        orders: {
                            select: {
                                order_number: true,
                                status: true
                            }
                        },
                        factories: {
                            select: {
                                factory_name: true
                            }
                        }
                    }
                }),
                prisma.transaction_ledger.count({ where }),
                prisma.transaction_ledger.aggregate({
                    where,
                    _sum: { amount: true },
                    _count: true
                })
            ]);

            res.json({
                success: true,
                data: transactions,
                summary: {
                    totalAmount: summary._sum.amount || 0,
                    totalCount: summary._count
                },
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get transaction ledger error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 10. Reconcile payment with Xendit
     */
    reconcilePayment = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const payment = await this.paymentRepo.findById(id);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            if (!payment.gateway_transaction_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment has no gateway transaction ID'
                });
            }

            // Fetch from Xendit
            let xenditData;
            try {
                const response = await axios.get(
                    `${XENDIT_API_URL}/v2/invoices/${payment.gateway_transaction_id}`,
                    {
                        headers: {
                            'Authorization': `Basic ${Buffer.from(XENDIT_API_KEY + ':').toString('base64')}`
                        }
                    }
                );
                xenditData = response.data;
            } catch (xenditError: any) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch from Xendit',
                    details: xenditError.response?.data || xenditError.message
                });
            }

            // Compare statuses
            const xenditStatus = xenditData.status; // PENDING, PAID, EXPIRED, etc.
            const ourStatus = payment.payment_status;

            const statusMap: Record<string, string> = {
                'PAID': 'paid',
                'EXPIRED': 'expired',
                'PENDING': 'pending'
            };

            const expectedStatus = statusMap[xenditStatus] || 'pending';

            const isInSync = ourStatus === expectedStatus;

            const reconciliation = {
                paymentId: payment.id,
                paymentCode: payment.payment_code,
                ourStatus,
                xenditStatus,
                expectedStatus,
                isInSync,
                ourAmount: Number(payment.order_amount),
                xenditAmount: xenditData.amount,
                amountMatch: Number(payment.order_amount) === xenditData.amount,
                xenditPaidAt: xenditData.paid_at,
                ourPaidAt: payment.paid_at,
                gatewayFee: xenditData.fees_paid_amount || 0
            };

            res.json({
                success: true,
                data: reconciliation,
                xenditData
            });
        } catch (error: any) {
            console.error('Reconcile payment error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 11. Force update payment status (admin override)
     */
    updatePaymentStatus = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { status, adminNote } = req.body;

            const payment = await this.paymentRepo.findById(id);
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }

            const validStatuses = ['pending', 'paid', 'expired', 'failed', 'refunded'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const updated = await prisma.payments.update({
                where: { id },
                data: {
                    payment_status: status,
                    admin_note: adminNote,
                    updated_at: new Date(),
                    ...(status === 'paid' && !payment.paid_at && { paid_at: new Date() }),
                    ...(status === 'refunded' && !payment.refunded_at && { refunded_at: new Date() })
                }
            });

            res.json({
                success: true,
                message: 'Payment status updated',
                data: updated
            });
        } catch (error: any) {
            console.error('Update payment status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 12. Get payment analytics/dashboard
     */
    getPaymentAnalytics = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            const where: any = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [
                totalPayments,
                paidPayments,
                pendingPayments,
                expiredPayments,
                refundedPayments,
                escrowPayments,
                totalRefunds,
                pendingRefunds
            ] = await Promise.all([
                prisma.payments.aggregate({
                    where,
                    _sum: { order_amount: true },
                    _count: true
                }),
                prisma.payments.aggregate({
                    where: { ...where, payment_status: 'paid' },
                    _sum: { order_amount: true },
                    _count: true
                }),
                prisma.payments.count({
                    where: { ...where, payment_status: 'pending' }
                }),
                prisma.payments.count({
                    where: { ...where, payment_status: 'expired' }
                }),
                prisma.payments.count({
                    where: { ...where, payment_status: 'refunded' }
                }),
                prisma.payments.aggregate({
                    where: { ...where, is_in_escrow: true, payment_status: 'paid' },
                    _sum: { order_amount: true },
                    _count: true
                }),
                prisma.refunds.aggregate({
                    where: {
                        created_at: where.created_at
                    },
                    _sum: { refund_amount: true },
                    _count: true
                }),
                prisma.refunds.count({
                    where: {
                        refund_status: 'pending',
                        created_at: where.created_at
                    }
                })
            ]);

            const analytics = {
                totalPayments: {
                    count: totalPayments._count,
                    amount: totalPayments._sum.order_amount || 0
                },
                paidPayments: {
                    count: paidPayments._count,
                    amount: paidPayments._sum.order_amount || 0
                },
                pendingPayments: {
                    count: pendingPayments
                },
                expiredPayments: {
                    count: expiredPayments
                },
                refundedPayments: {
                    count: refundedPayments
                },
                escrow: {
                    count: escrowPayments._count,
                    amount: escrowPayments._sum.order_amount || 0
                },
                refunds: {
                    total: {
                        count: totalRefunds._count,
                        amount: totalRefunds._sum.refund_amount || 0
                    },
                    pending: {
                        count: pendingRefunds
                    }
                },
                netRevenue: (paidPayments._sum.order_amount || 0) - (totalRefunds._sum.refund_amount || 0)
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            console.error('Get payment analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 13. Get settlement-ready payments (for factory payouts)
     */
    getSettlementReadyPayments = async (req: Request, res: Response) => {
        try {
            const { factoryId, startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate and endDate are required'
                });
            }

            const periodStart = new Date(startDate as string);
            const periodEnd = new Date(endDate as string);

            // Get payments that are:
            // 1. Paid
            // 2. Not in escrow (or escrow released)
            // 3. Within the period
            // 4. Not yet settled (we'll check settlement records)
            const payments = await this.paymentRepo.findEligibleForSettlement(
                periodStart,
                periodEnd
            );

            let filteredPayments = payments;

            // Filter by factory if specified
            if (factoryId) {
                filteredPayments = payments.filter(payment => {
                    if (!payment.orders) return false;
                    return payment.orders.order_items.some(
                        item => item.factory_id === factoryId
                    );
                });
            }

            const totalAmount = filteredPayments.reduce(
                (sum, p) => sum + Number(p.order_amount),
                0
            );

            res.json({
                success: true,
                data: {
                    payments: filteredPayments,
                    summary: {
                        count: filteredPayments.length,
                        totalAmount,
                        period: {
                            start: periodStart,
                            end: periodEnd
                        }
                    }
                }
            });
        } catch (error: any) {
            console.error('Get settlement-ready payments error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
