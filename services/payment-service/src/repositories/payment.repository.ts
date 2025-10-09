import { prisma } from '@repo/database';
import { CreatePaymentDTO, CreateEscrowPaymentDTO } from '../types';
import { CryptoUtils } from '../utils/crypto.utils';

export class PaymentRepository {
  async create(data: CreatePaymentDTO, invoiceUrl: string, invoiceId: string) {
    const paymentCode = CryptoUtils.generatePaymentCode();

    return prisma.payments.create({
      data: {
        order_id: data.orderId,
        user_id: data.userId,
        payment_method: data.paymentMethod || 'bank_transfer',
        payment_status: 'pending',
        order_amount: data.amount,
        payment_gateway_fee: 0,
        total_amount: data.amount,
        currency: 'IDR',
        payment_gateway: 'xendit',
        gateway_transaction_id: invoiceId,
        payment_code: paymentCode,
        payment_url: invoiceUrl,
        is_in_escrow: data.isEscrow || false,
        expires_at: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
  }

async createEscrow(data: CreateEscrowPaymentDTO, invoiceUrl: string, invoiceId: string) {
  const paymentCode = CryptoUtils.generatePaymentCode();

  return prisma.payments.create({
    data: {
      user_id: data.userId,
      group_session_id: data.groupSessionId,
      participant_id: data.participantId,
      payment_method: 'bank_transfer',
      payment_status: 'pending',
      order_amount: data.amount,
      payment_gateway_fee: 0, // Changed from gateway_fee
      total_amount: data.amount,
      currency: 'IDR',
      payment_gateway: 'xendit',
      gateway_transaction_id: invoiceId,
      payment_code: paymentCode,
      payment_url: invoiceUrl,
      is_in_escrow: true,
      metadata: {
        factoryId: data.factoryId,
        type: 'group_buying_escrow'
      },
      expires_at: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
}
  async findById(id: string) {
    return prisma.payments.findUnique({
      where: { id },
      include: {
        orders: true,
        users: true
      }
    });
  }

  async findByGatewayTransactionId(transactionId: string) {
    return prisma.payments.findUnique({
      where: { gateway_transaction_id: transactionId },
      include: {
        orders: true
      }
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.payments.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async markPaid(
    id: string,
    gatewayFee: number,
    gatewayResponse: any,
    isEscrow: boolean
  ) {
    return prisma.payments.update({
      where: { id },
      data: {
        payment_status: 'paid',
        payment_gateway_fee: gatewayFee,
        is_in_escrow: isEscrow,
        paid_at: new Date(),
        gateway_response: gatewayResponse,
        updated_at: new Date()
      }
    });
  }

  async markExpired(id: string) {
    return prisma.payments.update({
      where: { id },
      data: {
        payment_status: 'expired',
        updated_at: new Date()
      }
    });
  }

  async markRefunded(id: string, reason: string) {
    return prisma.payments.update({
      where: { id },
      data: {
        payment_status: 'refunded',
        refund_reason: reason,
        refunded_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async releaseEscrow(paymentIds: string[]) {
    return prisma.payments.updateMany({
      where: { id: { in: paymentIds } },
      data: {
        is_in_escrow: false,
        escrow_released_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async findByGroupSession(groupSessionId: string) {
    return prisma.payments.findMany({
      where: {
        group_session_id: groupSessionId
      },
      include: {
        orders: true,
        users: true
      }
    });
  }

  async expirePendingPayments() {
    return prisma.payments.updateMany({
      where: {
        payment_status: 'pending',
        expires_at: { lt: new Date() }
      },
      data: {
        payment_status: 'expired',
        updated_at: new Date()
      }
    });
  }

  async findEligibleForSettlement(periodStart: Date, periodEnd: Date) {
    return prisma.payments.findMany({
      where: {
        payment_status: 'paid',
        is_in_escrow: false,
        paid_at: {
          gte: periodStart,
          lt: periodEnd
        }
      },
      include: {
        orders: {
          include: {
            order_items: {
              select: {
                factory_id: true
              }
            }
          }
        }
      }
    });
  }
}