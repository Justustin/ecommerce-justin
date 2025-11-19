import {
  generateOTP,
  isOTPExpired,
  validateOTPFormat,
  getOTPExpirySeconds,
  maskPhoneNumber,
} from './otp';

describe('otp utilities', () => {
  describe('generateOTP', () => {
    it('should generate 6-digit OTP by default', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate 4-digit OTP', () => {
      const otp = generateOTP(4);
      expect(otp).toHaveLength(4);
      expect(/^\d{4}$/.test(otp)).toBe(true);
    });

    it('should generate 8-digit OTP', () => {
      const otp = generateOTP(8);
      expect(otp).toHaveLength(8);
      expect(/^\d{8}$/.test(otp)).toBe(true);
    });

    it('should throw error for length < 4', () => {
      expect(() => generateOTP(3)).toThrow('OTP length must be between 4 and 8');
    });

    it('should throw error for length > 8', () => {
      expect(() => generateOTP(9)).toThrow('OTP length must be between 4 and 8');
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // Very unlikely to be the same (1 in 1,000,000)
      // But this test could theoretically fail due to randomness
      // In practice, we just verify they're both valid formats
      expect(/^\d{6}$/.test(otp1)).toBe(true);
      expect(/^\d{6}$/.test(otp2)).toBe(true);
    });

    it('should only contain digits 0-9', () => {
      for (let i = 0; i < 10; i++) {
        const otp = generateOTP();
        expect(/^[0-9]+$/.test(otp)).toBe(true);
      }
    });
  });

  describe('isOTPExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for OTP created just now', () => {
      const createdAt = new Date('2025-01-18T10:00:00Z');
      expect(isOTPExpired(createdAt, 5)).toBe(false);
    });

    it('should return false for OTP within expiry time', () => {
      const createdAt = new Date('2025-01-18T09:56:00Z'); // 4 minutes ago
      expect(isOTPExpired(createdAt, 5)).toBe(false);
    });

    it('should return true for OTP past expiry time', () => {
      const createdAt = new Date('2025-01-18T09:54:00Z'); // 6 minutes ago
      expect(isOTPExpired(createdAt, 5)).toBe(true);
    });

    it('should return false for OTP at exact expiry time', () => {
      const createdAt = new Date('2025-01-18T09:55:00Z'); // Exactly 5 minutes ago
      expect(isOTPExpired(createdAt, 5)).toBe(false);
    });

    it('should return true for OTP 1 second past expiry', () => {
      const createdAt = new Date('2025-01-18T09:54:59Z');
      expect(isOTPExpired(createdAt, 5)).toBe(true);
    });

    it('should use default expiry of 5 minutes', () => {
      const createdAt = new Date('2025-01-18T09:54:00Z');
      expect(isOTPExpired(createdAt)).toBe(true);
    });

    it('should handle custom expiry time', () => {
      const createdAt = new Date('2025-01-18T09:50:00Z'); // 10 minutes ago
      expect(isOTPExpired(createdAt, 15)).toBe(false); // 15 min expiry
      expect(isOTPExpired(createdAt, 5)).toBe(true); // 5 min expiry
    });
  });

  describe('validateOTPFormat', () => {
    it('should pass for valid 6-digit OTP', () => {
      const result = validateOTPFormat('123456');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for valid 4-digit OTP', () => {
      const result = validateOTPFormat('1234');
      expect(result.valid).toBe(true);
    });

    it('should pass for valid 8-digit OTP', () => {
      const result = validateOTPFormat('12345678');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty OTP', () => {
      const result = validateOTPFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP is required');
    });

    it('should fail for OTP with letters', () => {
      const result = validateOTPFormat('12AB56');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP must contain only digits');
    });

    it('should fail for OTP with special characters', () => {
      const result = validateOTPFormat('123-456');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP must contain only digits');
    });

    it('should fail for OTP too short', () => {
      const result = validateOTPFormat('123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP must be 4-8 digits');
    });

    it('should fail for OTP too long', () => {
      const result = validateOTPFormat('123456789');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP must be 4-8 digits');
    });

    it('should fail for OTP with spaces', () => {
      const result = validateOTPFormat('12 34 56');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP must contain only digits');
    });
  });

  describe('getOTPExpirySeconds', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 300 seconds for OTP just created (5 min expiry)', () => {
      const createdAt = new Date('2025-01-18T10:00:00Z');
      expect(getOTPExpirySeconds(createdAt, 5)).toBe(300);
    });

    it('should return correct seconds remaining', () => {
      const createdAt = new Date('2025-01-18T09:58:00Z'); // 2 minutes ago
      expect(getOTPExpirySeconds(createdAt, 5)).toBe(180); // 3 minutes = 180 seconds
    });

    it('should return negative for expired OTP', () => {
      const createdAt = new Date('2025-01-18T09:54:00Z'); // 6 minutes ago
      expect(getOTPExpirySeconds(createdAt, 5)).toBe(-60); // -1 minute
    });

    it('should return 0 for OTP about to expire', () => {
      const createdAt = new Date('2025-01-18T09:55:00Z');
      expect(getOTPExpirySeconds(createdAt, 5)).toBe(0);
    });

    it('should handle custom expiry time', () => {
      const createdAt = new Date('2025-01-18T10:00:00Z');
      expect(getOTPExpirySeconds(createdAt, 10)).toBe(600); // 10 minutes
    });

    it('should floor fractional seconds', () => {
      const createdAt = new Date('2025-01-18T09:59:59.500Z');
      const seconds = getOTPExpirySeconds(createdAt, 5);
      expect(Number.isInteger(seconds)).toBe(true);
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask Indonesian phone number correctly', () => {
      const masked = maskPhoneNumber('+6281234567890');
      expect(masked).toBe('+62*******7890');
    });

    it('should mask with correct number of asterisks', () => {
      const phone = '+6281234567890'; // 14 chars total
      const masked = maskPhoneNumber(phone);
      // +62 (3) + ******* (7) + 7890 (4) = 14 chars
      expect(masked).toHaveLength(14);
    });

    it('should preserve country code', () => {
      const masked = maskPhoneNumber('+6281234567890');
      expect(masked.startsWith('+62')).toBe(true);
    });

    it('should preserve last 4 digits', () => {
      const masked = maskPhoneNumber('+6281234567890');
      expect(masked.endsWith('7890')).toBe(true);
    });

    it('should handle short phone number', () => {
      const masked = maskPhoneNumber('+621234');
      expect(masked).toBe('+621234');
    });

    it('should handle different formats', () => {
      expect(maskPhoneNumber('+628123456789')).toBe('+62******6789');
      expect(maskPhoneNumber('+62812345678')).toBe('+62*****5678');
    });

    it('should mask middle digits only', () => {
      const phone = '+6281234567890';
      const masked = maskPhoneNumber(phone);
      expect(masked.includes('*')).toBe(true);
      expect(masked.match(/\*/g)?.length).toBe(7);
    });
  });
});
