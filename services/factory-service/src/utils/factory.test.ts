import {
  generateFactoryCode,
  validateFactoryCode,
  validateBusinessLicense,
  validateTaxId,
  validatePhoneNumber,
  canActivateFactory,
  validateStatusTransition,
  calculatePerformanceRating,
  validatePostalCode,
  meetsVerificationRequirements,
} from './factory';

describe('factory utilities', () => {
  describe('generateFactoryCode', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1705670400000); // Returns timestamp ending in 400000
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate factory code with correct format', () => {
      const code = generateFactoryCode('Jakarta', 'Ahmad');
      expect(code).toMatch(/^FACT-JAK-AHM-\d{6}$/);
    });

    it('should use first 3 characters of city', () => {
      const code = generateFactoryCode('Surabaya', 'Budi');
      expect(code).toContain('FACT-SUR-');
    });

    it('should use first 3 characters of owner name', () => {
      const code = generateFactoryCode('Jakarta', 'Budiman');
      expect(code).toContain('-BUD-');
    });

    it('should convert to uppercase', () => {
      const code = generateFactoryCode('jakarta', 'ahmad');
      expect(code).toMatch(/^FACT-JAK-AHM-\d{6}$/);
    });

    it('should include 6-digit timestamp', () => {
      const code = generateFactoryCode('Jakarta', 'Ahmad');
      expect(code).toBe('FACT-JAK-AHM-400000');
    });

    it('should throw error for empty city', () => {
      expect(() => generateFactoryCode('', 'Ahmad')).toThrow(
        'City is required for factory code generation'
      );
    });

    it('should throw error for empty owner name', () => {
      expect(() => generateFactoryCode('Jakarta', '')).toThrow(
        'Owner name is required for factory code generation'
      );
    });

    it('should handle short city names', () => {
      const code = generateFactoryCode('Ja', 'Ahmad');
      expect(code).toContain('FACT-JA-');
    });

    it('should handle short owner names', () => {
      const code = generateFactoryCode('Jakarta', 'Ah');
      expect(code).toContain('-AH-');
    });
  });

  describe('validateFactoryCode', () => {
    it('should pass for valid factory code', () => {
      const result = validateFactoryCode('FACT-JAK-AHM-123456');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for different valid codes', () => {
      expect(validateFactoryCode('FACT-SUR-BUD-789012').valid).toBe(true);
      expect(validateFactoryCode('FACT-BDG-CHR-456789').valid).toBe(true);
    });

    it('should fail for empty code', () => {
      const result = validateFactoryCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Factory code is required');
    });

    it('should fail for code without FACT prefix', () => {
      const result = validateFactoryCode('CODE-JAK-AHM-123456');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must match format');
    });

    it('should fail for lowercase code', () => {
      const result = validateFactoryCode('fact-jak-ahm-123456');
      expect(result.valid).toBe(false);
    });

    it('should fail for code with wrong timestamp length', () => {
      expect(validateFactoryCode('FACT-JAK-AHM-12345').valid).toBe(false);
      expect(validateFactoryCode('FACT-JAK-AHM-1234567').valid).toBe(false);
    });

    it('should fail for code with non-numeric timestamp', () => {
      const result = validateFactoryCode('FACT-JAK-AHM-ABCDEF');
      expect(result.valid).toBe(false);
    });

    it('should fail for code with wrong number of sections', () => {
      expect(validateFactoryCode('FACT-JAK-123456').valid).toBe(false);
      expect(validateFactoryCode('FACT-JAK-AHM-SUB-123456').valid).toBe(false);
    });
  });

  describe('validateBusinessLicense', () => {
    it('should pass for valid 13-digit NIB', () => {
      const result = validateBusinessLicense('1234567890123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for NIB with spaces', () => {
      const result = validateBusinessLicense('1234 5678 90123');
      expect(result.valid).toBe(true);
    });

    it('should pass for NIB with hyphens', () => {
      const result = validateBusinessLicense('1234-5678-90123');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty license', () => {
      const result = validateBusinessLicense('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Business license number is required');
    });

    it('should fail for license too short', () => {
      const result = validateBusinessLicense('123456789012');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('13 digits');
    });

    it('should fail for license too long', () => {
      const result = validateBusinessLicense('12345678901234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('13 digits');
    });

    it('should fail for license with letters', () => {
      const result = validateBusinessLicense('1234567890ABC');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('13 digits');
    });
  });

  describe('validateTaxId', () => {
    it('should pass for valid 15-digit NPWP', () => {
      const result = validateTaxId('123456789012345');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for formatted NPWP', () => {
      const result = validateTaxId('12.345.678.9-012.345');
      expect(result.valid).toBe(true);
    });

    it('should pass for NPWP with hyphens', () => {
      const result = validateTaxId('12-345-678-9-012-345');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty tax ID', () => {
      const result = validateTaxId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tax ID is required');
    });

    it('should fail for tax ID too short', () => {
      const result = validateTaxId('12345678901234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('15 digits');
    });

    it('should fail for tax ID too long', () => {
      const result = validateTaxId('1234567890123456');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('15 digits');
    });

    it('should fail for tax ID with letters', () => {
      const result = validateTaxId('12345678901234A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('15 digits');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should pass for +62 format', () => {
      const result = validatePhoneNumber('+628123456789');
      expect(result.valid).toBe(true);
    });

    it('should pass for 62 format', () => {
      const result = validatePhoneNumber('628123456789');
      expect(result.valid).toBe(true);
    });

    it('should pass for 08 format', () => {
      const result = validatePhoneNumber('081234567890');
      expect(result.valid).toBe(true);
    });

    it('should pass for phone with spaces', () => {
      const result = validatePhoneNumber('+62 812 3456 7890');
      expect(result.valid).toBe(true);
    });

    it('should pass for phone with hyphens', () => {
      const result = validatePhoneNumber('+62-812-3456-7890');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty phone', () => {
      const result = validatePhoneNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should fail for non-Indonesian number', () => {
      const result = validatePhoneNumber('+1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid Indonesian number');
    });

    it('should fail for phone not starting with 8', () => {
      const result = validatePhoneNumber('+627123456789');
      expect(result.valid).toBe(false);
    });

    it('should fail for phone too short', () => {
      const result = validatePhoneNumber('+6281234');
      expect(result.valid).toBe(false);
    });

    it('should pass for various length valid phones', () => {
      expect(validatePhoneNumber('+62812345678').valid).toBe(true); // 8 digits after 8 (minimum)
      expect(validatePhoneNumber('+628123456789').valid).toBe(true); // 9 digits after 8
      expect(validatePhoneNumber('+6281234567890').valid).toBe(true); // 10 digits after 8
      expect(validatePhoneNumber('+62812345678901').valid).toBe(true); // 11 digits after 8 (maximum)
    });
  });

  describe('canActivateFactory', () => {
    it('should allow activation for verified factory', () => {
      const result = canActivateFactory('verified');
      expect(result.canActivate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow activation for unverified factory', () => {
      const result = canActivateFactory('unverified');
      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('must be verified');
      expect(result.reason).toContain('unverified');
    });

    it('should not allow activation for pending verification', () => {
      const result = canActivateFactory('pending');
      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('pending');
    });

    it('should not allow activation for rejected factory', () => {
      const result = canActivateFactory('rejected');
      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('rejected');
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow pending to active for verified factory', () => {
      const result = validateStatusTransition('pending', 'active', 'verified');
      expect(result.valid).toBe(true);
    });

    it('should not allow pending to active for unverified factory', () => {
      const result = validateStatusTransition('pending', 'active', 'unverified');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be verified first');
    });

    it('should not allow suspended to active directly', () => {
      const result = validateStatusTransition('suspended', 'active', 'verified');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be reviewed');
    });

    it('should not allow pending to suspended', () => {
      const result = validateStatusTransition('pending', 'suspended', 'verified');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be suspended');
    });

    it('should allow active to suspended', () => {
      const result = validateStatusTransition('active', 'suspended', 'verified');
      expect(result.valid).toBe(true);
    });

    it('should allow active to inactive', () => {
      const result = validateStatusTransition('active', 'inactive', 'verified');
      expect(result.valid).toBe(true);
    });

    it('should allow suspended to pending for review', () => {
      const result = validateStatusTransition('suspended', 'pending', 'verified');
      expect(result.valid).toBe(true);
    });

    it('should allow inactive to pending', () => {
      const result = validateStatusTransition('inactive', 'pending', 'verified');
      expect(result.valid).toBe(true);
    });
  });

  describe('calculatePerformanceRating', () => {
    it('should calculate excellent rating', () => {
      const result = calculatePerformanceRating(95, 5, 0.5);
      expect(result.rating).toBeGreaterThanOrEqual(4.5);
      expect(result.category).toBe('Excellent');
    });

    it('should calculate very good rating', () => {
      const result = calculatePerformanceRating(85, 4, 2);
      expect(result.rating).toBeGreaterThanOrEqual(3.5);
      expect(result.rating).toBeLessThan(4.5);
      expect(result.category).toBe('Very Good');
    });

    it('should calculate good rating', () => {
      const result = calculatePerformanceRating(70, 3, 5);
      expect(result.rating).toBeGreaterThanOrEqual(2.5);
      expect(result.rating).toBeLessThan(3.5);
      expect(result.category).toBe('Good');
    });

    it('should calculate fair rating', () => {
      const result = calculatePerformanceRating(50, 2, 10);
      expect(result.rating).toBeGreaterThanOrEqual(1.5);
      expect(result.rating).toBeLessThan(2.5);
      expect(result.category).toBe('Fair');
    });

    it('should calculate poor rating', () => {
      const result = calculatePerformanceRating(30, 1, 25);
      expect(result.rating).toBeLessThan(1.5);
      expect(result.category).toBe('Poor');
    });

    it('should throw error for invalid fulfillment rate (< 0)', () => {
      expect(() => calculatePerformanceRating(-10, 4, 2)).toThrow(
        'Order fulfillment rate must be between 0 and 100'
      );
    });

    it('should throw error for invalid fulfillment rate (> 100)', () => {
      expect(() => calculatePerformanceRating(110, 4, 2)).toThrow(
        'Order fulfillment rate must be between 0 and 100'
      );
    });

    it('should throw error for invalid quality score (< 0)', () => {
      expect(() => calculatePerformanceRating(80, -1, 2)).toThrow(
        'Quality score must be between 0 and 5'
      );
    });

    it('should throw error for invalid quality score (> 5)', () => {
      expect(() => calculatePerformanceRating(80, 6, 2)).toThrow(
        'Quality score must be between 0 and 5'
      );
    });

    it('should throw error for negative response time', () => {
      expect(() => calculatePerformanceRating(80, 4, -1)).toThrow(
        'Response time cannot be negative'
      );
    });

    it('should handle perfect metrics', () => {
      const result = calculatePerformanceRating(100, 5, 0.5);
      expect(result.rating).toBe(5);
      expect(result.category).toBe('Excellent');
    });

    it('should handle worst metrics', () => {
      const result = calculatePerformanceRating(0, 0, 48);
      expect(result.rating).toBe(0);
      expect(result.category).toBe('Poor');
    });

    it('should weight fulfillment and quality equally', () => {
      // High fulfillment, low quality
      const result1 = calculatePerformanceRating(100, 1, 2);
      // Low fulfillment, high quality
      const result2 = calculatePerformanceRating(20, 5, 2);
      // Both should be similar since weighted equally
      expect(Math.abs(result1.rating - result2.rating)).toBeLessThan(0.5);
    });
  });

  describe('validatePostalCode', () => {
    it('should pass for valid 5-digit postal code', () => {
      const result = validatePostalCode('12345');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for various valid postal codes', () => {
      expect(validatePostalCode('10110').valid).toBe(true); // Jakarta
      expect(validatePostalCode('40111').valid).toBe(true); // Bandung
      expect(validatePostalCode('60119').valid).toBe(true); // Surabaya
    });

    it('should fail for empty postal code', () => {
      const result = validatePostalCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Postal code is required');
    });

    it('should fail for postal code too short', () => {
      const result = validatePostalCode('1234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 digits');
    });

    it('should fail for postal code too long', () => {
      const result = validatePostalCode('123456');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 digits');
    });

    it('should fail for postal code with letters', () => {
      const result = validatePostalCode('1234A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 digits');
    });

    it('should fail for postal code with spaces', () => {
      const result = validatePostalCode('12 345');
      expect(result.valid).toBe(false);
    });
  });

  describe('meetsVerificationRequirements', () => {
    it('should pass when all requirements are met', () => {
      const result = meetsVerificationRequirements(true, true, true);
      expect(result.meetsRequirements).toBe(true);
      expect(result.missingItems).toHaveLength(0);
    });

    it('should fail when business license is missing', () => {
      const result = meetsVerificationRequirements(false, true, true);
      expect(result.meetsRequirements).toBe(false);
      expect(result.missingItems).toContain('Business license');
    });

    it('should fail when tax ID is missing', () => {
      const result = meetsVerificationRequirements(true, false, true);
      expect(result.meetsRequirements).toBe(false);
      expect(result.missingItems).toContain('Tax ID (NPWP)');
    });

    it('should fail when logo is missing', () => {
      const result = meetsVerificationRequirements(true, true, false);
      expect(result.meetsRequirements).toBe(false);
      expect(result.missingItems).toContain('Factory logo');
    });

    it('should list all missing requirements', () => {
      const result = meetsVerificationRequirements(false, false, false);
      expect(result.meetsRequirements).toBe(false);
      expect(result.missingItems).toHaveLength(3);
      expect(result.missingItems).toContain('Business license');
      expect(result.missingItems).toContain('Tax ID (NPWP)');
      expect(result.missingItems).toContain('Factory logo');
    });

    it('should list multiple missing requirements', () => {
      const result = meetsVerificationRequirements(true, false, false);
      expect(result.meetsRequirements).toBe(false);
      expect(result.missingItems).toHaveLength(2);
      expect(result.missingItems).toContain('Tax ID (NPWP)');
      expect(result.missingItems).toContain('Factory logo');
    });
  });
});
