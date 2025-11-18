import { Router } from 'express';
import { body, param } from 'express-validator';
import { WalletController } from '../controllers/wallet.controller';

const router = Router();
const controller = new WalletController();

/**
 * @swagger
 * /api/balance/{userId}:
 *   get:
 *     summary: Get wallet balance for a user
 *     tags: [Wallet]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/balance/:userId', [param('userId').isUUID()], controller.getBalance);

/**
 * @swagger
 * /api/transactions/credit:
 *   post:
 *     summary: Credit funds to a wallet (cashback, refunds, etc.)
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount, type, description]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 25000.00
 *               type:
 *                 type: string
 *                 enum: [cashback, deposit, refund]
 *                 example: cashback
 *               description:
 *                 type: string
 *                 example: Tier refund from group buying session
 *               referenceId:
 *                 type: string
 *                 format: uuid
 *               referenceType:
 *                 type: string
 *                 example: group_session
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WalletTransaction'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/transactions/credit', [
    body('userId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('type').isIn(['cashback', 'deposit', 'refund']),
    body('description').isString().notEmpty(),
    body('referenceId').optional().isUUID(),
    body('referenceType').optional().isString(),
], controller.creditTransaction);

/**
 * @swagger
 * /api/withdrawals/request:
 *   post:
 *     summary: Request a withdrawal to bank account
 *     description: User requests withdrawal of wallet balance. Processed in batches 2x per week (Tuesday & Friday 10 AM). Takes 1-4 days maximum.
 *     tags: [Withdrawals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WithdrawalRequest'
 *     responses:
 *       201:
 *         description: Withdrawal request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Withdrawal'
 *       400:
 *         description: Invalid request or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               insufficient_balance:
 *                 value:
 *                   success: false
 *                   error: Insufficient wallet balance
 *               minimum_amount:
 *                 value:
 *                   success: false
 *                   error: Withdrawal amount must be greater than the fee of Rp 2500
 */
router.post('/withdrawals/request', [
    body('userId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('bankCode').isString().notEmpty(),
    body('bankName').isString().notEmpty(),
    body('accountNumber').isString().notEmpty(),
    body('accountName').isString().notEmpty(),
], controller.requestWithdrawal);

/**
 * @swagger
 * /api/withdrawals/process-batch:
 *   post:
 *     summary: Process all pending withdrawals (CRON only)
 *     description: Called by CRON job 2x per week (Tuesday & Friday 10 AM). Sends all pending withdrawals to Xendit for disbursement.
 *     tags: [Withdrawals - Admin]
 *     responses:
 *       200:
 *         description: Batch processing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BatchProcessResult'
 *       500:
 *         description: Batch processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/withdrawals/process-batch', controller.processBatchWithdrawals);

export default router;