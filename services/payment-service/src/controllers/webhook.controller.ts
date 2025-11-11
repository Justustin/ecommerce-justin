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
      // CRITICAL FIX: Use HMAC-SHA256 verification for Xendit webhooks
      const webhookToken = req.headers['x-callback-token'] as string;
      const webhookSecret = process.env.XENDIT_WEBHOOK_SECRET || '';
      const payload = JSON.stringify(req.body);

      if (!CryptoUtils.verifyXenditCallback(payload, webhookToken, webhookSecret)) {
        console.warn('Invalid webhook signature received');
        console.warn('Webhook verification failed - possible tampering or invalid secret');
        return res.status(403).json({ error: 'Invalid webhook signature' });
      }

      const callbackData = req.body;
      const eventId = callbackData.id || callbackData.external_id;

      // CRITICAL FIX #1: Use ON CONFLICT to prevent race condition
      // Two concurrent webhooks could both pass the SELECT check and try to insert
      // Using ON CONFLICT ensures only one insert succeeds, the other is ignored
      const insertResult = await prisma.$executeRaw`
        INSERT INTO webhook_events (event_id, event_type, payload, processed)
        VALUES (${eventId}, ${callbackData.status || 'unknown'}, ${JSON.stringify(callbackData)}::jsonb, false)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING *
      `;

      // If insertResult is 0, the event already exists (concurrent webhook)
      if (insertResult === 0) {
        console.log(`Webhook event ${eventId} already processed by concurrent request - ignoring`);
        return res.json({ received: true, message: 'Already processed' });
      }

      if (callbackData.status === 'PAID') {
        // CRITICAL FIX #2: Pass transaction object to handlePaidCallback for atomicity
        await prisma.$transaction(async (tx) => {
          await this.paymentService.handlePaidCallback(callbackData, tx);

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
