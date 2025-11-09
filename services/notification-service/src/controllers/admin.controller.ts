import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';
import { NotificationRepository } from '../repositories/notification.repository';
import { CreateNotificationDTO } from '../types';

export class AdminController {
    private repository: NotificationRepository;

    constructor() {
        this.repository = new NotificationRepository();
    }

    /**
     * 1. Get all notifications with filtering
     */
    getAllNotifications = async (req: Request, res: Response) => {
        try {
            const result = await this.repository.findAll({
                userId: req.query.userId as string,
                type: req.query.type as any,
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get all notifications error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Send broadcast notification to multiple users
     */
    sendBroadcast = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userIds, type, title, message, actionUrl } = req.body;

            // Create notifications for all users
            const notifications: CreateNotificationDTO[] = userIds.map((userId: string) => ({
                userId,
                type,
                title,
                message,
                actionUrl: actionUrl || null,
                relatedId: null
            }));

            const result = await this.repository.createBulk(notifications);

            res.json({
                success: true,
                message: `Broadcast sent to ${result.count} users`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Send broadcast error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Send notification to all users
     */
    sendToAll = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { type, title, message, actionUrl, roleFilter } = req.body;

            // Get all users (optionally filter by role)
            const where: any = {};
            if (roleFilter) where.role = roleFilter;

            const users = await prisma.users.findMany({
                where,
                select: { id: true }
            });

            // Create notifications for all users
            const notifications: CreateNotificationDTO[] = users.map(user => ({
                userId: user.id,
                type,
                title,
                message,
                actionUrl: actionUrl || null,
                relatedId: null
            }));

            const result = await this.repository.createBulk(notifications);

            res.json({
                success: true,
                message: `Notification sent to all ${result.count} users${roleFilter ? ` with role ${roleFilter}` : ''}`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Send to all users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Get notification templates
     */
    getTemplates = async (req: Request, res: Response) => {
        try {
            // Return predefined notification templates
            const templates = [
                {
                    id: 'order_shipped',
                    type: 'order',
                    title: 'Order Shipped',
                    message: 'Your order #{orderNumber} has been shipped and is on its way!',
                    variables: ['orderNumber', 'trackingNumber']
                },
                {
                    id: 'payment_received',
                    type: 'payment',
                    title: 'Payment Received',
                    message: 'We have received your payment of Rp {amount}. Thank you!',
                    variables: ['amount', 'paymentCode']
                },
                {
                    id: 'group_buying_success',
                    type: 'group_buying',
                    title: 'Group Buying Successful',
                    message: 'Great news! The group buying session for {productName} has reached the minimum order quantity.',
                    variables: ['productName', 'sessionCode']
                },
                {
                    id: 'group_buying_failed',
                    type: 'group_buying',
                    title: 'Group Buying Ended',
                    message: 'Unfortunately, the group buying session for {productName} did not reach the minimum order quantity. Your payment will be refunded.',
                    variables: ['productName', 'sessionCode', 'refundAmount']
                },
                {
                    id: 'wallet_credited',
                    type: 'wallet',
                    title: 'Wallet Credited',
                    message: 'Your wallet has been credited with Rp {amount}. New balance: Rp {newBalance}',
                    variables: ['amount', 'newBalance', 'reason']
                },
                {
                    id: 'promotion',
                    type: 'promotion',
                    title: 'Special Offer',
                    message: '{message}',
                    variables: ['message', 'promoCode', 'expiryDate']
                }
            ];

            res.json({
                success: true,
                data: templates
            });
        } catch (error: any) {
            console.error('Get templates error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Delete notifications (bulk)
     */
    deleteNotifications = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { notificationIds } = req.body;

            const result = await prisma.notifications.deleteMany({
                where: {
                    id: { in: notificationIds }
                }
            });

            res.json({
                success: true,
                message: `Deleted ${result.count} notifications`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Delete notifications error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Get notification statistics
     */
    getStatistics = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            const where: any = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [
                totalNotifications,
                unreadCount,
                readCount,
                typeBreakdown
            ] = await Promise.all([
                prisma.notifications.count({ where }),
                prisma.notifications.count({ where: { ...where, is_read: false } }),
                prisma.notifications.count({ where: { ...where, is_read: true } }),
                prisma.notifications.groupBy({
                    by: ['type'],
                    where,
                    _count: true
                })
            ]);

            const notificationsByType: Record<string, number> = {};
            typeBreakdown.forEach(item => {
                notificationsByType[item.type] = item._count;
            });

            const stats = {
                totalNotifications,
                unreadCount,
                readCount,
                readRate: totalNotifications > 0 ? (readCount / totalNotifications) * 100 : 0,
                notificationsByType
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            console.error('Get notification statistics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 7. Mark notifications as read (bulk)
     */
    markAsReadBulk = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { notificationIds } = req.body;

            const result = await prisma.notifications.updateMany({
                where: {
                    id: { in: notificationIds }
                },
                data: {
                    is_read: true,
                    read_at: new Date()
                }
            });

            res.json({
                success: true,
                message: `Marked ${result.count} notifications as read`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Mark as read bulk error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 8. Send test notification
     */
    sendTestNotification = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userId, type, title, message, actionUrl } = req.body;

            const notification = await this.repository.create({
                userId,
                type,
                title,
                message,
                actionUrl,
                relatedId: null
            });

            res.json({
                success: true,
                message: 'Test notification sent',
                data: notification
            });
        } catch (error: any) {
            console.error('Send test notification error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
