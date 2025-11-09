import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * tags:
 *   name: Admin - Logistics
 *   description: Admin endpoints for shipment management
 */

/**
 * @swagger
 * /api/admin/shipments:
 *   get:
 *     summary: Get all shipments with filtering
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *       - in: query
 *         name: pickupTaskId
 *         schema:
 *           type: string
 *       - in: query
 *         name: courierService
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, picked_up, in_transit, delivered, failed, cancelled, returned]
 *       - in: query
 *         name: trackingNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 */
router.get('/shipments', controller.getAllShipments);

/**
 * @swagger
 * /api/admin/shipments/{id}:
 *   get:
 *     summary: Get shipment details by ID
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment details retrieved
 *       404:
 *         description: Shipment not found
 */
router.get(
    '/shipments/:id',
    [param('id').isUUID()],
    controller.getShipmentById
);

/**
 * @swagger
 * /api/admin/shipments/{id}/status:
 *   put:
 *     summary: Force update shipment status
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, picked_up, in_transit, delivered, failed, cancelled, returned]
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               deliveryPhotoUrl:
 *                 type: string
 *               recipientSignatureUrl:
 *                 type: string
 *               receivedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment status updated
 */
router.put(
    '/shipments/:id/status',
    [
        param('id').isUUID(),
        body('status').isIn(['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled', 'returned']),
        body('description').optional().isString(),
        body('location').optional().isString(),
        body('deliveryPhotoUrl').optional().isURL(),
        body('recipientSignatureUrl').optional().isURL(),
        body('receivedBy').optional().isString()
    ],
    controller.updateShipmentStatus
);

/**
 * @swagger
 * /api/admin/shipments/{id}/cancel:
 *   post:
 *     summary: Cancel shipment
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment cancelled
 */
router.post(
    '/shipments/:id/cancel',
    [
        param('id').isUUID(),
        body('reason').optional().isString()
    ],
    controller.cancelShipment
);

/**
 * @swagger
 * /api/admin/shipments/{id}/tracking:
 *   get:
 *     summary: Get shipment tracking history
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking history retrieved
 */
router.get(
    '/shipments/:id/tracking',
    [param('id').isUUID()],
    controller.getTrackingHistory
);

/**
 * @swagger
 * /api/admin/shipments/{id}/tracking/events:
 *   post:
 *     summary: Add tracking event manually
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - description
 *             properties:
 *               status:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               eventTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Tracking event added
 */
router.post(
    '/shipments/:id/tracking/events',
    [
        param('id').isUUID(),
        body('status').notEmpty().isString(),
        body('description').notEmpty().isString(),
        body('location').optional().isString(),
        body('eventTime').optional().isISO8601()
    ],
    controller.addTrackingEvent
);

/**
 * @swagger
 * /api/admin/shipments/analytics:
 *   get:
 *     summary: Get shipments analytics
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: courierService
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics retrieved
 */
router.get('/shipments/analytics', controller.getShipmentsAnalytics);

/**
 * @swagger
 * /api/admin/shipments/bulk/status:
 *   put:
 *     summary: Bulk update shipment statuses
 *     tags: [Admin - Logistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentIds
 *               - status
 *             properties:
 *               shipmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [pending, picked_up, in_transit, delivered, failed, cancelled, returned]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipments updated
 */
router.put(
    '/shipments/bulk/status',
    [
        body('shipmentIds').isArray({ min: 1 }),
        body('shipmentIds.*').isUUID(),
        body('status').isIn(['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled', 'returned']),
        body('description').optional().isString()
    ],
    controller.bulkUpdateStatus
);

/**
 * @swagger
 * /api/admin/shipments/problems:
 *   get:
 *     summary: Get problem shipments (delayed, failed, etc.)
 *     tags: [Admin - Logistics]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Problem shipments retrieved
 */
router.get('/shipments/problems', controller.getProblemShipments);

export default router;
