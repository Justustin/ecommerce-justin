import { shouldBotJoin, calculateBotQuantity, isSessionNearExpiration, getMinutesUntilExpiry } from './botParticipant';

describe('botParticipant', () => {
  describe('shouldBotJoin', () => {
    it('should return true when < 25% and T-10 minutes', () => {
      const result = shouldBotJoin(20, 100, 10);
      expect(result).toBe(true);
    });

    it('should return true when < 25% and T-5 minutes', () => {
      const result = shouldBotJoin(20, 100, 5);
      expect(result).toBe(true);
    });

    it('should return false when >= 25%', () => {
      const result = shouldBotJoin(25, 100, 10);
      expect(result).toBe(false);
    });

    it('should return false when < 25% but > 10 minutes remaining', () => {
      const result = shouldBotJoin(20, 100, 15);
      expect(result).toBe(false);
    });

    it('should return true when 0% at T-10 minutes', () => {
      const result = shouldBotJoin(0, 100, 10);
      expect(result).toBe(true);
    });

    it('should return false when exactly at 25%', () => {
      const result = shouldBotJoin(25, 100, 10);
      expect(result).toBe(false);
    });

    it('should return false when over 25%', () => {
      const result = shouldBotJoin(30, 100, 5);
      expect(result).toBe(false);
    });

    it('should return true when 24% at T-1 minute', () => {
      const result = shouldBotJoin(24, 100, 1);
      expect(result).toBe(true);
    });
  });

  describe('calculateBotQuantity', () => {
    it('should calculate correct quantity to reach 25%', () => {
      const result = calculateBotQuantity(20, 100);
      expect(result).toBe(5); // Need 5 more to reach 25
    });

    it('should return 0 when already at 25%', () => {
      const result = calculateBotQuantity(25, 100);
      expect(result).toBe(0);
    });

    it('should return full 25% when starting from 0', () => {
      const result = calculateBotQuantity(0, 100);
      expect(result).toBe(25);
    });

    it('should handle MOQ that does not divide evenly', () => {
      const result = calculateBotQuantity(10, 99);
      // 25% of 99 = 24.75, ceil to 25
      expect(result).toBe(15); // 25 - 10 = 15
    });

    it('should return 0 when over 25%', () => {
      const result = calculateBotQuantity(30, 100);
      expect(result).toBe(0);
    });

    it('should handle different MOQ values', () => {
      expect(calculateBotQuantity(0, 200)).toBe(50); // 25% of 200
      expect(calculateBotQuantity(40, 200)).toBe(10); // 50 - 40
    });

    it('should handle edge case of 1 unit short', () => {
      const result = calculateBotQuantity(24, 100);
      expect(result).toBe(1);
    });
  });

  describe('isSessionNearExpiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true when exactly 10 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:10:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return true when 5 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:05:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return true when 1 minute remaining', () => {
      const expiresAt = new Date('2025-01-18T10:01:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return false when 11 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:11:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });

    it('should return false when already expired', () => {
      const expiresAt = new Date('2025-01-18T09:59:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });

    it('should return false when 15 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:15:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });
  });

  describe('getMinutesUntilExpiry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:30:00Z');
      expect(getMinutesUntilExpiry(expiresAt)).toBe(30);
    });

    it('should return 10 for T-10 minutes', () => {
      const expiresAt = new Date('2025-01-18T10:10:00Z');
      expect(getMinutesUntilExpiry(expiresAt)).toBe(10);
    });

    it('should return negative for expired sessions', () => {
      const expiresAt = new Date('2025-01-18T09:55:00Z');
      expect(getMinutesUntilExpiry(expiresAt)).toBe(-5);
    });

    it('should return 0 for expiring right now', () => {
      const expiresAt = new Date('2025-01-18T10:00:00Z');
      expect(getMinutesUntilExpiry(expiresAt)).toBe(0);
    });
  });
});
