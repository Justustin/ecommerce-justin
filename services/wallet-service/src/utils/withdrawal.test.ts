import {
  calculateWithdrawalFee,
  calculateNetAmount,
  validateWithdrawalAmount,
  WITHDRAWAL_FEE
} from './withdrawal';

describe('withdrawal utilities', () => {
  describe('calculateWithdrawalFee', () => {
    it('should return flat fee of 2500 for any amount', () => {
      expect(calculateWithdrawalFee(50000)).toBe(2500);
      expect(calculateWithdrawalFee(100000)).toBe(2500);
      expect(calculateWithdrawalFee(1000000)).toBe(2500);
    });

    it('should match the constant WITHDRAWAL_FEE', () => {
      expect(calculateWithdrawalFee(100000)).toBe(WITHDRAWAL_FEE);
    });
  });

  describe('calculateNetAmount', () => {
    it('should deduct fee from amount', () => {
      expect(calculateNetAmount(100000)).toBe(97500);
      expect(calculateNetAmount(50000)).toBe(47500);
      expect(calculateNetAmount(10000)).toBe(7500);
    });

    it('should handle exact fee amount', () => {
      expect(calculateNetAmount(2500)).toBe(0);
    });

    it('should return negative for amounts less than fee', () => {
      expect(calculateNetAmount(1000)).toBe(-1500);
    });

    it('should handle large amounts', () => {
      expect(calculateNetAmount(1000000)).toBe(997500);
    });
  });

  describe('validateWithdrawalAmount', () => {
    it('should pass validation for valid amount', () => {
      const result = validateWithdrawalAmount(100000, 500000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for negative amount', () => {
      const result = validateWithdrawalAmount(-1000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should fail for zero amount', () => {
      const result = validateWithdrawalAmount(0, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should fail for amount below minimum', () => {
      const result = validateWithdrawalAmount(9000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Minimum withdrawal is Rp 10,000');
    });

    it('should pass for exact minimum amount', () => {
      const result = validateWithdrawalAmount(10000, 500000);
      expect(result.valid).toBe(true);
    });

    it('should fail when amount exceeds balance', () => {
      const result = validateWithdrawalAmount(600000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('should pass when amount equals balance', () => {
      const result = validateWithdrawalAmount(500000, 500000);
      expect(result.valid).toBe(true);
    });
  });
});
