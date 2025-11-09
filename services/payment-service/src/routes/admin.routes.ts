import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * tags:
 *   name: Admin - Payments
 *   description: Admin endpoints for payment management
 */

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments with filtering
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, expired, failed, refunded]
 *       - in: query
 *         name: isEscrow
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/payments', controller.getAllPayments);

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved
 *       404:
 *         description: Payment not found
 */
router.get(
    '/payments/:id',
    [param('id').isUUID()],
    controller.getPaymentById
);

/**
 * @swagger
 * /api/admin/payments/{id}/status:
 *   put:
 *     summary: Force update payment status (admin override)
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, paid, expired, failed, refunded]
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated
 */
router.put(
    '/payments/:id/status',
    [
        param('id').isUUID(),
        body('status').isIn(['pending', 'paid', 'expired', 'failed', 'refunded']),
        body('adminNote').optional().isString()
    ],
    controller.updatePaymentStatus
);

/**
 * @swagger
 * /api/admin/payments/{id}/reconcile:
 *   post:
 *     summary: Reconcile payment with Xendit
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reconciliation results
 */
router.post(
    '/payments/:id/reconcile',
    [param('id').isUUID()],
    controller.reconcilePayment
);

/**
 * @swagger
 * /api/admin/payments/analytics:
 *   get:
 *     summary: Get payment analytics and dashboard data
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/payments/analytics', controller.getPaymentAnalytics);

/**
 * @swagger
 * /api/admin/refunds:
 *   get:
 *     summary: Get all refunds with filtering
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, rejected]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Refunds retrieved successfully
 */
router.get('/refunds', controller.getAllRefunds);

/**
 * @swagger
 * /api/admin/refunds/{id}/approve:
 *   post:
 *     summary: Approve pending refund
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund approved
 */
router.post(
    '/refunds/:id/approve',
    [
        param('id').isUUID(),
        body('adminNote').optional().isString()
    ],
    controller.approveRefund
);

/**
 * @swagger
 * /api/admin/refunds/{id}/reject:
 *   post:
 *     summary: Reject pending refund
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund rejected
 */
router.post(
    '/refunds/:id/reject',
    [
        param('id').isUUID(),
        body('reason').notEmpty().isString(),
        body('adminNote').optional().isString()
    ],
    controller.rejectRefund
);

/**
 * @swagger
 * /api/admin/refunds/manual:
 *   post:
 *     summary: Process manual refund (admin-initiated)
 *     tags: [Admin - Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Manual refund processed
 */
router.post(
    '/refunds/manual',
    [
        body('paymentId').isUUID(),
        body('amount').optional().isNumeric(),
        body('reason').optional().isString(),
        body('description').optional().isString()
    ],
    controller.processManualRefund
);

/**
 * @swagger
 * /api/admin/escrow/balance:
 *   get:
 *     summary: Get escrow balance summary
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupSessionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escrow balance retrieved
 */
router.get('/escrow/balance', controller.getEscrowBalance);

/**
 * @swagger
 * /api/admin/escrow/release:
 *   post:
 *     summary: Release escrow for group session
 *     tags: [Admin - Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupSessionId
 *             properties:
 *               groupSessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Escrow released successfully
 */
router.post(
    '/escrow/release',
    [body('groupSessionId').isUUID()],
    controller.releaseEscrow
);

/**
 * @swagger
 * /api/admin/ledger:
 *   get:
 *     summary: Get transaction ledger with filtering
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [payment_received, refund_issued, settlement_paid, escrow_released]
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Transaction ledger retrieved
 */
router.get('/ledger', controller.getTransactionLedger);

/**
 * @swagger
 * /api/admin/settlements/ready:
 *   get:
 *     summary: Get settlement-ready payments for factory payouts
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Settlement-ready payments retrieved
 */
router.get('/settlements/ready', controller.getSettlementReadyPayments);

export default router;
