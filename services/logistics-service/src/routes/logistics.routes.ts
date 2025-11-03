import { Router } from 'express';
import * as controller from '../controllers/logistics.controller';

const router = Router();

/**
 * @openapi
 * /api/rates:
 *   post:
 *     tags:
 *       - Rates
 *     summary: Get shipping rates from multiple couriers
 *     description: Calculate shipping costs from various courier services (JNE, J&T, SiCepat, etc.) via Biteship API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetRatesRequest'
 *     responses:
 *       200:
 *         description: Shipping rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatesResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/rates', controller.getShippingRates);

/**
 * @openapi
 * /api/shipments:
 *   post:
 *     tags:
 *       - Shipments
 *     summary: Create a new shipment
 *     description: Create a shipment order via Biteship API and generate shipping label
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShipmentRequest'
 *     responses:
 *       201:
 *         description: Shipment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateShipmentResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/shipments', controller.createShipment);

/**
 * @openapi
 * /api/shipments/status:
 *   post:
 *     tags:
 *       - Shipments
 *     summary: Update shipment status
 *     description: Manually update shipment status and create tracking event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Shipment'
 *                 message:
 *                   type: string
 *                   example: Shipment status updated
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/shipments/status', controller.updateShipmentStatus);

/**
 * @openapi
 * /api/shipments/track/{trackingNumber}:
 *   get:
 *     tags:
 *       - Tracking
 *     summary: Track shipment by tracking number
 *     description: Get real-time tracking information from Biteship API
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracking number (waybill ID)
 *         example: JNE12345678901
 *     responses:
 *       200:
 *         description: Tracking information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackingResponse'
 *       404:
 *         description: Shipment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/shipments/track/:trackingNumber', controller.trackShipment);

/**
 * @openapi
 * /api/shipments/order/{orderId}:
 *   get:
 *     tags:
 *       - Shipments
 *     summary: Get shipment by order ID
 *     description: Retrieve shipment details for a specific order
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order UUID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Shipment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Shipment'
 *       404:
 *         description: Shipment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/shipments/order/:orderId', controller.getShipmentByOrderId);

/**
 * @openapi
 * /api/shipments:
 *   get:
 *     tags:
 *       - Shipments
 *     summary: Get all shipments with filters
 *     description: Retrieve paginated list of shipments with optional filtering
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by order ID
 *       - in: query
 *         name: pickupTaskId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by pickup task ID
 *       - in: query
 *         name: courierService
 *         schema:
 *           type: string
 *         description: Filter by courier service
 *         example: jne
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned]
 *         description: Filter by shipment status
 *       - in: query
 *         name: trackingNumber
 *         schema:
 *           type: string
 *         description: Search by tracking number
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
 *     responses:
 *       200:
 *         description: Shipments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shipment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/shipments', controller.getShipments);

/**
 * @openapi
 * /api/webhooks/biteship:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Biteship webhook endpoint
 *     description: Receive tracking updates from Biteship courier service
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Biteship webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Webhook processed successfully
 *       500:
 *         description: Webhook processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/webhooks/biteship', controller.handleBiteshipWebhook);


export default router;