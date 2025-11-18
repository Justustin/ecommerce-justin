import { prisma } from '@repo/database';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { TransactionLedgerService } from './transaction-ledger.service';
import { CreateRefundDTO } from '../types';
import { notificationClient } from '../clients/notification.client';

export class RefundService {
  private refundRepo: RefundRepository;
  private paymentRepo: PaymentRepository;
  private transactionLedgerService: TransactionLedgerService;

  constructor() {
    this.refundRepo = new RefundRepository();
    this.paymentRepo = new PaymentRepository();
    this.transactionLedgerService = new TransactionLedgerService();
  }

  async createRefund(data: CreateRefundDTO) {
    const payment = await this.paymentRepo.findById(data.paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.payment_status !== 'paid') {
      throw new Error('Cannot refund unpaid payment');
    }

    const existingRefund = await prisma.refunds.findFirst({
      where: {
        payment_id: data.paymentId,
        refund_status: { in: ['pending', 'processing', 'completed'] }
      }
    });

    if (existingRefund) {
      throw new Error('Payment already has a pending or completed refund');
    }

    const refund = await this.refundRepo.create(data, payment);

    // Auto-process refunds for failed group buying
    if (data.reason === 'group_failed_moq') {
      setTimeout(() => {
        this.processRefund(refund.id).catch(err => 
          console.error(`Failed to auto-process refund ${refund.id}:`, err)
        );
      }, 100);
    }

    return refund;
  }

  async processRefund(refundId: string) {
    const refund = await this.refundRepo.findById(refundId);

    if (!refund) {
      throw new Error('Refund not found');
    }

    if (!['processing', 'pending'].includes(refund.refund_status)) {
      throw new Error(`Refund cannot be processed from status: ${refund.refund_status}`);
    }

    try {
      // Mark as processing if pending
      if (refund.refund_status === 'pending') {
        await this.refundRepo.markProcessing(refundId);
      }

      const payment = refund.payments;
      let gatewayResponse: any;

      // Process refund based on payment method
      if (payment.payment_method.startsWith('ewallet_')) {
        gatewayResponse = await this.processEwalletRefund(payment, refund);
      } else {
        gatewayResponse = await this.processBankRefund(payment, refund);
      }

      // Mark refund as completed
      await this.refundRepo.markCompleted(refundId, gatewayResponse);

      // Update payment and order
      await this.updatePaymentAfterRefund(refund.payment_id, Number(refund.refund_amount));
      await this.updateOrderAfterRefund(refund.order_id);

      // Record transaction in ledger using the service
      await this.transactionLedgerService.recordRefund(
        refund.id,
        refund.payment_id,
        refund.order_id,
        Number(refund.refund_amount),
        refund.refund_reason,
        {
          refund_code: refund.refund_code,
          reason: refund.refund_reason,
          description: refund.reason_description,
          gateway_response: gatewayResponse
        }
      );

      // Send success notification
      await this.sendRefundNotification(refund.user_id, refund.order_id, 'completed');

      return { success: true, refund };
    } catch (error: any) {
      console.error(`Refund processing failed for ${refundId}:`, error);
      await this.refundRepo.markFailed(refundId, error.message);
      await this.sendRefundNotification(refund.user_id, refund.order_id, 'failed');
      throw error;
    }
  }

  async refundSession(groupSessionId: string) {
    const payments = await this.paymentRepo.findByGroupSession(groupSessionId);
    const results: Array<
      | { paymentId: string; status: 'success'; refundId: string }
      | { paymentId: string; status: 'failed'; error: string }
    > = [];

    for (const payment of payments) {
      if (payment.payment_status === 'paid') {
        try {
          const refund = await this.createRefund({
            paymentId: payment.id,
            orderId: payment.order_id,
            userId: payment.user_id,
            reason: 'group_failed_moq',
            description: `Group session ${groupSessionId} failed to reach MOQ`,
            amount: Number(payment.order_amount)
          });
          results.push({ 
            paymentId: payment.id, 
            status: 'success', 
            refundId: refund.id 
          });
        } catch (error: any) {
          console.error(`Failed to refund payment ${payment.id}:`, error);
          results.push({ 
            paymentId: payment.id, 
            status: 'failed', 
            error: error.message 
          });
        }
      }
    }

    return results;
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId: string) {
    return this.refundRepo.findById(refundId);
  }

