// src/repositories/notification.repository.ts
import { prisma } from '@repo/database';
import { CreateNotificationDTO, NotificationFilters, PaginatedResponse } from '../types';

export class NotificationRepository {
  /**
   * Create a single notification
   */
  async create(data: CreateNotificationDTO) {
    return prisma.notifications.create({
      data: {
        user_id: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        action_url: data.actionUrl,
        related_id: data.relatedId,
        is_read: false,
        is_pushed: false
      }
    });
  }

  /**
   * Create multiple notifications at once (bulk insert)
   */
  async createBulk(notifications: CreateNotificationDTO[]) {
    return prisma.notifications.createMany({
      data: notifications.map(n => ({
        user_id: n.userId,
        type: n.type as any,
        title: n.title,
        message: n.message,
        action_url: n.actionUrl,
        related_id: n.relatedId,
        is_read: false,
        is_pushed: false
      }))
    });
  }

  /**
   * Find notifications by user ID
   */
  async findByUserId(userId: string, unreadOnly = false) {
    return prisma.notifications.findMany({
      where: {
        user_id: userId,
        ...(unreadOnly && { is_read: false })
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 50
    });
  }

  /**
   * Find notifications with pagination and filters
   */
  async findAll(filters: NotificationFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (filters.userId) {
      where.user_id = filters.userId;
    }
    
    if (filters.type) {
      where.type = filters.type;
    }
    
    if (filters.isRead !== undefined) {
      where.is_read = filters.isRead;
    }

    const [data, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.notifications.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notifications.updateMany({
      where: {
        id: notificationId,
        user_id: userId
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });
  }

  /**
   * Mark all user notifications as read
   */
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

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string, userId: string) {
    return prisma.notifications.deleteMany({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
  }

  /**
   * Mark notification as pushed
   */
  async markAsPushed(notificationId: string) {
    return prisma.notifications.update({
      where: { id: notificationId },
      data: { is_pushed: true }
    });
  }

  /**
   * Get user phone number for WhatsApp
   */
  async getUserPhone(userId: string): Promise<string | null> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { phone_number: true }
    });
    return user?.phone_number || null;
  }

  /**
   * Get multiple users' phone numbers
   */
  async getUserPhones(userIds: string[]): Promise<Map<string, string>> {
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phone_number: true }
    });
    
    const phoneMap = new Map<string, string>();
    users.forEach(user => {
      phoneMap.set(user.id, user.phone_number);
    });
    
    return phoneMap;
  }
}