import axios from 'axios';
import { notification_type } from '@repo/database';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

export interface CreateNotificationPayload {
  userId: string;
  type: notification_type;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedId?: string | null;
}

export class NotificationClient {
  /**
   * Send notification to the notification service
   * Falls back gracefully if service is unavailable
   */
  async sendNotification(payload: CreateNotificationPayload): Promise<void> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/notifications`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000 // 5 second timeout
        }
      );
    } catch (error: any) {
      // Log error but don't throw - notification failure shouldn't break payment flow
      console.error('Failed to send notification:', {
        error: error.message,
        userId: payload.userId,
        type: payload.type,
        relatedId: payload.relatedId
      });

      // TODO: Could implement retry queue or fallback mechanism here
      // For now, we just log and continue
    }
  }

  /**
   * Send multiple notifications in batch
   */
  async sendBatchNotifications(payloads: CreateNotificationPayload[]): Promise<void> {
    // Send notifications in parallel but don't wait for all to complete
    await Promise.allSettled(
      payloads.map(payload => this.sendNotification(payload))
    );
  }
}

// Singleton instance
export const notificationClient = new NotificationClient();
