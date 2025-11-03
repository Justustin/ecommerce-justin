import { prisma } from '@repo/database';
import { CreateNotificationDTO } from '../types';

export class NotificationService {
  async createNotification(data: CreateNotificationDTO) {
    const notification = await prisma.notifications.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        action_url: data.actionUrl,
        related_id: data.relatedId
      }
    });

    // TODO: Send push notification if enabled
    // TODO: Send email notification if enabled

    return notification;
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.notifications.count({
      where: { user_id: userId }
    });

    const unreadCount = await prisma.notifications.count({
      where: { user_id: userId, is_read: false }
    });

    return {
      notifications,
      total,
      unreadCount
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notifications.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notifications.delete({
      where: { id: notificationId }
    });
  }
}
