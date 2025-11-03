import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  private service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  createNotification = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await this.service.createNotification(req.body);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification
      });
    } catch (error: any) {
      console.error('Failed to create notification:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getUserNotifications = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await this.service.getUserNotifications(userId, limit, offset);

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          total: result.total,
          unreadCount: result.unreadCount,
          limit,
          offset
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  markAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const notification = await this.service.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  markAllAsRead = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      await this.service.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  deleteNotification = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      await this.service.deleteNotification(id, userId);

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}
