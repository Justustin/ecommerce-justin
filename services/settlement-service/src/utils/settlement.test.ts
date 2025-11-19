import {
  calculateFactoryPayout,
  canProcessSettlement,
  calculateBatchSettlementTotal,
  validateBankDetails,
  getNextSettlementDate,
} from './settlement';

describe('settlement utilities', () => {
  describe('calculateFactoryPayout', () => {
    it('should calculate 10% platform fee by default', () => {
      const result = calculateFactoryPayout(1000000);
      expect(result.platformFee).toBe(100000);
      expect(result.factoryAmount).toBe(900000);
    });

    it('should calculate custom platform fee', () => {
      const result = calculateFactoryPayout(1000000, 15);
      expect(result.platformFee).toBe(150000);
      expect(result.factoryAmount).toBe(850000);
    });

    it('should calculate 5% platform fee', () => {
      const result = calculateFactoryPayout(1000000, 5);
      expect(result.platformFee).toBe(50000);
      expect(result.factoryAmount).toBe(950000);
    });

    it('should round to nearest integer', () => {
      const result = calculateFactoryPayout(1000001, 10);
      expect(result.platformFee).toBe(100000);
      expect(result.factoryAmount).toBe(900001);
    });

    it('should return 0 for negative order total', () => {
      const result = calculateFactoryPayout(-100000, 10);
      expect(result.factoryAmount).toBe(0);
      expect(result.platformFee).toBe(0);
    });

    it('should return full amount for negative fee percentage', () => {
      const result = calculateFactoryPayout(1000000, -5);
      expect(result.factoryAmount).toBe(1000000);
      expect(result.platformFee).toBe(0);
    });

    it('should return full amount for fee over 100%', () => {
      const result = calculateFactoryPayout(1000000, 150);
      expect(result.factoryAmount).toBe(1000000);
      expect(result.platformFee).toBe(0);
    });

    it('should handle 0% fee', () => {
      const result = calculateFactoryPayout(1000000, 0);
      expect(result.platformFee).toBe(0);
      expect(result.factoryAmount).toBe(1000000);
    });

    it('should handle 100% fee', () => {
      const result = calculateFactoryPayout(1000000, 100);
      expect(result.platformFee).toBe(1000000);
      expect(result.factoryAmount).toBe(0);
    });
  });

  describe('canProcessSettlement', () => {
    it('should allow processing for pending settlement after 7 days', () => {
      const result = canProcessSettlement('pending', 'completed', 7, 7);
      expect(result.canProcess).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow processing for already paid settlement', () => {
      const result = canProcessSettlement('paid', 'completed', 7, 7);
      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('Settlement already paid');
    });

    it('should not allow processing for settlement already processing', () => {
      const result = canProcessSettlement('processing', 'completed', 7, 7);
      expect(result.canProcess).toBe(false);
      expect(result.reason).toBe('Settlement already processing');
    });

    it('should not allow processing for non-completed order', () => {
      const result = canProcessSettlement('pending', 'shipped', 7, 7);
      expect(result.canProcess).toBe(false);
      expect(result.reason).toContain('must be completed/delivered');
    });

    it('should allow processing for delivered order', () => {
      const result = canProcessSettlement('pending', 'delivered', 7, 7);
      expect(result.canProcess).toBe(true);
    });

    it('should not allow processing before minimum days', () => {
      const result = canProcessSettlement('pending', 'completed', 5, 7);
      expect(result.canProcess).toBe(false);
      expect(result.reason).toContain('Must wait 7 days');
    });

    it('should allow processing exactly at minimum days', () => {
      const result = canProcessSettlement('pending', 'completed', 7, 7);
      expect(result.canProcess).toBe(true);
    });

    it('should handle custom minimum days', () => {
      expect(canProcessSettlement('pending', 'completed', 3, 3).canProcess).toBe(true);
      expect(canProcessSettlement('pending', 'completed', 2, 3).canProcess).toBe(false);
    });

    it('should allow processing after minimum days', () => {
      const result = canProcessSettlement('pending', 'completed', 10, 7);
      expect(result.canProcess).toBe(true);
    });
  });

  describe('calculateBatchSettlementTotal', () => {
    it('should sum all pending settlements', () => {
      const settlements = [
        { amount: 100000, status: 'pending' },
        { amount: 200000, status: 'pending' },
        { amount: 150000, status: 'pending' },
      ];
      expect(calculateBatchSettlementTotal(settlements)).toBe(450000);
    });

    it('should exclude paid settlements', () => {
      const settlements = [
        { amount: 100000, status: 'pending' },
        { amount: 200000, status: 'paid' },
      ];
      expect(calculateBatchSettlementTotal(settlements)).toBe(100000);
    });

    it('should exclude processing settlements', () => {
      const settlements = [
        { amount: 100000, status: 'pending' },
        { amount: 200000, status: 'processing' },
      ];
      expect(calculateBatchSettlementTotal(settlements)).toBe(100000);
    });

    it('should return 0 for empty array', () => {
      expect(calculateBatchSettlementTotal([])).toBe(0);
    });

    it('should return 0 when all settlements are paid', () => {
      const settlements = [
        { amount: 100000, status: 'paid' },
        { amount: 200000, status: 'paid' },
      ];
      expect(calculateBatchSettlementTotal(settlements)).toBe(0);
    });

    it('should handle large amounts', () => {
      const settlements = [
        { amount: 10000000, status: 'pending' },
        { amount: 5000000, status: 'pending' },
      ];
      expect(calculateBatchSettlementTotal(settlements)).toBe(15000000);
    });
  });

  describe('validateBankDetails', () => {
    it('should pass for valid bank details', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'Test Factory Ltd',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for missing bank code', () => {
      const bank = {
        bankCode: '',
        accountNumber: '1234567890',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Bank code is required');
    });

    it('should fail for missing account number', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number is required');
    });

    it('should fail for account number with letters', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '123ABC7890',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number must contain only digits');
    });

    it('should fail for account number too short', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '1234567',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number must be 8-20 digits');
    });

    it('should fail for account number too long', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '123456789012345678901',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number must be 8-20 digits');
    });

    it('should pass for minimum length account number', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '12345678',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(true);
    });

    it('should pass for maximum length account number', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '12345678901234567890',
        accountName: 'Test Factory',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing account name', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: '',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account name is required');
    });

    it('should fail for account name too short', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'AB',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account name too short');
    });

    it('should pass for minimum length account name', () => {
      const bank = {
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'ABC',
      };
      const result = validateBankDetails(bank);
      expect(result.valid).toBe(true);
    });
  });

  describe('getNextSettlementDate', () => {
    it('should return next Friday for any day of week', () => {
      // Monday Jan 13, 2025
      const monday = new Date('2025-01-13T10:00:00Z');
      const result = getNextSettlementDate(monday);
      // Should be Friday Jan 17, 2025 (4 days later, but we add 7 first)
      expect(result.getDay()).toBe(5); // Friday
    });

    it('should handle settlement date already on Friday', () => {
      // Friday Jan 17, 2025
      const friday = new Date('2025-01-17T10:00:00Z');
      const result = getNextSettlementDate(friday);
      // Should be next Friday (7 days later)
      expect(result.getDay()).toBe(5);
      expect(result.getDate()).toBe(24);
    });

    it('should always return a Friday', () => {
      const testDates = [
        new Date('2025-01-13T10:00:00Z'), // Monday
        new Date('2025-01-14T10:00:00Z'), // Tuesday
        new Date('2025-01-15T10:00:00Z'), // Wednesday
        new Date('2025-01-16T10:00:00Z'), // Thursday
        new Date('2025-01-17T10:00:00Z'), // Friday
        new Date('2025-01-18T10:00:00Z'), // Saturday
        new Date('2025-01-19T10:00:00Z'), // Sunday
      ];

      testDates.forEach((date) => {
        const result = getNextSettlementDate(date);
        expect(result.getDay()).toBe(5); // All should be Friday
      });
    });

    it('should preserve time when calculating next date', () => {
      const date = new Date('2025-01-13T15:30:45Z');
      const result = getNextSettlementDate(date);
      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(30);
    });
  });
});
