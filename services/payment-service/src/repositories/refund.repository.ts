import { prisma } from '@repo/database';
import { CreateRefundDTO } from '../types';
import { CryptoUtils } from '../utils/crypto.utils';

export class RefundRepository {
  async create(data: CreateRefundDTO, payment: any) {
    const refundCode = CryptoUtils.generateRefundCode();
    const isAutoApprove = data.reason === 'group_failed_moq';

    return prisma.refunds.create({
      data: {
        refund_code: refundCode,
        payment_id: data.paymentId,
        order_id: data.orderId,
        user_id: data.userId,
        refund_reason: data.reason,
        refund_status: isAutoApprove ? 'processing' : 'pending',
        refund_amount: data.amount || payment.order_amount,
        refund_fee: 0,
        payment_gateway: 'xendit',
        reason_description: data.description,
        approved_at: isAutoApprove ? new Date() : null
      }
    });
  }

  async findById(id: string) {
    return prisma.refunds.findUnique({
      where: { id },
      include: {
        payments: true,
        orders: true
      }
    });
  }

  async markProcessing(id: string, gatewayRefundId?: string) {
    return prisma.refunds.update({
      where: { id },
      data: {
        refund_status: 'processing',
        gateway_refund_id: gatewayRefundId,
        processed_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async markCompleted(id: string, gatewayResponse: any) {
    return prisma.refunds.update({
      where: { id },
      data: {
        refund_status: 'completed',
        gateway_response: gatewayResponse,
        completed_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async markFailed(id: string, reason: string) {
    return prisma.refunds.update({
      where: { id },
      data: {
        refund_status: 'failed',
        reason_description: reason,
        updated_at: new Date()
      }
    });
  }
}