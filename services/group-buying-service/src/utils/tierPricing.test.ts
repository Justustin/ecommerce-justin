import { calculateTierPrice, calculateRefundAmount, getTierPercentage, determineCurrentTier } from './tierPricing';

describe('tierPricing', () => {
  describe('calculateTierPrice', () => {
    const basePrice = 50000;
    const tier1Price = 47500;
    const tier2Price = 45000;
    const tier3Price = 42500;
    const moq = 100;

    it('should return base price when under 50% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 49, moq);
      expect(result).toBe(50000);
    });

    it('should return tier 1 price when at exactly 50% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 50, moq);
      expect(result).toBe(47500);
    });

    it('should return tier 1 price when between 50-74% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 74, moq);
      expect(result).toBe(47500);
    });

    it('should return tier 2 price when at exactly 75% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 75, moq);
      expect(result).toBe(45000);
    });

    it('should return tier 2 price when between 75-99% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 99, moq);
      expect(result).toBe(45000);
    });

    it('should return tier 3 price when at exactly 100% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 100, moq);
      expect(result).toBe(42500);
    });

    it('should return tier 3 price when over 100% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 150, moq);
      expect(result).toBe(42500);
    });

    it('should handle edge case of 0 quantity', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 0, moq);
      expect(result).toBe(50000);
    });
  });

  describe('calculateRefundAmount', () => {
    it('should calculate correct refund for tier upgrade', () => {
      const oldPrice = 50000;
      const newPrice = 45000;
      const quantity = 100;

      const result = calculateRefundAmount(oldPrice, newPrice, quantity);

      expect(result).toBe(500000); // (50k - 45k) * 100
    });

    it('should return 0 when prices are equal', () => {
      const result = calculateRefundAmount(50000, 50000, 100);
      expect(result).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const result = calculateRefundAmount(50000, 45000, 50);
      expect(result).toBe(250000);
    });

    it('should return 0 for 0 quantity', () => {
      const result = calculateRefundAmount(50000, 45000, 0);
      expect(result).toBe(0);
    });

    it('should handle large numbers', () => {
      const result = calculateRefundAmount(100000, 90000, 1000);
      expect(result).toBe(10000000);
    });

    it('should handle multiple tier upgrades', () => {
      // From base (50k) to tier 3 (42.5k)
      const result = calculateRefundAmount(50000, 42500, 100);
      expect(result).toBe(750000);
    });
  });

  describe('getTierPercentage', () => {
    it('should calculate correct percentage', () => {
      expect(getTierPercentage(50, 100)).toBe(50);
      expect(getTierPercentage(75, 100)).toBe(75);
      expect(getTierPercentage(100, 100)).toBe(100);
    });

    it('should handle over 100%', () => {
      expect(getTierPercentage(150, 100)).toBe(150);
    });

    it('should handle decimal results', () => {
      expect(getTierPercentage(33, 100)).toBe(33);
      expect(getTierPercentage(66, 100)).toBe(66);
    });

    it('should return 0 for 0 quantity', () => {
      expect(getTierPercentage(0, 100)).toBe(0);
    });

    it('should handle different MOQ values', () => {
      expect(getTierPercentage(50, 200)).toBe(25);
      expect(getTierPercentage(150, 200)).toBe(75);
    });
  });

  describe('determineCurrentTier', () => {
    it('should return base tier for under 50%', () => {
      expect(determineCurrentTier(0)).toBe('base');
      expect(determineCurrentTier(25)).toBe('base');
      expect(determineCurrentTier(49)).toBe('base');
    });

    it('should return tier_1 for 50-74%', () => {
      expect(determineCurrentTier(50)).toBe('tier_1');
      expect(determineCurrentTier(60)).toBe('tier_1');
      expect(determineCurrentTier(74)).toBe('tier_1');
    });

    it('should return tier_2 for 75-99%', () => {
      expect(determineCurrentTier(75)).toBe('tier_2');
      expect(determineCurrentTier(80)).toBe('tier_2');
      expect(determineCurrentTier(99)).toBe('tier_2');
    });

    it('should return tier_3 for 100%+', () => {
      expect(determineCurrentTier(100)).toBe('tier_3');
      expect(determineCurrentTier(120)).toBe('tier_3');
      expect(determineCurrentTier(200)).toBe('tier_3');
    });
  });
});
