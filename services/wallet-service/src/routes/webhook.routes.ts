import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

/**
 * @swagger
 * /api/webhooks/disbursement:
 *   post:
 *     summary: Xendit disbursement webhook callback
 *     description: Receives status updates from Xendit when disbursement completes or fails. Automatically refunds to wallet if failed.
 *     tags: [Webhooks - Xendit]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 example: disb_abc123xyz
 *                 description: Xendit disbursement ID
 *               external_id:
 *                 type: string
 *                 format: uuid
 *                 description: Our withdrawal ID
 *               status:
 *                 type: string
 *                 enum: [COMPLETED, FAILED]
 *                 example: COMPLETED
 *               failure_code:
 *                 type: string
 *                 example: INVALID_DESTINATION
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       403:
 *         description: Invalid webhook signature
 *       404:
 *         description: Withdrawal not found
 */
router.post('/disbursement', controller.handleDisbursementCallback);

export default router;
