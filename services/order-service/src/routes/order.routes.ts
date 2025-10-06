// services/order-service/src/routes/order.routes.ts

import { Router } from 'express';
import { body, param } from 'express-validator';
import { OrderController } from '../controllers/order.controller';

const router = Router();
const controller = new OrderController();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order(s) - splits by factory if multi-vendor cart
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, items, shippingAddress]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *               groupSessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - for group buying orders
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 2
 *               shippingAddress:
 *                 type: object
 *                 required: [name, phone, province, city, district, address]
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: John Doe
 *                   phone:
 *                     type: string
 *                     example: "081234567890"
 *                   province:
 *                     type: string
 *                     example: DKI Jakarta
 *                   city:
 *                     type: string
 *                     example: Jakarta Pusat
 *                   district:
 *                     type: string
 *                     example: Menteng
 *                   postalCode:
 *                     type: string
 *                     example: "10310"
 *                   address:
 *                     type: string
 *                     example: Jl. Sudirman No. 123
 *               shippingNotes:
 *                 type: string
 *                 example: Please call before delivery
 *               discountAmount:
 *                 type: number
 *                 example: 10000
 *     responses:
 *       201:
 *         description: Order(s) created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 ordersCreated:
 *                   type: integer
 *                   example: 2
 *                 message:
 *                   type: string
 *                   example: Created 2 orders (items from 2 factories)
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad request
 */
router.post('/', [
  body('userId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('shippingAddress.name').notEmpty(),
  body('shippingAddress.phone').notEmpty(),
  body('shippingAddress.address').notEmpty(),
  body('shippingAddress.city').notEmpty(),
  body('shippingAddress.province').notEmpty(),
  body('shippingAddress.district').notEmpty()
], controller.createOrder);

/**
 * @swagger
 * /api/orders/bulk:
 *   post:
 *     summary: Create bulk orders from group session (internal use by group-buying-service)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupSessionId, participants]
 *             properties:
 *               groupSessionId:
 *                 type: string
 *                 format: uuid
 *               participants:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [userId, participantId, productId, quantity, unitPrice]
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     participantId:
 *                       type: string
 *                       format: uuid
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     unitPrice:
 *                       type: number
 *                       example: 135000
 *     responses:
 *       201:
 *         description: Bulk orders created successfully
 *       400:
 *         description: Bad request
 */
router.post('/bulk', [
  body('groupSessionId').isUUID(),
  body('participants').isArray({ min: 1 })
], controller.createBulkOrders);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with filters
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by factory ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending_payment, paid, processing, ready_for_pickup, picked_up, in_transit, delivered, cancelled, refunded, failed]
 *         description: Filter by order status
 *       - in: query
 *         name: isGroupBuying
 *         schema:
 *           type: boolean
 *         description: Filter group buying orders (true) or direct orders (false)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order number or recipient name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *     responses:
 *       200:
 *         description: List of orders with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', controller.getOrders);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                     totalRevenue:
 *                       type: number
 *                     averageOrderValue:
 *                       type: number
 *                     ordersByStatus:
 *                       type: object
 */
router.get('/stats', controller.getOrderStats);

/**
 * @swagger
 * /api/orders/user/{userId}:
 *   get:
 *     summary: Get all orders for a specific user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: User's orders with pagination
 */
router.get('/user/:userId', [
  param('userId').isUUID()
], controller.getUserOrders);

/**
 * @swagger
 * /api/orders/factory/{factoryId}:
 *   get:
 *     summary: Get all orders for a specific factory
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: factoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Factory's orders with pagination
 */
router.get('/factory/:factoryId', [
  param('factoryId').isUUID()
], controller.getFactoryOrders);

/**
 * @swagger
 * /api/orders/number/{orderNumber}:
 *   get:
 *     summary: Get order by order number
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *         example: ORD-20251005-A7B3C
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/number/:orderNumber', controller.getOrderByNumber);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details with items, user, and factory info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Order not found
 */
router.get('/:id', [
  param('id').isUUID()
], controller.getOrder);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newStatus]
 *             properties:
 *               newStatus:
 *                 type: string
 *                 enum: [pending_payment, paid, processing, ready_for_pickup, picked_up, in_transit, delivered, cancelled, refunded, failed]
 *                 example: paid
 *               estimatedDeliveryDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-10"
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status transition
 */
router.put('/:id/status', [
  param('id').isUUID(),
  body('newStatus').isIn([
    'pending_payment', 'paid', 'processing', 'ready_for_pickup',
    'picked_up', 'in_transit', 'delivered', 'cancelled',
    'refunded', 'failed'
  ])
], controller.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}/shipping-cost:
 *   put:
 *     summary: Update shipping cost and tax
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippingCost]
 *             properties:
 *               shippingCost:
 *                 type: number
 *                 minimum: 0
 *                 example: 15000
 *               taxAmount:
 *                 type: number
 *                 minimum: 0
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Shipping cost updated
 *       400:
 *         description: Bad request
 */
router.put('/:id/shipping-cost', [
  param('id').isUUID(),
  body('shippingCost').isFloat({ min: 0 })
], controller.updateShippingCost);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID for authorization
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Cannot cancel order in current status
 */
router.post('/:id/cancel', [
  param('id').isUUID()
], controller.cancelOrder);

export default router;