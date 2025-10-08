import { prisma } from '@repo/database';
import { Prisma } from '@repo/database';
import { CryptoUtils } from '../utils/crypto.utils';

export interface CreateTransactionLedgerDTO {
  transactionType: Prisma.transaction_ledgerUncheckedCreateInput['transaction_type'];
  paymentId?: string;
  orderId?: string;
  refundId?: string;
  settlementId?: string;
  factoryId?: string;
  amount: number | string;
  description: string;
  metadata?: Record<string, any>;
}

export class TransactionLedgerRepository {
  /**
   * Generate a unique transaction code
   */
  private generateTransactionCode(prefix: string = 'TXN'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a transaction ledger entry
   */
  async create(data: CreateTransactionLedgerDTO) {
    const transactionCode = this.generateTransactionCode(
      this.getCodePrefix(data.transactionType)
    );

    return prisma.transaction_ledger.create({
      data: {
        transaction_code: transactionCode,
        transaction_type: data.transactionType,
        payment_id: data.paymentId,
        order_id: data.orderId,
        refund_id: data.refundId,
        settlement_id: data.settlementId,
        factory_id: data.factoryId,
        amount: data.amount,
        currency: 'IDR',
        description: data.description,
        metadata: data.metadata || {},
        transaction_time: new Date()
      }
    });
  }

  /**
   * Record a payment received transaction
   */
  async recordPaymentReceived(
    paymentId: string,
    orderId: string,
    factoryId: string,
    amount: number | string,
    orderNumber: string,
    metadata?: {
      gateway_fee?: number;
      is_escrow?: boolean;
      [key: string]: any;
    }
  ) {
    return this.create({
      transactionType: 'payment_received',
      paymentId,
      orderId,
      factoryId,
      amount,
      description: `Payment received for order ${orderNumber}`,
      metadata
    });
  }

  /**
   * Record an escrow release transaction
   */
  async recordEscrowRelease(
    paymentId: string,
    orderId: string,
    amount: number | string,
    groupSessionId: string
  ) {
    return this.create({
      transactionType: 'escrow_released',
      paymentId,
      orderId,
      amount,
      description: `Escrow released for group session ${groupSessionId}`,
      metadata: {
        group_session_id: groupSessionId,
        escrow_released: true
      }
    });
  }

  /**
   * Record a refund transaction
   */
  async recordRefund(
    refundId: string,
    paymentId: string,
    orderId: string,
    amount: number | string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return this.create({
      transactionType: 'refund_issued',
      refundId,
      paymentId,
      orderId,
      amount,
      description: `Refund issued: ${reason}`,
      metadata
    });
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
    return this.create({
      transactionType: 'settlement_paid',
      settlementId,
      factoryId,
      amount,
      description: `Settlement paid to factory for ${periodDescription}`,
      metadata
    });
  }

  /**
   * Find all transactions for a payment
   */
  async findByPaymentId(paymentId: string) {
    return prisma.transaction_ledger.findMany({
      where: { payment_id: paymentId },
      orderBy: { transaction_time: 'desc' }
    });
  }

  /**
   * Find all transactions for an order
   */
  async findByOrderId(orderId: string) {
    return prisma.transaction_ledger.findMany({
      where: { order_id: orderId },
      orderBy: { transaction_time: 'desc' },
      include: {
        payments: true,
        refunds: true
      }
    });
  }

  /**
   * Find all transactions for a refund
   */
  async findByRefundId(refundId: string) {
    return prisma.transaction_ledger.findMany({
      where: { refund_id: refundId },
      orderBy: { transaction_time: 'desc' }
    });
  }

  /**
   * Find all transactions for a factory
   */
  async findByFactoryId(factoryId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    transactionType?: string;
  }) {
    return prisma.transaction_ledger.findMany({
      where: {
        factory_id: factoryId,
        ...(options?.transactionType && { transaction_type: options.transactionType as any }),
        ...(options?.startDate || options?.endDate) && {
          transaction_time: {
            ...(options.startDate && { gte: options.startDate }),
            ...(options.endDate && { lte: options.endDate })
          }
        }
      },
      orderBy: { transaction_time: 'desc' }
    });
  }

  /**
   * Get transaction summary for a period
   */
  async getSummary(options: {
    startDate: Date;
    endDate: Date;
    factoryId?: string;
    transactionType?: string;
  }) {
    const where: Prisma.transaction_ledgerWhereInput = {
      transaction_time: {
        gte: options.startDate,
        lte: options.endDate
      },
      ...(options.factoryId && { factory_id: options.factoryId }),
      ...(options.transactionType && { transaction_type: options.transactionType as any })
    };

    const [transactions, summary] = await Promise.all([
      prisma.transaction_ledger.findMany({
        where,
        orderBy: { transaction_time: 'desc' }
      }),
      prisma.transaction_ledger.aggregate({
        where,
        _sum: { amount: true },
        _count: true
      })
    ]);

    return {
      transactions,
      totalAmount: summary._sum.amount || 0,
      count: summary._count
    };
  }

  /**
   * Get transaction code prefix based on type
   */
  private getCodePrefix(type: string): string {
    const prefixes: Record<string, string> = {
      payment_received: 'PAY',
      refund_issued: 'REF',
      settlement_paid: 'SET',
      escrow_released: 'ESC'
    };
    return prefixes[type] || 'TXN';
  }

  /**
   * Find transaction by code
   */
  async findByCode(transactionCode: string) {
    return prisma.transaction_ledger.findUnique({
      where: { transaction_code: transactionCode },
      include: {
        payments: true,
        refunds: true,
        orders: true,
        factories: true,
        factory_settlements: true
      }
    });
  }

  /**
   * Get recent transactions (for admin dashboard)
   */
  async getRecent(limit: number = 50, offset: number = 0) {
    return prisma.transaction_ledger.findMany({
      take: limit,
      skip: offset,
      orderBy: { transaction_time: 'desc' },
      include: {
        payments: {
          select: {
            payment_code: true,
            payment_status: true
          }
        },
        orders: {
          select: {
            order_number: true,
            status: true
          }
        }
      }
    });
  }
}