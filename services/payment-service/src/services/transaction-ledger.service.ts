import { TransactionLedgerRepository } from '../repositories/transaction-ledger.repository';

export class TransactionLedgerService {
  private repository: TransactionLedgerRepository;

  constructor() {
    this.repository = new TransactionLedgerRepository();
  }

  /**
   * Record a payment received
   */
  async recordPaymentReceived(
    paymentId: string,
    orderId: string,
    factory_id: string,
    amount: number | string,
    orderNumber: string,
    options?: {
      gatewayFee?: number;
      isEscrow?: boolean;
    }
  ) {
    return this.repository.recordPaymentReceived(
      paymentId,
      orderId,
      factory_id,
      amount,
      orderNumber,
      {
        gateway_fee: options?.gatewayFee || 0,
        is_escrow: options?.isEscrow || false
      }
    );
  }

  /**
   * Record escrow release for a group buying session
   */
  async recordEscrowRelease(
    paymentId: string,
    orderId: string,
    amount: number | string,
    groupSessionId: string
  ) {
    return this.repository.recordEscrowRelease(
      paymentId,
      orderId,
      amount,
      groupSessionId
    );
  }

  /**
   * Record a refund
   */
  async recordRefund(
    refundId: string,
    paymentId: string,
    orderId: string,
    amount: number | string,
    reason: string,
    metadata?: {
      refundFee?: number;
      gatewayRefundId?: string;
      [key: string]: any;
    }
  ) {
    return this.repository.recordRefund(
      refundId,
      paymentId,
      orderId,
      amount,
      reason,
      metadata
    );
  }

  /**
   * Record a settlement payment to factory
   */
  async recordSettlement(
    settlementId: string,
    factoryId: string,
    amount: number | string,
    periodDescription: string,
    metadata?: Record<string, any>
  ) {
    return this.repository.recordSettlement(
      settlementId,
      factoryId,
      amount,
      periodDescription,
      metadata
    );
  }

  /**
   * Get transaction history for an order
   */
  async getOrderTransactionHistory(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Get transaction history for a payment
   */
  async getPaymentTransactionHistory(paymentId: string) {
    return this.repository.findByPaymentId(paymentId);
  }

  /**
   * Get factory transaction summary
   */
  async getFactoryTransactionSummary(
    factoryId: string,
    startDate: Date,
    endDate: Date
  ) {
    const [payments, settlements] = await Promise.all([
      this.repository.findByFactoryId(factoryId, {
        startDate,
        endDate,
        transactionType: 'payment_received'
      }),
      this.repository.findByFactoryId(factoryId, {
        startDate,
        endDate,
        transactionType: 'settlement_paid'
      })
    ]);

    const totalReceived = payments.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const totalSettled = settlements.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    return {
      totalReceived,
      totalSettled,
      pending: totalReceived - totalSettled,
      paymentCount: payments.length,
      settlementCount: settlements.length
    };
  }

  /**
   * Get transaction summary for a period
   */
  async getTransactionSummary(startDate: Date, endDate: Date) {
    return this.repository.getSummary({ startDate, endDate });
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 50, offset: number = 0) {
    return this.repository.getRecent(limit, offset);
  }

  /**
   * Find transaction by code
   */
  async findByCode(transactionCode: string) {
    return this.repository.findByCode(transactionCode);
  }
}