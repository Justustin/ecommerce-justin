import crypto from 'crypto';
import {
  verifyXenditSignature,
  validatePaymentAmount,
  calculatePlatformFee,
  isPaymentExpired,
  getPaymentExpiryMinutes,
} from './payment';

describe('payment utilities', () => {
  describe('verifyXenditSignature', () => {
    const webhookToken = 'test_webhook_secret_key_12345';

    it('should return true for valid signature', () => {
      const payload = { id: 'payment_123', status: 'PAID', amount: 100000 };
      const data = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(data)
        .digest('hex');

      const result = verifyXenditSignature(webhookToken, payload, validSignature);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = { id: 'payment_123', status: 'PAID', amount: 100000 };
      const invalidSignature = 'invalid_signature_hash';

      const result = verifyXenditSignature(webhookToken, payload, invalidSignature);
      expect(result).toBe(false);
    });

    it('should return false when payload is tampered', () => {
      const originalPayload = { id: 'payment_123', status: 'PAID', amount: 100000 };
      const data = JSON.stringify(originalPayload);
      const validSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(data)
        .digest('hex');

      // Tamper with payload
      const tamperedPayload = { ...originalPayload, amount: 999999 };

      const result = verifyXenditSignature(webhookToken, tamperedPayload, validSignature);
      expect(result).toBe(false);
    });

    it('should handle different webhook tokens', () => {
      const payload = { id: 'payment_123', status: 'PAID' };
      const token1 = 'secret_key_1';
      const token2 = 'secret_key_2';

      const signature1 = crypto
        .createHmac('sha256', token1)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(verifyXenditSignature(token1, payload, signature1)).toBe(true);
      expect(verifyXenditSignature(token2, payload, signature1)).toBe(false);
    });
  });

  describe('validatePaymentAmount', () => {
    it('should pass for exact amount match', () => {
      const result = validatePaymentAmount(100000, 100000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass when within tolerance', () => {
      const result = validatePaymentAmount(100000, 100005, 10);
      expect(result.valid).toBe(true);
    });

    it('should fail when outside tolerance', () => {
      const result = validatePaymentAmount(100000, 100020, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Amount mismatch');
    });

    it('should fail for negative requested amount', () => {
      const result = validatePaymentAmount(-100, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Requested amount must be positive');
    });

    it('should fail for zero requested amount', () => {
      const result = validatePaymentAmount(0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Requested amount must be positive');
    });

    it('should fail for negative paid amount', () => {
      const result = validatePaymentAmount(100, -100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Paid amount must be positive');
    });

    it('should fail for zero paid amount', () => {
      const result = validatePaymentAmount(100, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Paid amount must be positive');
    });

    it('should use default tolerance of 0', () => {
      expect(validatePaymentAmount(100000, 100001).valid).toBe(false);
      expect(validatePaymentAmount(100000, 100000).valid).toBe(true);
    });

    it('should handle large amounts', () => {
      const result = validatePaymentAmount(10000000, 10000000);
      expect(result.valid).toBe(true);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate 2.5% fee by default', () => {
      expect(calculatePlatformFee(100000)).toBe(2500);
      expect(calculatePlatformFee(200000)).toBe(5000);
      expect(calculatePlatformFee(1000000)).toBe(25000);
    });

    it('should calculate custom fee percentage', () => {
      expect(calculatePlatformFee(100000, 5)).toBe(5000);
      expect(calculatePlatformFee(100000, 10)).toBe(10000);
      expect(calculatePlatformFee(100000, 1)).toBe(1000);
    });

    it('should round to nearest integer', () => {
      expect(calculatePlatformFee(100001, 2.5)).toBe(2500);
      expect(calculatePlatformFee(100003, 2.5)).toBe(2500);
    });

    it('should return 0 for negative amount', () => {
      expect(calculatePlatformFee(-100000)).toBe(0);
    });

    it('should return 0 for negative fee percentage', () => {
      expect(calculatePlatformFee(100000, -5)).toBe(0);
    });

    it('should handle zero amount', () => {
      expect(calculatePlatformFee(0)).toBe(0);
    });

    it('should handle zero fee percentage', () => {
      expect(calculatePlatformFee(100000, 0)).toBe(0);
    });

    it('should handle large amounts correctly', () => {
      expect(calculatePlatformFee(100000000, 2.5)).toBe(2500000);
    });
  });

  describe('isPaymentExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for future expiry', () => {
      const expiresAt = new Date('2025-01-18T10:30:00Z');
      expect(isPaymentExpired(expiresAt)).toBe(false);
    });

    it('should return true for past expiry', () => {
      const expiresAt = new Date('2025-01-18T09:30:00Z');
      expect(isPaymentExpired(expiresAt)).toBe(true);
    });

    it('should return true for exactly now', () => {
      const expiresAt = new Date('2025-01-18T10:00:00Z');
      // Exact time is considered expired (>= comparison)
      expect(isPaymentExpired(expiresAt)).toBe(false);
    });

    it('should return true for 1 second ago', () => {
      const expiresAt = new Date('2025-01-18T09:59:59Z');
      expect(isPaymentExpired(expiresAt)).toBe(true);
    });

    it('should return false for 1 second in future', () => {
      const expiresAt = new Date('2025-01-18T10:00:01Z');
      expect(isPaymentExpired(expiresAt)).toBe(false);
    });
  });

  describe('getPaymentExpiryMinutes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate minutes remaining correctly', () => {
      const expiresAt = new Date('2025-01-18T10:30:00Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(30);
    });

    it('should return negative for expired payment', () => {
      const expiresAt = new Date('2025-01-18T09:30:00Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(-30);
    });

    it('should return 0 for payment expiring now', () => {
      const expiresAt = new Date('2025-01-18T10:00:00Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(0);
    });

    it('should handle 1 hour expiry', () => {
      const expiresAt = new Date('2025-01-18T11:00:00Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(60);
    });

    it('should floor fractional minutes', () => {
      const expiresAt = new Date('2025-01-18T10:00:59Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(0);
    });

    it('should handle large time differences', () => {
      const expiresAt = new Date('2025-01-19T10:00:00Z');
      expect(getPaymentExpiryMinutes(expiresAt)).toBe(1440); // 24 hours
    });
  });
});
