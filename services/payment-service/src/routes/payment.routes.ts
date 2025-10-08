import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const controller = new PaymentController();

router.post('/', [
  body('orderId').isUUID(),
  body('userId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['bank_transfer', 'ewallet_ovo', 'ewallet_gopay', 'ewallet_dana'])
], controller.createPayment);

router.get('/order/:orderId', controller.getPaymentByOrder);

router.post('/release-escrow', [
  body('groupSessionId').isUUID()
], controller.releaseEscrow);

router.post('/refund-session', [
  body('groupSessionId').isUUID()
], controller.refundSession);

router.post('/eligible-for-settlement', [
  body('periodStart').isISO8601(),
  body('periodEnd').isISO8601()
], controller.getEligibleForSettlement);

export default router;
