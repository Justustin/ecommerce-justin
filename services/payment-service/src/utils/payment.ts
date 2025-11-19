// Payment webhook signature verification utilities
import crypto from 'crypto';

export function verifyXenditSignature(
  webhookToken: string,
  payload: any,
  receivedSignature: string
): boolean {
  const data = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', webhookToken)
    .update(data)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

export function validatePaymentAmount(
  requestedAmount: number,
  paidAmount: number,
  tolerance: number = 0
): { valid: boolean; error?: string } {
  if (requestedAmount <= 0) {
    return { valid: false, error: 'Requested amount must be positive' };
  }

  if (paidAmount <= 0) {
    return { valid: false, error: 'Paid amount must be positive' };
  }

  const difference = Math.abs(requestedAmount - paidAmount);
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Amount mismatch: expected ${requestedAmount}, received ${paidAmount}`,
    };
  }

  return { valid: true };
}

export function calculatePlatformFee(
  amount: number,
  feePercentage: number = 2.5
): number {
  if (amount < 0) return 0;
  if (feePercentage < 0) return 0;

  return Math.round(amount * (feePercentage / 100));
}

export function isPaymentExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function getPaymentExpiryMinutes(expiresAt: Date): number {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60));
}
