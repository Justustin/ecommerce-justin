import {
  formatCurrency,
  truncateMessage,
  determineNotificationPriority,
  validateNotificationData,
  generateActionUrl,
  shouldSendDuringQuietHours,
  sanitizeNotificationContent,
  formatPhoneForWhatsApp,
  calculateBatchSize,
  isDuplicateNotification,
  generateNotificationSummary,
} from './notification';

describe('notification utilities', () => {
  describe('formatCurrency', () => {
    it('should format number to IDR currency', () => {
      expect(formatCurrency(1000000)).toBe('1.000.000');
    });

    it('should format string number', () => {
      expect(formatCurrency('500000')).toBe('500.000');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('0');
    });

    it('should return 0 for invalid input', () => {
      expect(formatCurrency('invalid')).toBe('0');
      expect(formatCurrency(NaN)).toBe('0');
    });

    it('should not show decimal places', () => {
      expect(formatCurrency(1500.75)).toBe('1.501');
    });
  });

  describe('truncateMessage', () => {
    it('should not truncate short messages', () => {
      expect(truncateMessage('Short message')).toBe('Short message');
    });

    it('should truncate long messages with default length', () => {
      const longMessage = 'A'.repeat(150);
      const result = truncateMessage(longMessage);
      expect(result.length).toBe(100);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate with custom length', () => {
      const message = 'This is a long message';
      const result = truncateMessage(message, 10);
      expect(result).toBe('This is...');
    });

    it('should handle empty string', () => {
      expect(truncateMessage('')).toBe('');
    });

    it('should preserve message exactly at max length', () => {
      const message = 'A'.repeat(100);
      expect(truncateMessage(message, 100)).toBe(message);
    });
  });

  describe('determineNotificationPriority', () => {
    it('should return urgent for payment', () => {
      expect(determineNotificationPriority('payment')).toBe('urgent');
    });

    it('should return urgent for refund', () => {
      expect(determineNotificationPriority('refund')).toBe('urgent');
    });

    it('should return high for shipping', () => {
      expect(determineNotificationPriority('shipping')).toBe('high');
    });

    it('should return high for order', () => {
      expect(determineNotificationPriority('order')).toBe('high');
    });

    it('should return medium for group_buying', () => {
      expect(determineNotificationPriority('group_buying')).toBe('medium');
    });

    it('should return medium for production', () => {
      expect(determineNotificationPriority('production')).toBe('medium');
    });

    it('should return low for review', () => {
      expect(determineNotificationPriority('review')).toBe('low');
    });

    it('should return low for system', () => {
      expect(determineNotificationPriority('system')).toBe('low');
    });
  });

  describe('validateNotificationData', () => {
    it('should pass for valid data', () => {
      const result = validateNotificationData('Title', 'Message', 'user123');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty title', () => {
      const result = validateNotificationData('', 'Message', 'user123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should fail for title too long', () => {
      const longTitle = 'A'.repeat(101);
      const result = validateNotificationData(longTitle, 'Message', 'user123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100 characters');
    });

    it('should fail for empty message', () => {
      const result = validateNotificationData('Title', '', 'user123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Message is required');
    });

    it('should fail for message too long', () => {
      const longMessage = 'A'.repeat(501);
      const result = validateNotificationData('Title', longMessage, 'user123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('500 characters');
    });

    it('should fail for empty user ID', () => {
      const result = validateNotificationData('Title', 'Message', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('User ID is required');
    });
  });

  describe('generateActionUrl', () => {
    it('should generate action URL', () => {
      const url = generateActionUrl('https://app.example.com', 'orders', '123');
      expect(url).toBe('https://app.example.com/orders/123');
    });

    it('should handle trailing slash in base URL', () => {
      const url = generateActionUrl('https://app.example.com/', 'payments', '456');
      expect(url).toBe('https://app.example.com/payments/456');
    });

    it('should return empty for missing parameters', () => {
      expect(generateActionUrl('', 'orders', '123')).toBe('');
      expect(generateActionUrl('https://app.com', '', '123')).toBe('');
      expect(generateActionUrl('https://app.com', 'orders', '')).toBe('');
    });
  });

  describe('shouldSendDuringQuietHours', () => {
    it('should always send urgent notifications', () => {
      expect(shouldSendDuringQuietHours(23, 'urgent')).toBe(true);
      expect(shouldSendDuringQuietHours(3, 'urgent')).toBe(true);
    });

    it('should send high priority outside quiet hours', () => {
      expect(shouldSendDuringQuietHours(12, 'high')).toBe(true);
      expect(shouldSendDuringQuietHours(18, 'high')).toBe(true);
    });

    it('should send high priority during quiet hours', () => {
      expect(shouldSendDuringQuietHours(23, 'high')).toBe(true);
      expect(shouldSendDuringQuietHours(3, 'high')).toBe(true);
    });

    it('should not send low priority during quiet hours', () => {
      expect(shouldSendDuringQuietHours(23, 'low')).toBe(false);
      expect(shouldSendDuringQuietHours(3, 'low')).toBe(false);
    });

    it('should not send medium priority during quiet hours', () => {
      expect(shouldSendDuringQuietHours(22, 'medium')).toBe(false);
      expect(shouldSendDuringQuietHours(6, 'medium')).toBe(false);
    });

    it('should send medium priority outside quiet hours', () => {
      expect(shouldSendDuringQuietHours(12, 'medium')).toBe(true);
      expect(shouldSendDuringQuietHours(20, 'medium')).toBe(true);
    });

    it('should throw error for invalid hour', () => {
      expect(() => shouldSendDuringQuietHours(-1, 'medium')).toThrow(
        'Hour must be between 0 and 23'
      );
      expect(() => shouldSendDuringQuietHours(24, 'medium')).toThrow(
        'Hour must be between 0 and 23'
      );
    });
  });

  describe('sanitizeNotificationContent', () => {
    it('should remove script tags', () => {
      const input = 'Hello<script>alert("xss")</script>World';
      expect(sanitizeNotificationContent(input)).toBe('HelloWorld');
    });

    it('should remove HTML tags', () => {
      const input = '<b>Bold</b> <i>Italic</i>';
      expect(sanitizeNotificationContent(input)).toBe('Bold Italic');
    });

    it('should remove angle brackets', () => {
      const input = 'Price: <100';
      expect(sanitizeNotificationContent(input)).toBe('Price: 100');
    });

    it('should handle empty string', () => {
      expect(sanitizeNotificationContent('')).toBe('');
    });

    it('should preserve normal text', () => {
      const input = 'Normal notification message';
      expect(sanitizeNotificationContent(input)).toBe('Normal notification message');
    });

    it('should trim whitespace', () => {
      const input = '  Trimmed  ';
      expect(sanitizeNotificationContent(input)).toBe('Trimmed');
    });
  });

  describe('formatPhoneForWhatsApp', () => {
    it('should format +62 number', () => {
      expect(formatPhoneForWhatsApp('+628123456789')).toBe('628123456789');
    });

    it('should convert 08 to 628', () => {
      expect(formatPhoneForWhatsApp('081234567890')).toBe('6281234567890');
    });

    it('should handle 62 format', () => {
      expect(formatPhoneForWhatsApp('628123456789')).toBe('628123456789');
    });

    it('should remove spaces and hyphens', () => {
      expect(formatPhoneForWhatsApp('+62 812 3456 7890')).toBe('628123456789');
      expect(formatPhoneForWhatsApp('+62-812-345-6789')).toBe('6281234567890');
    });

    it('should throw error for empty phone', () => {
      expect(() => formatPhoneForWhatsApp('')).toThrow('Phone number is required');
    });

    it('should throw error for non-Indonesian number', () => {
      expect(() => formatPhoneForWhatsApp('+1234567890')).toThrow(
        'Invalid Indonesian phone number format'
      );
    });
  });

  describe('calculateBatchSize', () => {
    it('should return 10 for urgent with many recipients', () => {
      expect(calculateBatchSize(100, 'urgent')).toBe(10);
    });

    it('should return 50 for high priority', () => {
      expect(calculateBatchSize(100, 'high')).toBe(50);
    });

    it('should return 100 for medium priority', () => {
      expect(calculateBatchSize(200, 'medium')).toBe(100);
    });

    it('should return 500 for low priority', () => {
      expect(calculateBatchSize(1000, 'low')).toBe(500);
    });

    it('should not exceed total recipients', () => {
      expect(calculateBatchSize(5, 'urgent')).toBe(5);
      expect(calculateBatchSize(30, 'high')).toBe(30);
    });

    it('should return 0 for zero recipients', () => {
      expect(calculateBatchSize(0, 'medium')).toBe(0);
    });
  });

  describe('isDuplicateNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-20T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for first notification', () => {
      expect(isDuplicateNotification(null as any)).toBe(false);
    });

    it('should return true for notification within 5 minutes', () => {
      const lastSent = new Date('2025-01-20T09:57:00Z');
      expect(isDuplicateNotification(lastSent)).toBe(true);
    });

    it('should return false for notification after 5 minutes', () => {
      const lastSent = new Date('2025-01-20T09:54:00Z');
      expect(isDuplicateNotification(lastSent)).toBe(false);
    });

    it('should use custom window', () => {
      const lastSent = new Date('2025-01-20T09:52:00Z');
      expect(isDuplicateNotification(lastSent, new Date(), 10)).toBe(true);
    });

    it('should handle exact boundary', () => {
      const lastSent = new Date('2025-01-20T09:55:00Z');
      expect(isDuplicateNotification(lastSent)).toBe(false);
    });
  });

  describe('generateNotificationSummary', () => {
    it('should return message for single notification', () => {
      expect(generateNotificationSummary(['Payment received'])).toBe('Payment received');
    });

    it('should join multiple notifications', () => {
      const notifications = ['Order #123', 'Order #456'];
      expect(generateNotificationSummary(notifications)).toBe('Order #123, Order #456');
    });

    it('should summarize many notifications', () => {
      const notifications = ['Notif 1', 'Notif 2', 'Notif 3', 'Notif 4', 'Notif 5'];
      expect(generateNotificationSummary(notifications)).toBe('Notif 1, Notif 2, Notif 3, and 2 more');
    });

    it('should use custom max display', () => {
      const notifications = ['A', 'B', 'C', 'D', 'E'];
      expect(generateNotificationSummary(notifications, 2)).toBe('A, B, and 3 more');
    });

    it('should handle empty array', () => {
      expect(generateNotificationSummary([])).toBe('No new notifications');
    });

    it('should handle null/undefined', () => {
      expect(generateNotificationSummary(null as any)).toBe('No new notifications');
    });
  });
});
