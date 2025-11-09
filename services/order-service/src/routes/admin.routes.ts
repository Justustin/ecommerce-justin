import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * tags:
 *   name: Admin - Orders
 *   description: Admin endpoints for order management
 */

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders with filtering
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: isGroupBuying
 *         schema:
 *           type: boolean
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
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Orders retrieved successfully
 */
router.get('/orders', controller.getAllOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details retrieved
 *       404:
 *         description: Order not found
 */
router.get(
    '/orders/:id',
    [param('id').isUUID()],
    controller.getOrderById
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Force update order status
 *     tags: [Admin - Orders]
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
 *               - newStatus
 *             properties:
 *               newStatus:
 *                 type: string
 *                 enum: [pending_payment, paid, processing, ready_for_pickup, picked_up, in_transit, delivered, cancelled, refunded, failed]
 *               estimatedDeliveryDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.put(
    '/orders/:id/status',
    [
        param('id').isUUID(),
        body('newStatus').isIn([
            'pending_payment',
            'paid',
            'processing',
            'ready_for_pickup',
            'picked_up',
            'in_transit',
            'delivered',
            'cancelled',
            'refunded',
            'failed'
        ]),
        body('estimatedDeliveryDate').optional().isISO8601(),
        body('notes').optional().isString()
    ],
    controller.updateOrderStatus
);

/**
 * @swagger
 * /api/admin/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order (admin force cancel)
 *     tags: [Admin - Orders]
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
 *         description: Order cancelled
 */
router.post(
    '/orders/:id/cancel',
    [
        param('id').isUUID(),
        body('reason').optional().isString()
    ],
    controller.cancelOrder
);

/**
 * @swagger
 * /api/admin/orders/{id}/shipping:
 *   put:
 *     summary: Update shipping details
 *     tags: [Admin - Orders]
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
 *               shippingCost:
 *                 type: number
 *               taxAmount:
 *                 type: number
 *               selectedCourier:
 *                 type: string
 *               selectedCourierService:
 *                 type: string
 *               estimatedDeliveryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Shipping details updated
 */
router.put(
    '/orders/:id/shipping',
    [
        param('id').isUUID(),
        body('shippingCost').optional().isNumeric(),
        body('taxAmount').optional().isNumeric(),
        body('selectedCourier').optional().isString(),
        body('selectedCourierService').optional().isString(),
        body('estimatedDeliveryDate').optional().isISO8601()
    ],
    controller.updateShippingDetails
);

/**
 * @swagger
 * /api/admin/orders/{id}/address:
 *   put:
 *     summary: Update order shipping address
 *     tags: [Admin - Orders]
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
 *               shippingName:
 *                 type: string
 *               shippingPhone:
 *                 type: string
 *               shippingProvince:
 *                 type: string
 *               shippingCity:
 *                 type: string
 *               shippingDistrict:
 *                 type: string
 *               shippingPostalCode:
 *                 type: string
 *               shippingAddress:
 *                 type: string
 *               shippingNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order address updated
 */
router.put(
    '/orders/:id/address',
    [
        param('id').isUUID(),
        body('shippingName').optional().isString(),
        body('shippingPhone').optional().isString(),
        body('shippingProvince').optional().isString(),
        body('shippingCity').optional().isString(),
        body('shippingDistrict').optional().isString(),
        body('shippingPostalCode').optional().isString(),
        body('shippingAddress').optional().isString(),
        body('shippingNotes').optional().isString()
    ],
    controller.updateOrderAddress
);

/**
 * @swagger
 * /api/admin/orders/bulk/status:
 *   put:
 *     summary: Bulk update order statuses
 *     tags: [Admin - Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - newStatus
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newStatus:
 *                 type: string
 *                 enum: [pending_payment, paid, processing, ready_for_pickup, picked_up, in_transit, delivered, cancelled, refunded, failed]
 *     responses:
 *       200:
 *         description: Orders updated
 */
router.put(
    '/orders/bulk/status',
    [
        body('orderIds').isArray({ min: 1 }),
        body('orderIds.*').isUUID(),
        body('newStatus').isIn([
            'pending_payment',
            'paid',
            'processing',
            'ready_for_pickup',
            'picked_up',
            'in_transit',
            'delivered',
            'cancelled',
            'refunded',
            'failed'
        ])
    ],
    controller.bulkUpdateStatus
);

/**
 * @swagger
 * /api/admin/orders/analytics:
 *   get:
 *     summary: Get order analytics and statistics
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
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
 *     responses:
 *       200:
 *         description: Analytics retrieved
 */
router.get('/orders/analytics', controller.getOrderAnalytics);

/**
 * @swagger
 * /api/admin/orders/factory/{factoryId}:
 *   get:
 *     summary: Get orders by factory
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: factoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: Orders retrieved
 */
router.get(
    '/orders/factory/:factoryId',
    [param('factoryId').isUUID()],
    controller.getOrdersByFactory
);

/**
 * @swagger
 * /api/admin/orders/reports/revenue:
 *   get:
 *     summary: Get revenue report
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Revenue report generated
 */
router.get('/orders/reports/revenue', controller.getRevenueReport);

/**
 * @swagger
 * /api/admin/orders/export:
 *   get:
 *     summary: Export orders (JSON or CSV)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
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
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Orders exported
 */
router.get('/orders/export', controller.exportOrders);

export default router;
