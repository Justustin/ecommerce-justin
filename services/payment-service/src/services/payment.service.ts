import { prisma } from '@repo/database';
import { PaymentRepository } from '../repositories/payment.repository';
import { TransactionLedgerService } from './transaction-ledger.service';
import { CreatePaymentDTO } from '../types';
import { xenditInvoiceClient } from '../config/xendit';
import { CreateInvoiceRequest } from 'xendit-node/invoice/models';

export class PaymentService {
  private repository: PaymentRepository;
  private transactionLedgerService: TransactionLedgerService;

  constructor() {
    this.repository = new PaymentRepository();
    this.transactionLedgerService = new TransactionLedgerService();
  }

  async createPayment(data: CreatePaymentDTO) {
    const user = await prisma.users.findUnique({
      where: { id: data.userId },
      select: { email: true, phone_number: true, first_name: true, last_name: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const userEmail = user.email || this.generatePlaceholderEmail(user.phone_number);

    // Xendit v7.x API structure
    const invoiceData: CreateInvoiceRequest = {
      externalId: `order-${data.orderId}-${Date.now()}`,
      amount: data.amount,
      payerEmail: userEmail,
      description: `Payment for order ${data.orderId}`,
      invoiceDuration: expiresAt 
        ? Math.floor((expiresAt.getTime() - Date.now()) / 1000).toString()
        : '86400',
      currency: 'IDR',
      shouldSendEmail: Boolean(user.email),
      customer: {
        givenNames: user.first_name,
        surname: user.last_name || '',
        email: userEmail,
        mobileNumber: user.phone_number
      },
      successRedirectUrl: process.env.PAYMENT_SUCCESS_URL,
      failureRedirectUrl: process.env.PAYMENT_FAILURE_URL
    };

    const invoice = await xenditInvoiceClient.createInvoice({
      data: invoiceData
    });

    const payment = await this.repository.create(
      data,
      invoice.invoiceUrl || '',
      invoice.id || ''
    );

    return {
      payment,
      paymentUrl: invoice.invoiceUrl,
      invoiceId: invoice.id
    };
  }

  async handlePaidCallback(callbackData: any) {
    const payment = await this.repository.findByGatewayTransactionId(
      callbackData.id
    );

    if (!payment) {
      throw new Error('Payment not found for transaction ID: ' + callbackData.id);
    }

    if (payment.payment_status === 'paid') {
      console.log(`Payment ${payment.id} already marked as paid - skipping`);
      return { message: 'Payment already processed' };
    }

    const gatewayFee = callbackData.fees_paid_amount || 0;
    const isGroupBuying = payment.orders.group_session_id !== null;

    const orderItems = await prisma.order_items.findFirst({
      where: { order_id: payment.order_id },
      select: { factory_id: true }
    });
    console.log('Order Items:', orderItems);

    const factoryId = orderItems ? [orderItems.factory_id] : [];

    const updatedPayment = await this.repository.markPaid(
      payment.id,
      gatewayFee,
      callbackData,
      isGroupBuying
    );

    // Update order status
    await prisma.orders.update({
      where: { id: payment.order_id },
      data: {
        status: 'paid',
        paid_at: new Date(),
        updated_at: new Date()
      }
    });

    // Record transaction in ledger
    await this.transactionLedgerService.recordPaymentReceived(
      payment.id,
      payment.order_id,
      factoryId[0] || '',
      Number(payment.order_amount),
      payment.orders.order_number,
      {
        gatewayFee,
        isEscrow: isGroupBuying
      }
    );

    // Send notification
    await this.sendPaymentNotification(payment.user_id, payment.order_id, 'success');

    return { 
      message: 'Payment processed successfully',
      payment: updatedPayment
    };
  }

  async releaseEscrow(groupSessionId: string) {
    const payments = await this.repository.findByGroupSession(groupSessionId);
    const eligiblePayments = payments.filter(
      p => p.is_in_escrow && p.payment_status === 'paid'
    );

    if (eligiblePayments.length === 0) {
      return { message: 'No escrowed payments found' };
    }

    const paymentIds = eligiblePayments.map(p => p.id);

    // Release escrow in database
    await this.repository.releaseEscrow(paymentIds);

    // Record transaction for each released payment
    for (const payment of eligiblePayments) {
      await this.transactionLedgerService.recordEscrowRelease(
        payment.id,
        payment.order_id,
        Number(payment.order_amount),
        groupSessionId
      );
    }

    return {
      message: 'Escrow released',
      paymentsReleased: paymentIds.length
    };
  }

  async getPaymentByOrderId(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  async findEligibleForSettlement(periodStart: Date, periodEnd: Date) {
    return this.repository.findEligibleForSettlement(periodStart, periodEnd);
  }

  /**
   * Get transaction history for an order (useful for customer support)
   */
  async getOrderTransactionHistory(orderId: string) {
    return this.transactionLedgerService.getOrderTransactionHistory(orderId);
  }

  /**
   * Get transaction history for a payment
   */
  async getPaymentTransactionHistory(paymentId: string) {
    return this.transactionLedgerService.getPaymentTransactionHistory(paymentId);
  }

  private async sendPaymentNotification(userId: string, orderId: string, status: 'success' | 'failed') {
    try {
      const order = await prisma.orders.findUnique({
        where: { id: orderId },
        select: { order_number: true }
      });

      await prisma.notifications.create({
        data: {
          user_id: userId,
          type: status === 'success' ? 'payment_success' : 'order_created',
          title: status === 'success' ? 'Payment Successful' : 'Payment Failed',
          message: status === 'success' 
            ? `Your payment for order ${order?.order_number} has been confirmed!`
            : `Payment failed for order ${order?.order_number}. Please try again.`,
          action_url: `/orders/${orderId}`,
          related_id: orderId
        }
      });
    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }

  private generatePlaceholderEmail(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const domain = process.env.PLACEHOLDER_EMAIL_DOMAIN || 'pinduoduo.id';
    return `noreply+${cleanPhone}@${domain}`;
  }
}