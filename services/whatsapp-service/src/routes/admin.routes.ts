import { Router } from 'express';
import { body } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

router.get('/messages', controller.getAllMessages);
router.get('/analytics', controller.getAnalytics);
router.post('/retry-failed', controller.retryFailedMessages);
router.delete('/cleanup', controller.deleteOldMessages);
router.get('/templates', controller.getTemplates);
router.post(
    '/test-message',
    [
        body('phoneNumber').notEmpty().isString(),
        body('message').notEmpty().isString()
    ],
    controller.sendTestMessage
);

export default router;
