import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

// POST /api/webhooks/disbursement - Xendit disbursement webhook
router.post('/disbursement', controller.handleDisbursementCallback);

export default router;
