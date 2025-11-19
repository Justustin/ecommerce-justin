import {
  calculateOrderTotal,
  validateOrderItems,
  canCancelOrder,
  calculateRefundAmount,
  getEstimatedDeliveryDays,
} from './order';

describe('order utilities', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total for single item', () => {
      const items = [{ price: 50000, quantity: 2 }];
      expect(calculateOrderTotal(items)).toBe(100000);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        { price: 50000, quantity: 2 },
        { price: 30000, quantity: 3 },
      ];
      expect(calculateOrderTotal(items)).toBe(190000); // 100k + 90k
    });

    it('should include shipping cost', () => {
      const items = [{ price: 50000, quantity: 2 }];
      expect(calculateOrderTotal(items, 15000)).toBe(115000);
    });

    it('should return 0 for empty items', () => {
      expect(calculateOrderTotal([])).toBe(0);
    });

    it('should handle zero shipping cost', () => {
      const items = [{ price: 50000, quantity: 1 }];
      expect(calculateOrderTotal(items, 0)).toBe(50000);
    });

    it('should handle large quantities', () => {
      const items = [{ price: 10000, quantity: 100 }];
      expect(calculateOrderTotal(items)).toBe(1000000);
    });

    it('should handle decimal prices', () => {
      const items = [{ price: 50000.5, quantity: 2 }];
      expect(calculateOrderTotal(items)).toBe(100001);
    });
  });

  describe('validateOrderItems', () => {
    it('should pass for valid items', () => {
      const items = [
        { quantity: 2, stock: 10 },
        { quantity: 5, stock: 20 },
      ];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty items array', () => {
      const result = validateOrderItems([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Order must contain at least one item');
    });

    it('should fail for null items', () => {
      const result = validateOrderItems(null as any);
      expect(result.valid).toBe(false);
    });

    it('should fail for negative quantity', () => {
      const items = [{ quantity: -1, stock: 10 }];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('quantity must be positive');
    });

    it('should fail for zero quantity', () => {
      const items = [{ quantity: 0, stock: 10 }];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('quantity must be positive');
    });

    it('should fail when quantity exceeds stock', () => {
      const items = [{ quantity: 15, stock: 10 }];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only 10 in stock');
    });

    it('should pass when quantity equals stock', () => {
      const items = [{ quantity: 10, stock: 10 }];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(true);
    });

    it('should identify which item failed', () => {
      const items = [
        { quantity: 2, stock: 10 },
        { quantity: 15, stock: 10 },
      ];
      const result = validateOrderItems(items);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Item 2');
    });
  });

  describe('canCancelOrder', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow cancel for pending order within window', () => {
      const createdAt = new Date('2025-01-18T08:00:00Z'); // 2 hours ago
      const result = canCancelOrder('pending', createdAt, 24);
      expect(result.canCancel).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow cancel for confirmed order within window', () => {
      const createdAt = new Date('2025-01-18T09:00:00Z');
      const result = canCancelOrder('confirmed', createdAt, 24);
      expect(result.canCancel).toBe(true);
    });

    it('should allow cancel for payment_pending order', () => {
      const createdAt = new Date('2025-01-18T09:00:00Z');
      const result = canCancelOrder('payment_pending', createdAt, 24);
      expect(result.canCancel).toBe(true);
    });

    it('should not allow cancel for shipped order', () => {
      const createdAt = new Date('2025-01-18T09:00:00Z');
      const result = canCancelOrder('shipped', createdAt, 24);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain('Cannot cancel order with status: shipped');
    });

    it('should not allow cancel for delivered order', () => {
      const createdAt = new Date('2025-01-18T09:00:00Z');
      const result = canCancelOrder('delivered', createdAt, 24);
      expect(result.canCancel).toBe(false);
    });

    it('should not allow cancel outside window', () => {
      const createdAt = new Date('2025-01-17T09:00:00Z'); // 25 hours ago
      const result = canCancelOrder('pending', createdAt, 24);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain('Cancel window expired');
    });

    it('should allow cancel at exact window boundary', () => {
      const createdAt = new Date('2025-01-17T10:00:00Z'); // Exactly 24 hours ago
      const result = canCancelOrder('pending', createdAt, 24);
      expect(result.canCancel).toBe(true);
    });

    it('should handle custom cancel window', () => {
      const createdAt = new Date('2025-01-18T08:00:00Z'); // 2 hours ago
      expect(canCancelOrder('pending', createdAt, 1).canCancel).toBe(false);
      expect(canCancelOrder('pending', createdAt, 3).canCancel).toBe(true);
    });
  });

  describe('calculateRefundAmount', () => {
    it('should return full amount with 0% fee', () => {
      expect(calculateRefundAmount(100000, 0)).toBe(100000);
    });

    it('should deduct 10% cancellation fee', () => {
      expect(calculateRefundAmount(100000, 10)).toBe(90000);
    });

    it('should deduct 20% cancellation fee', () => {
      expect(calculateRefundAmount(100000, 20)).toBe(80000);
    });

    it('should round to nearest integer', () => {
      expect(calculateRefundAmount(100001, 10)).toBe(90001);
    });

    it('should return 0 for 100% fee', () => {
      expect(calculateRefundAmount(100000, 100)).toBe(0);
    });

    it('should return 0 for negative order total', () => {
      expect(calculateRefundAmount(-100000, 10)).toBe(0);
    });

    it('should return full amount for negative fee percentage', () => {
      expect(calculateRefundAmount(100000, -10)).toBe(100000);
    });

    it('should return 0 for fee over 100%', () => {
      expect(calculateRefundAmount(100000, 150)).toBe(0);
    });

    it('should handle large amounts', () => {
      expect(calculateRefundAmount(10000000, 5)).toBe(9500000);
    });

    it('should use default 0% fee', () => {
      expect(calculateRefundAmount(100000)).toBe(100000);
    });
  });

  describe('getEstimatedDeliveryDays', () => {
    it('should return 1 day for express', () => {
      expect(getEstimatedDeliveryDays('express')).toBe(1);
    });

    it('should return 3 days for regular', () => {
      expect(getEstimatedDeliveryDays('regular')).toBe(3);
    });

    it('should return 7 days for economy', () => {
      expect(getEstimatedDeliveryDays('economy')).toBe(7);
    });

    it('should return 0 days for same-day', () => {
      expect(getEstimatedDeliveryDays('same-day')).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(getEstimatedDeliveryDays('EXPRESS')).toBe(1);
      expect(getEstimatedDeliveryDays('Regular')).toBe(3);
      expect(getEstimatedDeliveryDays('ECONOMY')).toBe(7);
    });

    it('should return 3 days for unknown method', () => {
      expect(getEstimatedDeliveryDays('unknown')).toBe(3);
      expect(getEstimatedDeliveryDays('custom')).toBe(3);
    });
  });
});
