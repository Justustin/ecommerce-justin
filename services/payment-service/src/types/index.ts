export interface CreatePaymentDTO {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'ewallet_ovo' | 'ewallet_gopay' | 'ewallet_dana';
  expiresAt?: Date;
  metadata?: {
    type: 'direct' | 'group_buying';
    groupSessionId?: string;
  };
}

export interface XenditInvoiceCallback {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING';
  amount: number;
  paid_amount: number;
  fees_paid_amount: number;
  payment_method: string;
  payment_channel: string;
  payment_destination: string;
  created: string;
  updated: string;
  paid_at?: string;
}

export interface CreateRefundDTO {
  paymentId: string;
  orderId: string;
  userId: string;
  reason: 'group_failed_moq' | 'order_cancelled' | 'customer_request';
  amount?: number;
  description?: string;
}