  /**
   * Get refunds for an order
   */
  async getRefundsByOrderId(orderId: string) {
    return prisma.refunds.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  private async processEwalletRefund(payment: any, refund: any) {
    console.log('Processing e-wallet refund via Xendit API:', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refund.refund_amount,
      chargeId: payment.gateway_transaction_id
    });

    // Get Xendit API key from environment
    const xenditApiKey = process.env.XENDIT_SECRET_KEY;
    if (!xenditApiKey) {
      throw new Error('XENDIT_SECRET_KEY not configured');
    }

    // Validate that we have the charge ID
    if (!payment.gateway_transaction_id) {
      throw new Error('Cannot refund: missing gateway_transaction_id from payment');
    }

    try {
      // Call Xendit E-wallet Refund API
      // https://developers.xendit.co/api-reference/#refund-e-wallet-payment
      const axios = require('axios');
      const response = await axios.post(
        `https://api.xendit.co/ewallets/charges/${payment.gateway_transaction_id}/refunds`,
        {
          amount: Math.round(Number(refund.refund_amount)), // Xendit requires integer
          reason: refund.reason_description || 'Customer refund request',
          reference_id: refund.refund_code,
          metadata: {
            refund_id: refund.id,
            payment_id: payment.id,
            user_id: refund.user_id
          }
        },
        {
          auth: {
            username: xenditApiKey,
            password: ''
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('Xendit refund response:', {
        refundId: refund.id,
        xenditRefundId: response.data.id,
        status: response.data.status
      });

      return {
        status: response.data.status, // SUCCESS, PENDING, or FAILED
        refund_id: response.data.id,
        amount: response.data.amount,
        method: 'ewallet',
        processed_at: response.data.created || new Date().toISOString(),
        gateway_response: response.data
      };
    } catch (error: any) {
      console.error('Xendit refund API error:', {
        refundId: refund.id,
        error: error.response?.data || error.message
      });

      // Check if it's a known error we can handle
      if (error.response?.status === 400) {
        throw new Error(`Xendit refund failed: ${error.response.data.message || 'Invalid request'}`);
      } else if (error.response?.status === 404) {
        throw new Error('Xendit charge not found - payment may not exist or already refunded');
      } else if (error.response?.status === 409) {
        throw new Error('Refund already processed for this payment');
      }

      throw new Error(`Xendit refund API error: ${error.message}`);
    }
  }

  private async processBankRefund(payment: any, refund: any) {
    const user = await prisma.users.findUnique({
      where: { id: refund.user_id },
      select: {
        first_name: true,
        last_name: true,
        phone_number: true
      }
    });

    // TODO: Implement actual bank refund processing
    // Bank refunds typically require manual processing
    console.log('Processing bank refund:', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refund.refund_amount,
      recipient: `${user?.first_name} ${user?.last_name || ''}`
    });

    return {
      status: 'PENDING_MANUAL_REVIEW',
      refund_id: `bank-refund-${Date.now()}`,
      amount: refund.refund_amount,
      method: 'bank_transfer',
      recipient: `${user?.first_name} ${user?.last_name || ''}`,
      processed_at: new Date().toISOString(),
      note: 'Bank refunds require manual processing'
    };
  }

  private async updatePaymentAfterRefund(paymentId: string, refundAmount: number) {
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId }
    });

    if (!payment) return;

    await prisma.payments.update({
      where: { id: paymentId },
      data: {
        payment_status: 'refunded',
        refund_amount: Number(payment.refund_amount || 0) + refundAmount,
        refunded_at: new Date(),
        is_in_escrow: false,
        escrow_released_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  private async updateOrderAfterRefund(orderId: string | null) {
    // Only update order if orderId exists (not escrow-only payments)
    if (!orderId) return;

    await prisma.orders.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  private async sendRefundNotification(userId: string, orderId: string | null, status: 'completed' | 'failed') {
    try {
      let orderNumber = 'N/A';

      // Only fetch order if orderId exists
      if (orderId) {
        const order = await prisma.orders.findUnique({
          where: { id: orderId },
          select: { order_number: true }
        });
        orderNumber = order?.order_number || 'N/A';
      }

      await notificationClient.sendNotification({
        userId: userId,
        type: 'group_failed',
        title: status === 'completed' ? 'Refund Processed' : 'Refund Failed',
        message: status === 'completed'
          ? orderId
            ? `Your refund for order ${orderNumber} has been processed.`
            : `Your refund for group buying session has been processed.`
          : orderId
            ? `Refund processing failed for order ${orderNumber}. Please contact support.`
            : `Refund processing failed. Please contact support.`,
        actionUrl: orderId ? `/orders/${orderId}` : null,
        relatedId: orderId
      });
    } catch (error) {
      console.error('Failed to send refund notification:', error);
    }
  }
}