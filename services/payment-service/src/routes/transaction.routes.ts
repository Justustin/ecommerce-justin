
import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';

const router = Router();
const transactionController = new TransactionController();

/**
 * @swagger
 * /api/transactions/order/{orderId}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction history for an order
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction history retrieved
 */
router.get('/order/:orderId', transactionController.getOrderTransactionHistory);

/**
 * @swagger
 * /api/transactions/payment/{paymentId}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction history for a payment
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction history retrieved
 */
router.get('/payment/:paymentId', transactionController.getPaymentTransactionHistory);

/**
 * @swagger
 * /api/transactions/factory/{factoryId}/summary:
 *   get:
 *     tags: [Transactions]
 *     summary: Get factory transaction summary
 *     parameters:
 *       - in: path
 *         name: factoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction history retrieved
 */
router.get('/factory/:factoryId/summary', transactionController.getFactoryTransactionSummary);

/**
 * @swagger
 * /api/transactions/summary:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction summary for a period
 */
router.get('/summary', transactionController.getTransactionSummary);

/**
 * @swagger
 * /api/transactions/recent:
 *   get:
 *     tags: [Transactions]
 *     summary: Get recent transactions
 */
router.get('/recent', transactionController.getRecentTransactions);

/**
 * @swagger
 * /api/transactions/{transactionCode}:
 *   get:
 *     tags: [Transactions]
 *     summary: Find transaction by code
 */
router.get('/:transactionCode', transactionController.findByCode);

export default router;