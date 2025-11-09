import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * tags:
 *   name: Admin - Notifications
 *   description: Admin endpoints for notification management
 */

router.get('/notifications', controller.getAllNotifications);

router.post(
    '/notifications/broadcast',
    [
        body('userIds').isArray({ min: 1 }),
        body('userIds.*').isUUID(),
        body('type').isIn(['order', 'payment', 'group_buying', 'promotion', 'system', 'wallet']),
        body('title').notEmpty().isString(),
        body('message').notEmpty().isString(),
        body('actionUrl').optional().isURL()
    ],
    controller.sendBroadcast
);

router.post(
    '/notifications/send-all',
    [
        body('type').isIn(['order', 'payment', 'group_buying', 'promotion', 'system', 'wallet']),
        body('title').notEmpty().isString(),
        body('message').notEmpty().isString(),
        body('actionUrl').optional().isURL(),
        body('roleFilter').optional().isIn(['customer', 'seller', 'factory_owner', 'admin'])
    ],
    controller.sendToAll
);

router.get('/notifications/templates', controller.getTemplates);

router.delete(
    '/notifications/bulk',
    [
        body('notificationIds').isArray({ min: 1 }),
        body('notificationIds.*').isUUID()
    ],
    controller.deleteNotifications
);

router.get('/notifications/statistics', controller.getStatistics);

router.put(
    '/notifications/mark-read',
    [
        body('notificationIds').isArray({ min: 1 }),
        body('notificationIds.*').isUUID()
    ],
    controller.markAsReadBulk
);

router.post(
    '/notifications/test',
    [
        body('userId').isUUID(),
        body('type').isIn(['order', 'payment', 'group_buying', 'promotion', 'system', 'wallet']),
        body('title').notEmpty().isString(),
        body('message').notEmpty().isString(),
        body('actionUrl').optional().isURL()
    ],
    controller.sendTestNotification
);

export default router;
