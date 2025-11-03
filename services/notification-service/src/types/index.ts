import { notification_type } from '@repo/database';

export interface CreateNotificationDTO {
  userId: string;
  type: notification_type;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedId?: string | null;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: notification_type;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedId?: string | null;
  isRead: boolean;
  isPushed: boolean;
  readAt?: Date | null;
  createdAt: Date;
}
