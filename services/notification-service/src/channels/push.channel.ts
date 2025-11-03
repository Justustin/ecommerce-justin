// src/channels/push.channel.ts
import webpush from 'web-push';
import { prisma } from '@repo/database';


// Configure web-push with VAPID keys
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'admin@pinduoduo-clone.com'}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  userId: string;
  title: string;
  message: string;
  actionUrl?: string;
  icon?: string;
  badge?: string;
}

interface BulkPushPayload {
  userIds: string[];
  title: string;
  message: string;
  actionUrl?: string;
  icon?: string;
}

export class PushChannel {
  /**
   * Send push notification to a single user
   */
  async send(payload: PushPayload): Promise<void> {
    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.$queryRaw<any[]>`
        SELECT * FROM push_subscriptions WHERE user_id = ${payload.userId}::uuid
      `;

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${payload.userId}`);
        return;
      }

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: payload.icon || '/icons/notification.png',
        badge: payload.badge || '/icons/badge.png',
        data: {
          url: payload.actionUrl || '/',
          timestamp: Date.now()
        }
      });

      // Send to all user's devices
      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload
          );
        } catch (error: any) {
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            await this.removeInvalidSubscription(sub.id);
          }
          console.error(`Failed to send push to subscription ${sub.id}:`, error.message);
        }
      });

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users (bulk)
   */
  async sendBulk(payload: BulkPushPayload): Promise<void> {
    try {
      // Get all subscriptions for these users
      const subscriptions = await prisma.$queryRaw<any[]>`
        SELECT * FROM push_subscriptions 
        WHERE user_id = ANY(${payload.userIds}::uuid[])
      `;

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions found for bulk send');
        return;
      }

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: payload.icon || '/icons/notification.png',
        badge: '/icons/badge.png',
        data: {
          url: payload.actionUrl || '/',
          timestamp: Date.now()
        }
      });

      // Send to all subscriptions
      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload
          );
        } catch (error: any) {
          if (error.statusCode === 410) {
            await this.removeInvalidSubscription(sub.id);
          }
          console.error(`Failed to send bulk push to subscription ${sub.id}:`, error.message);
        }
      });

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Failed to send bulk push notification:', error);
      throw error;
    }
  }

  /**
   * Register a new push subscription
   */
  async registerSubscription(userId: string, subscription: any): Promise<void> {
    try {
      // Check if subscription already exists
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM push_subscriptions 
        WHERE endpoint = ${subscription.endpoint}
      `;

      if (existing && existing.length > 0) {
        // Update existing subscription
        await prisma.$executeRaw`
          UPDATE push_subscriptions 
          SET user_id = ${userId}::uuid,
              p256dh = ${subscription.keys.p256dh},
              auth = ${subscription.keys.auth},
              updated_at = NOW()
          WHERE endpoint = ${subscription.endpoint}
        `;
      } else {
        // Insert new subscription
        await prisma.$executeRaw`
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
          VALUES (${userId}::uuid, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
        `;
      }

      console.log(`Push subscription registered for user ${userId}`);
    } catch (error) {
      console.error('Failed to register push subscription:', error);
      throw error;
    }
  }

  /**
   * Unregister a push subscription
   */
  async unregisterSubscription(userId: string, endpoint: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM push_subscriptions 
        WHERE user_id = ${userId}::uuid AND endpoint = ${endpoint}
      `;
      console.log(`Push subscription unregistered for user ${userId}`);
    } catch (error) {
      console.error('Failed to unregister push subscription:', error);
      throw error;
    }
  }

  /**
   * Remove invalid subscription (e.g., after 410 Gone error)
   */
  private async removeInvalidSubscription(subscriptionId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM push_subscriptions WHERE id = ${subscriptionId}::uuid
      `;
      console.log(`Removed invalid subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to remove invalid subscription:', error);
    }
  }
}
