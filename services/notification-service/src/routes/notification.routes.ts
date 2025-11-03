import { Router } from 'express';
import { body, param } from 'express-validator';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();
const controller = new NotificationController();

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (called by other services)
 * @access  Internal
 */
router.post(
  '/',
  [
    body('userId').isUUID().withMessage('Invalid user ID'),
    body('type').isString().withMessage('Type is required'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('actionUrl').optional().isString(),
    body('relatedId').optional().isUUID()
  ],
  controller.createNotification
);

/**
 * @route   GET /api/notifications/user/:userId
 * @desc    Get user notifications with pagination
 * @access  Private
 */
router.get(
  '/user/:userId',
  [param('userId').isUUID()],
  controller.getUserNotifications
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  [
    param('id').isUUID(),
    body('userId').isUUID().withMessage('Invalid user ID')
  ],
  controller.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch(
  '/read-all',
  [body('userId').isUUID().withMessage('Invalid user ID')],
  controller.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  '/:id',
  [
    param('id').isUUID(),
    body('userId').isUUID().withMessage('Invalid user ID')
  ],
  controller.deleteNotification
);

export default router;
