
import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

router.post('/xendit/invoice', controller.handleXenditCallback);

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-webhooks',
    timestamp: new Date().toISOString()
  });
});

export default router;