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
 *     description: |
 *       Calculate shipping costs from various courier services (JNE, J&T, SiCepat, etc.) via Biteship API.
 *
 *       **SUPPORTS TWO MODES:**
 *
 *       **Mode 1: Post-Order (for existing orders)**
 *       - Pass `orderId` to calculate rates from existing order data
 *       - Order must exist in database with shipping address
 *
 *       **Mode 2: Pre-Order (for GROUP BUYING / cart checkout)**
 *       - Pass `productId`, `variantId` (optional), `quantity`, `userId`
 *       - Fetches product weight/dimensions from database
 *       - Gets factory address as origin
 *       - Gets user's default shipping address as destination
 *       - Calculates real shipping cost WITHOUT creating order
 *
 *       **Use Mode 2 for group buying to get shipping cost BEFORE payment!**
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/GetRatesPostOrder'
 *               - $ref: '#/components/schemas/GetRatesPreOrder'
 *           examples:
 *             postOrder:
 *               summary: Post-Order Mode (with existing orderId)
 *               value:
 *                 orderId: "550e8400-e29b-41d4-a716-446655440000"
 *                 couriers: "jne,jnt,sicepat"
 *             preOrderGroupBuying:
 *               summary: Pre-Order Mode (GROUP BUYING - no order yet)
 *               value:
 *                 productId: "650e8400-e29b-41d4-a716-446655440000"
 *                 variantId: "750e8400-e29b-41d4-a716-446655440000"
 *                 quantity: 10
 *                 userId: "450e8400-e29b-41d4-a716-446655440000"
 *                 couriers: "jne,jnt,sicepat"
 *             preOrderWithManualAddress:
 *               summary: Pre-Order Mode (manual postal codes)
 *               value:
 *                 productId: "650e8400-e29b-41d4-a716-446655440000"
 *                 quantity: 5
 *                 originPostalCode: 12345
 *                 destinationPostalCode: 54321
 *                 couriers: "jne,jnt,sicepat,anteraja"
 *     responses:
 *       200:
 *         description: Shipping rates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatesResponse'
 *             example:
 *               success: true
 *               data:
 *                 success: true
 *                 object: "courier_pricing"
 *                 message: "Success"
 *                 code: 200
 *                 origin:
 *                   postal_code: 12345
 *                   location_name: "Jakarta Pusat"
 *                 destination:
 *                   postal_code: 54321
 *                   location_name: "Surabaya"
 *                 pricing:
 *                   - courier_name: "JNE"
 *                     courier_service_name: "REG"
 *                     price: 15000
 *                     duration: "2-3 days"
 *                   - courier_name: "J&T Express"
 *                     courier_service_name: "EZ"
 *                     price: 12000
 *                     duration: "3-5 days"
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Destination postal code is required. Provide either orderId, userId with default address, or destinationPostalCode directly."
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

/**
 * @openapi
 * components:
 *   schemas:
 *     GetRatesPostOrder:
 *       type: object
 *       description: Post-Order Mode - Calculate rates from existing order
 *       required:
 *         - orderId
 *       properties:
 *         orderId:
 *           type: string
 *           format: uuid
 *           description: Existing order UUID
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         couriers:
 *           type: string
 *           description: Comma-separated list of courier codes
 *           example: "jne,jnt,sicepat,anteraja"
 *           default: "jne,jnt,sicepat,anteraja"
 *
 *     GetRatesPreOrder:
 *       type: object
 *       description: Pre-Order Mode - Calculate rates for GROUP BUYING (before order exists)
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *           description: Product UUID
 *           example: "650e8400-e29b-41d4-a716-446655440000"
 *         variantId:
 *           type: string
 *           format: uuid
 *           description: Product variant UUID (optional)
 *           example: "750e8400-e29b-41d4-a716-446655440000"
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of items
 *           example: 10
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User UUID (to get default shipping address)
 *           example: "450e8400-e29b-41d4-a716-446655440000"
 *         originPostalCode:
 *           type: integer
 *           description: Origin postal code (optional - auto-fetched from factory)
 *           example: 12345
 *         originLatitude:
 *           type: number
 *           description: Origin GPS latitude
 *           example: -6.2088
 *         originLongitude:
 *           type: number
 *           description: Origin GPS longitude
 *           example: 106.8456
 *         destinationPostalCode:
 *           type: integer
 *           description: Destination postal code (optional - auto-fetched from user address)
 *           example: 54321
 *         destinationLatitude:
 *           type: number
 *           description: Destination GPS latitude
 *           example: -7.2575
 *         destinationLongitude:
 *           type: number
 *           description: Destination GPS longitude
 *           example: 112.7521
 *         couriers:
 *           type: string
 *           description: Comma-separated list of courier codes
 *           example: "jne,jnt,sicepat"
 *           default: "jne,jnt,sicepat,anteraja"
 *
 *     RatesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             object:
 *               type: string
 *               example: "courier_pricing"
 *             message:
 *               type: string
 *               example: "Success"
 *             code:
 *               type: integer
 *               example: 200
 *             origin:
 *               type: object
 *               properties:
 *                 postal_code:
 *                   type: integer
 *                   example: 12345
 *                 location_name:
 *                   type: string
 *                   example: "Jakarta Pusat"
 *             destination:
 *               type: object
 *               properties:
 *                 postal_code:
 *                   type: integer
 *                   example: 54321
 *                 location_name:
 *                   type: string
 *                   example: "Surabaya"
 *             pricing:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   courier_name:
 *                     type: string
 *                     example: "JNE"
 *                   courier_code:
 *                     type: string
 *                     example: "jne"
 *                   courier_service_name:
 *                     type: string
 *                     example: "REG"
 *                   courier_service_code:
 *                     type: string
 *                     example: "reg"
 *                   description:
 *                     type: string
 *                     example: "Regular Service"
 *                   duration:
 *                     type: string
 *                     example: "2-3 days"
 *                   price:
 *                     type: number
 *                     example: 15000
 *                   available_for_cash_on_delivery:
 *                     type: boolean
 *                     example: false
 *                   available_for_proof_of_delivery:
 *                     type: boolean
 *                     example: true
 *                   available_for_instant_waybill_id:
 *                     type: boolean
 *                     example: true
 *                   available_for_insurance:
 *                     type: boolean
 *                     example: true
 *                   company:
 *                     type: string
 *                     example: "jne"
 *                   type:
 *                     type: string
 *                     example: "reg"
 *
 *     CreateShipmentRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - courierCompany
 *         - courierType
 *       properties:
 *         orderId:
 *           type: string
 *           format: uuid
 *           description: Order UUID
 *         courierCompany:
 *           type: string
 *           description: Courier company code (from rates API)
 *           example: "jne"
 *         courierType:
 *           type: string
 *           description: Courier service type (from rates API)
 *           example: "reg"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Error message here"
 *
 *     Shipment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         order_id:
 *           type: string
 *           format: uuid
 *         tracking_number:
 *           type: string
 *           example: "JNE12345678901"
 *         status:
 *           type: string
 *           enum: [pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned]
 *         courier_service:
 *           type: string
 *           example: "jne"
 *         shipping_cost:
 *           type: number
 *           example: 15000
 *         created_at:
 *           type: string
 *           format: date-time
 */

export default router;