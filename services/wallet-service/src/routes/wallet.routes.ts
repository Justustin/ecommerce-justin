import { Router } from 'express';
import { body, param } from 'express-validator';
import { WalletController } from '../controllers/wallet.controller';

const router = Router();
const controller = new WalletController();

// GET /api/balance/:userId - Get wallet balance for a user
router.get('/balance/:userId', [param('userId').isUUID()], controller.getBalance);

// POST /api/transactions/credit - Add funds to a wallet (for cashback, etc.)
router.post('/transactions/credit', [
    body('userId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('type').isIn(['cashback', 'deposit', 'refund']),
    body('description').isString().notEmpty(),
    body('referenceId').optional().isUUID(),
    body('referenceType').optional().isString(),
], controller.creditTransaction);

// POST /api/withdrawals/request - Request a withdrawal
router.post('/withdrawals/request', [
    body('userId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('bankCode').isString().notEmpty(),
    body('bankName').isString().notEmpty(),
    body('accountNumber').isString().notEmpty(),
    body('accountName').isString().notEmpty(),
], controller.requestWithdrawal);

export default router;