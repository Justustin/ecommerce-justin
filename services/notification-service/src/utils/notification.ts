/**
 * Notification utility functions for business logic
 */

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationType =
  | 'payment'
  | 'order'
  | 'group_buying'
  | 'production'
  | 'shipping'
  | 'refund'
  | 'review'
  | 'system';

/**
 * Format currency to Indonesian Rupiah
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

/**
 * Truncate message to specified length for push notifications
 * @param message - Message to truncate
 * @param maxLength - Maximum length (default 100 for push notifications)
 * @returns Truncated message
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (!message) return '';

  if (message.length <= maxLength) {
    return message;
  }

  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Determine notification priority based on type
 * @param notificationType - Type of notification
 * @returns Priority level
 */
export function determineNotificationPriority(
  notificationType: NotificationType
): NotificationPriority {
  switch (notificationType) {
    case 'payment':
    case 'refund':
      return 'urgent';
    case 'shipping':
    case 'order':
      return 'high';
    case 'group_buying':
    case 'production':
      return 'medium';
    case 'review':
    case 'system':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Validate notification data
 * @param title - Notification title
 * @param message - Notification message
 * @param userId - User ID
 * @returns Validation result
 */
export function validateNotificationData(
  title: string,
  message: string,
  userId: string
): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (title.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or less' };
  }

  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message is required' };
  }

  if (message.length > 500) {
    return { valid: false, error: 'Message must be 500 characters or less' };
  }

  if (!userId || userId.trim().length === 0) {
    return { valid: false, error: 'User ID is required' };
  }

  return { valid: true };
}

/**
 * Generate action URL for notification
 * @param baseUrl - Base application URL
 * @param type - Type of resource (order, payment, etc.)
 * @param resourceId - Resource identifier
 * @returns Complete action URL
 */
export function generateActionUrl(
  baseUrl: string,
  type: string,
  resourceId: string
): string {
  if (!baseUrl || !type || !resourceId) {
    return '';
  }

  // Remove trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return `${cleanBaseUrl}/${type}/${resourceId}`;
}

/**
 * Check if notification should be sent during quiet hours
 * @param currentHour - Current hour (0-23)
 * @param priority - Notification priority
 * @param quietHoursStart - Start of quiet hours (default 22)
 * @param quietHoursEnd - End of quiet hours (default 7)
 * @returns Whether notification should be sent
 */
export function shouldSendDuringQuietHours(
  currentHour: number,
  priority: NotificationPriority,
  quietHoursStart: number = 22,
  quietHoursEnd: number = 7
): boolean {
  if (currentHour < 0 || currentHour > 23) {
    throw new Error('Hour must be between 0 and 23');
  }

  // Always send urgent notifications
  if (priority === 'urgent') {
    return true;
  }

  // Check if current time is in quiet hours
  const isQuietHours =
    currentHour >= quietHoursStart || currentHour < quietHoursEnd;

  // Don't send low/medium priority during quiet hours
  if (isQuietHours && (priority === 'low' || priority === 'medium')) {
    return false;
  }

  return true;
}

/**
 * Sanitize user input for notification content
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeNotificationContent(input: string): string {
  if (!input) return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Format phone number for WhatsApp notifications
 * @param phoneNumber - Phone number (supports +62, 62, 08 formats)
 * @returns Formatted phone number for WhatsApp (e.g., 628xxx)
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Convert 08xxx to 628xxx
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }

  // Ensure it starts with 62
  if (!cleaned.startsWith('62')) {
    throw new Error('Invalid Indonesian phone number format');
  }

  return cleaned;
}

/**
 * Calculate notification batch size based on priority
 * @param totalRecipients - Total number of recipients
 * @param priority - Notification priority
 * @returns Optimal batch size for sending
 */
export function calculateBatchSize(
  totalRecipients: number,
  priority: NotificationPriority
): number {
  if (totalRecipients <= 0) {
    return 0;
  }

  // Higher priority = smaller batches for faster delivery
  switch (priority) {
    case 'urgent':
      return Math.min(totalRecipients, 10); // Send in very small batches
    case 'high':
      return Math.min(totalRecipients, 50);
    case 'medium':
      return Math.min(totalRecipients, 100);
    case 'low':
      return Math.min(totalRecipients, 500);
    default:
      return Math.min(totalRecipients, 100);
  }
}

/**
 * Check if notification is duplicate within time window
 * @param lastSentTime - Last time notification was sent
 * @param currentTime - Current time
 * @param windowMinutes - Duplicate detection window in minutes (default 5)
 * @returns Whether notification is duplicate
 */
export function isDuplicateNotification(
  lastSentTime: Date,
  currentTime: Date = new Date(),
  windowMinutes: number = 5
): boolean {
  if (!lastSentTime) {
    return false;
  }

  const timeDiffMs = currentTime.getTime() - lastSentTime.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);

  return timeDiffMinutes < windowMinutes;
}

/**
 * Generate notification summary for grouping similar notifications
 * @param notifications - Array of notification titles
 * @param maxDisplay - Maximum notifications to display individually (default 3)
 * @returns Summary string
 */
export function generateNotificationSummary(
  notifications: string[],
  maxDisplay: number = 3
): string {
  if (!notifications || notifications.length === 0) {
    return 'No new notifications';
  }

  if (notifications.length === 1) {
    return notifications[0];
  }

  if (notifications.length <= maxDisplay) {
    return notifications.join(', ');
  }

  const displayed = notifications.slice(0, maxDisplay).join(', ');
  const remaining = notifications.length - maxDisplay;

  return `${displayed}, and ${remaining} more`;
}
