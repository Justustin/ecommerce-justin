import {
  calculateBundlesNeeded,
  canFulfillDemand,
  calculateActualQuantityReceived,
  calculateWastage
} from './bundleCalculation';

describe('bundleCalculation', () => {
  describe('calculateBundlesNeeded', () => {
    it('should return 1 bundle for quantity equal to bundle size', () => {
      const result = calculateBundlesNeeded(100, 100, 10);
      expect(result).toBe(1);
    });

    it('should round up for quantity slightly over bundle size', () => {
      const result = calculateBundlesNeeded(101, 100, 10);
      expect(result).toBe(2);
    });

    it('should account for tolerance when near bundle boundary', () => {
      // 95 units + 10% tolerance (10 units) = 105, needs 2 bundles
      const result = calculateBundlesNeeded(95, 100, 10);
      expect(result).toBe(2);
    });

    it('should return 1 bundle when quantity just below tolerance threshold', () => {
      // 90 units + 10% tolerance (10 units) = 100, needs 1 bundle
      const result = calculateBundlesNeeded(90, 100, 10);
      expect(result).toBe(1);
    });

    it('should handle 0 tolerance', () => {
      const result = calculateBundlesNeeded(150, 100, 0);
      expect(result).toBe(2);
    });

    it('should handle large quantities', () => {
      const result = calculateBundlesNeeded(550, 100, 10);
      expect(result).toBe(6); // 550 + 10 = 560, needs 6 bundles
    });

    it('should handle small quantities with tolerance', () => {
      const result = calculateBundlesNeeded(45, 100, 10);
      expect(result).toBe(1); // 45 + 10 = 55, needs 1 bundle
    });

    it('should handle exact multiples', () => {
      const result = calculateBundlesNeeded(200, 100, 10);
      expect(result).toBe(3); // 200 + 10 = 210, needs 3 bundles
    });
  });

  describe('canFulfillDemand', () => {
    it('should return true when exactly enough bundles available', () => {
      const result = canFulfillDemand(100, 100, 1, 10);
      expect(result).toBe(true);
    });

    it('should return true when more than enough bundles available', () => {
      const result = canFulfillDemand(100, 100, 5, 10);
      expect(result).toBe(true);
    });

    it('should return false when not enough bundles', () => {
      const result = canFulfillDemand(250, 100, 2, 10);
      expect(result).toBe(false);
    });

    it('should account for tolerance in fulfillment check', () => {
      // 95 + tolerance needs 2 bundles
      const result = canFulfillDemand(95, 100, 1, 10);
      expect(result).toBe(false);
    });

    it('should return false when 0 bundles available', () => {
      const result = canFulfillDemand(50, 100, 0, 10);
      expect(result).toBe(false);
    });

    it('should handle edge case at boundary', () => {
      // 90 units + 10 tolerance = 100, needs 1 bundle
      const result = canFulfillDemand(90, 100, 1, 10);
      expect(result).toBe(true);
    });
  });

  describe('calculateActualQuantityReceived', () => {
    it('should calculate correct quantity for 1 bundle', () => {
      const result = calculateActualQuantityReceived(1, 100);
      expect(result).toBe(100);
    });

    it('should calculate correct quantity for multiple bundles', () => {
      const result = calculateActualQuantityReceived(5, 100);
      expect(result).toBe(500);
    });

    it('should return 0 for 0 bundles', () => {
      const result = calculateActualQuantityReceived(0, 100);
      expect(result).toBe(0);
    });

    it('should handle different bundle sizes', () => {
      expect(calculateActualQuantityReceived(3, 50)).toBe(150);
      expect(calculateActualQuantityReceived(2, 200)).toBe(400);
    });

    it('should handle large numbers', () => {
      const result = calculateActualQuantityReceived(100, 1000);
      expect(result).toBe(100000);
    });
  });

  describe('calculateWastage', () => {
    it('should calculate wastage for imperfect allocation', () => {
      // Request 110, allocated 2 bundles (200 units), wastage = 90
      const result = calculateWastage(110, 2, 100);
      expect(result).toBe(90);
    });

    it('should return 0 for perfect match', () => {
      const result = calculateWastage(100, 1, 100);
      expect(result).toBe(0);
    });

    it('should calculate wastage for multiple bundles', () => {
      // Request 350, allocated 4 bundles (400), wastage = 50
      const result = calculateWastage(350, 4, 100);
      expect(result).toBe(50);
    });

    it('should handle small wastage', () => {
      const result = calculateWastage(99, 1, 100);
      expect(result).toBe(1);
    });

    it('should handle large wastage', () => {
      const result = calculateWastage(101, 2, 100);
      expect(result).toBe(99);
    });
  });
});
