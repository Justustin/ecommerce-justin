import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { PaymentService } from '../services/payment.service';
import { CryptoUtils } from '../utils/crypto.utils';

export class WebhookController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  handleXenditCallback = async (req: Request, res: Response) => {
    try {
      // Get webhook verification token from environment
      const webhookVerificationToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || '';
      const receivedSignature = req.headers['x-callback-token'] as string;

      // Get raw body for signature verification
      // Note: Express must be configured with express.raw() or express.text() middleware
      // to preserve the raw body for signature verification
      const rawBody = JSON.stringify(req.body);

      // Verify webhook signature using HMAC-SHA256
      if (!CryptoUtils.verifyXenditWebhook(rawBody, receivedSignature, webhookVerificationToken)) {
        console.warn('Invalid webhook signature received');
        console.warn('Signature verification failed for webhook');
        return res.status(403).json({ error: 'Invalid webhook signature' });
      }

      const callbackData = req.body;
      const eventId = callbackData.id || callbackData.external_id;

      const existingEvent = await prisma.$queryRaw`
        SELECT * FROM webhook_events WHERE event_id = ${eventId}
      `;

      if (Array.isArray(existingEvent) && existingEvent.length > 0) {
        console.log(`Webhook event ${eventId} already processed - ignoring`);
        return res.json({ received: true, message: 'Already processed' });
      }

      await prisma.$executeRaw`
        INSERT INTO webhook_events (event_id, event_type, payload, processed)
        VALUES (${eventId}, ${callbackData.status || 'unknown'}, ${JSON.stringify(callbackData)}::jsonb, false)
      `;

      if (callbackData.status === 'PAID') {
        // CRITICAL FIX: Make webhook processing atomic with transaction
        await prisma.$transaction(async (tx) => {
          await this.paymentService.handlePaidCallback(callbackData);

          await tx.$executeRaw`
            UPDATE webhook_events
            SET processed = true, processed_at = NOW()
            WHERE event_id = ${eventId}
          `;
        });
      } else if (callbackData.status === 'EXPIRED') {
        // CRITICAL FIX: Make expired payment handling atomic with transaction
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payments.findUnique({
            where: { gateway_transaction_id: callbackData.id }
          });

          if (payment && payment.payment_status === 'pending') {
            await tx.payments.update({
              where: { id: payment.id },
              data: {
                payment_status: 'expired',
                updated_at: new Date()
              }
            });

            if (payment.order_id) {
              await tx.orders.update({
                where: { id: payment.order_id },
                data: {
                  status: 'cancelled',
                  cancelled_at: new Date(),
                  updated_at: new Date()
                }
              });
            }
          }

          await tx.$executeRaw`
            UPDATE webhook_events
            SET processed = true, processed_at = NOW()
            WHERE event_id = ${eventId}
          `;
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
