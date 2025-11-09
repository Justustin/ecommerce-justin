import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * tags:
 *   name: Admin - Wallets
 *   description: Admin endpoints for wallet management
 */

/**
 * @swagger
 * /api/admin/wallets:
 *   get:
 *     summary: Get all wallets with filtering
 *     tags: [Admin - Wallets]
 *     parameters:
 *       - in: query
 *         name: minBalance
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxBalance
 *         schema:
 *           type: number
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
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
 *         description: Wallets retrieved successfully
 */
router.get('/wallets', controller.getAllWallets);

/**
 * @swagger
 * /api/admin/wallets/user/{userId}:
 *   get:
 *     summary: Get wallet details by user ID
 *     tags: [Admin - Wallets]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet details retrieved
 *       404:
 *         description: Wallet not found
 */
router.get(
    '/wallets/user/:userId',
    [param('userId').isUUID()],
    controller.getWalletByUserId
);

/**
 * @swagger
 * /api/admin/wallets/adjust:
 *   post:
 *     summary: Manual wallet adjustment (credit/debit)
 *     tags: [Admin - Wallets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [credit, debit]
 *               description:
 *                 type: string
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet adjusted successfully
 */
router.post(
    '/wallets/adjust',
    [
        body('userId').isUUID(),
        body('amount').isNumeric().isFloat({ gt: 0 }),
        body('type').isIn(['credit', 'debit']),
        body('description').optional().isString(),
        body('adminNote').optional().isString()
    ],
    controller.adjustWalletBalance
);

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all wallet transactions with filtering
 *     tags: [Admin - Wallets]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit]
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
 *         description: Transactions retrieved successfully
 */
router.get('/transactions', controller.getAllTransactions);

/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     summary: Get all withdrawal requests
 *     tags: [Admin - Wallets]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, rejected]
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
 *         description: Withdrawals retrieved successfully
 */
router.get('/withdrawals', controller.getAllWithdrawals);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/process:
 *   post:
 *     summary: Approve/reject withdrawal request
 *     tags: [Admin - Wallets]
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejectionReason:
 *                 type: string
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal processed
 */
router.post(
    '/withdrawals/:id/process',
    [
        param('id').isUUID(),
        body('action').isIn(['approve', 'reject']),
        body('rejectionReason').optional().isString(),
        body('adminNote').optional().isString()
    ],
    controller.processWithdrawal
);

/**
 * @swagger
 * /api/admin/wallets/analytics:
 *   get:
 *     summary: Get wallet analytics
 *     tags: [Admin - Wallets]
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
 *         description: Analytics retrieved
 */
router.get('/wallets/analytics', controller.getWalletAnalytics);

export default router;
