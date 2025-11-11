import { Router } from 'express';
import { body, param } from 'express-validator';
import { GroupBuyingController } from '../controllers/group-buying.controller';
import { group_status } from '@repo/database';

const router = Router();
const controller = new GroupBuyingController();

/**
 * @swagger
 * /api/group-buying:
 *   post:
 *     tags: [Group Buying Sessions]
 *     summary: Create a new group buying session with tiered pricing
 *     description: |
 *       Create a group buying session with dynamic pricing based on MOQ fill percentage.
 *
 *       **Tiering System:**
 *       - Tier 25% → Price when 25% of real users join (highest price)
 *       - Tier 50% → Price when 50% of real users join
 *       - Tier 75% → Price when 75% of real users join
 *       - Tier 100% → Price when 100% of real users join (lowest price)
 *
 *       **Bot Auto-Join:** A bot automatically joins with 25% MOQ to ensure minimum fill.
 *
 *       **Note:** groupPrice is used as the initial price (typically same as priceTier25).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - factoryId
 *               - targetMoq
 *               - groupPrice
 *               - endTime
 *               - priceTier25
 *               - priceTier50
 *               - priceTier75
 *               - priceTier100
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: Product UUID
 *               factoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Factory UUID
 *               sessionCode:
 *                 type: string
 *                 maxLength: 20
 *                 description: Optional custom session code (auto-generated if not provided)
 *               targetMoq:
 *                 type: integer
 *                 minimum: 2
 *                 description: Minimum order quantity required
 *               groupPrice:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Starting price (typically same as priceTier25)
 *               priceTier25:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Price when 25% of MOQ is filled by real users (highest)
 *               priceTier50:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Price when 50% of MOQ is filled by real users
 *               priceTier75:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Price when 75% of MOQ is filled by real users
 *               priceTier100:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Price when 100% of MOQ is filled by real users (lowest)
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: Session expiry time
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Estimated production completion date
 *             example:
 *               productId: "550e8400-e29b-41d4-a716-446655440000"
 *               factoryId: "550e8400-e29b-41d4-a716-446655440001"
 *               sessionCode: "GROUP2025"
 *               targetMoq: 100
 *               groupPrice: 150000
 *               priceTier25: 150000
 *               priceTier50: 135000
 *               priceTier75: 120000
 *               priceTier100: 105000
 *               endTime: "2025-12-31T23:59:59.000Z"
 *               estimatedCompletionDate: "2026-01-15T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Session created successfully with bot auto-joined
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Group buying session created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/GroupBuyingSession'
 *       400:
 *         description: Bad request (e.g., invalid data, tier prices not descending)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Tier prices must be in descending order (tier25 >= tier50 >= tier75 >= tier100)"
 */
router.post(
  '/',
  [
    param('id').optional().isUUID(), // Not used here but included for consistency
    body('productId').isUUID().withMessage('Invalid product ID'),
    body('factoryId').isUUID().withMessage('Invalid factory ID'),
    body('targetMoq').isInt({ min: 2 }).withMessage('Target MOQ must be at least 2'),
    body('groupPrice').isFloat({ min: 0.01 }).withMessage('Group price must be greater than 0'),
    body('priceTier25').isFloat({ min: 0.01 }).withMessage('Price tier 25% must be greater than 0'),
    body('priceTier50').isFloat({ min: 0.01 }).withMessage('Price tier 50% must be greater than 0'),
    body('priceTier75').isFloat({ min: 0.01 }).withMessage('Price tier 75% must be greater than 0'),
    body('priceTier100').isFloat({ min: 0.01 }).withMessage('Price tier 100% must be greater than 0'),
    body('endTime').isISO8601().withMessage('Invalid end time format'),
    body('sessionCode').optional().isLength({ min: 1, max: 20 }).withMessage('Session code must be 1-20 characters'),
    body('estimatedCompletionDate').optional().isISO8601().withMessage('Invalid estimated completion date format'),
  ],
  controller.createSession
);

/**
 * @swagger
 * /api/group-buying:
 *   get:
 *     tags: [Group Buying Sessions]
 *     summary: List all group buying sessions
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [forming, moq_reached, success, failed, cancelled]
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of sessions with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GroupBuyingSession'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       400:
 *         description: Bad request (e.g., invalid query parameters)
 */
router.get('/', controller.listSessions);

/**
 * @swagger
 * /api/group-buying/{id}:
 *   get:
 *     tags: [Group Buying Sessions]
 *     summary: Get session by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupBuyingSession'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/:id', [param('id').isUUID()], controller.getSessionById);

/**
 * @swagger
 * /api/group-buying/code/{code}:
 *   get:
 *     tags: [Group Buying Sessions]
 *     summary: Get session by code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupBuyingSession'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/code/:code', controller.getSessionByCode);

/**
 * @swagger
 * /api/group-buying/{id}:
 *   patch:
 *     tags: [Group Buying Sessions]
 *     summary: Update session details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               groupPrice:
 *                 type: number
 *                 minimum: 0.01
 *               status:
 *                 type: string
 *                 enum: [forming, moq_reached, success, failed, cancelled]
 *               targetMoq:
 *                 type: integer
 *                 minimum: 2
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *             example:
 *               endTime: "2025-10-07T19:00:00.000Z"
 *               groupPrice: 100000
 *               status: "forming"
 *               targetMoq: 120
 *               estimatedCompletionDate: "2025-10-15T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Session updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/GroupBuyingSession'
 *       400:
 *         description: Bad request (e.g., invalid data, past endTime, or session not in forming status)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('endTime').optional().isISO8601().withMessage('Invalid end time format'),
    body('groupPrice').optional().isFloat({ min: 0.01 }).withMessage('Group price must be greater than 0'),
    body('targetMoq').optional().isInt({ min: 2 }).withMessage('Target MOQ must be at least 2'), // Updated to match service
    body('estimatedCompletionDate').optional().isISO8601().withMessage('Invalid estimated completion date format'),
    body('status').optional().isIn(Object.values(group_status)).withMessage('Invalid status value'),
  ],
  controller.updateSession
);

/**
 * @swagger
 * /api/group-buying/{id}/shipping-options:
 *   get:
 *     tags: [Participants]
 *     summary: Get shipping options grouped by delivery speed
 *     description: |
 *       Call this BEFORE joining session to show user shipping choices.
 *       Returns 3 shipping speed categories: same day, express (1-2 days), regular (2-3+ days).
 *       Each category shows the cheapest courier option.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Group session ID
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (to fetch default shipping address)
 *       - in: query
 *         name: quantity
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Quantity user wants to order
 *       - in: query
 *         name: variantId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product variant ID (optional)
 *     responses:
 *       200:
 *         description: Shipping options grouped by speed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sameDay:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         courier_name:
 *                           type: string
 *                         courier_service_name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         duration:
 *                           type: string
 *                     express:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         courier_name:
 *                           type: string
 *                         courier_service_name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         duration:
 *                           type: string
 *                     regular:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         courier_name:
 *                           type: string
 *                         courier_service_name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         duration:
 *                           type: string
 *                     productPrice:
 *                       type: number
 *                       description: Product price for this quantity
 *                     gatewayFeePercentage:
 *                       type: number
 *                       description: Payment gateway fee percentage
 *             example:
 *               message: "Shipping options retrieved successfully"
 *               data:
 *                 sameDay: null
 *                 express:
 *                   courier_name: "JNE"
 *                   courier_service_name: "YES"
 *                   price: 25000
 *                   duration: "1-2 days"
 *                 regular:
 *                   courier_name: "SiCepat"
 *                   courier_service_name: "REG"
 *                   price: 15000
 *                   duration: "2-3 days"
 *                 productPrice: 500000
 *                 gatewayFeePercentage: 3
 *       400:
 *         description: Bad request (missing parameters or shipping unavailable)
 */
router.get('/:id/shipping-options', controller.getShippingOptions);

/**
 * @swagger
 * /api/group-buying/{id}/join:
 *   post:
 *     tags: [Participants]
 *     summary: Join a group buying session with selected shipping
 *     description: |
 *       User must have called /shipping-options first to get available options.
 *       selectedShipping must match one of the options returned by /shipping-options.
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
 *             required:
 *               - userId
 *               - quantity
 *               - unitPrice
 *               - totalPrice
 *               - selectedShipping
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               variantId:
 *                 type: string
 *                 format: uuid
 *               unitPrice:
 *                 type: number
 *                 minimum: 0.01
 *               totalPrice:
 *                 type: number
 *                 minimum: 0.01
 *               selectedShipping:
 *                 type: object
 *                 required:
 *                   - type
 *                   - courierName
 *                   - courierService
 *                   - price
 *                   - duration
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [sameDay, express, regular]
 *                   courierName:
 *                     type: string
 *                   courierService:
 *                     type: string
 *                   price:
 *                     type: number
 *                   duration:
 *                     type: string
 *             example:
 *               userId: "550e8400-e29b-41d4-a716-446655440002"
 *               quantity: 5
 *               variantId: "550e8400-e29b-41d4-a716-446655440003"
 *               unitPrice: 100000
 *               totalPrice: 500000
 *               selectedShipping:
 *                 type: "express"
 *                 courierName: "JNE"
 *                 courierService: "YES"
 *                 price: 25000
 *                 duration: "1-2 days"
 *     responses:
 *       201:
 *         description: Successfully joined session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     participant:
 *                       $ref: '#/components/schemas/Participant'
 *                     payment:
 *                       type: object
 *                     paymentUrl:
 *                       type: string
 *                     invoiceId:
 *                       type: string
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         productPrice:
 *                           type: number
 *                         shippingCost:
 *                           type: number
 *                         gatewayFee:
 *                           type: number
 *                         totalAmount:
 *                           type: number
 *                         selectedCourier:
 *                           type: object
 *       400:
 *         description: Bad request (e.g., invalid data or missing shipping selection)
 */
router.post(
  '/:id/join',
  [
    param('id').isUUID(),
    body('userId').isUUID().withMessage('Invalid user ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unitPrice').isFloat({ min: 0.01 }).withMessage('Unit price must be greater than 0'),
    body('totalPrice').isFloat({ min: 0.01 }).withMessage('Total price must be greater than 0'),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('selectedShipping').notEmpty().withMessage('Shipping selection is required'),
    body('selectedShipping.type').isIn(['sameDay', 'express', 'regular']).withMessage('Invalid shipping type'),
    body('selectedShipping.courierName').notEmpty().withMessage('Courier name is required'),
    body('selectedShipping.courierService').notEmpty().withMessage('Courier service is required'),
    body('selectedShipping.price').isFloat({ min: 0 }).withMessage('Shipping price must be a number'),
    body('selectedShipping.duration').notEmpty().withMessage('Shipping duration is required'),
  ],
  controller.joinSession
);

/**
 * @swagger
 * /api/group-buying/{id}/leave:
 *   delete:
 *     tags: [Participants]
 *     summary: Leave a group buying session
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *             example:
 *               userId: "550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: Successfully left session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (e.g., invalid user ID)
 */
router.delete(
  '/:id/leave',
  [
    param('id').isUUID(),
    body('userId').isUUID().withMessage('Invalid user ID'),
  ],
  controller.leaveSession
);

/**
 * @swagger
 * /api/group-buying/{id}/participants:
 *   get:
 *     tags: [Participants]
 *     summary: Get all participants of a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of participants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Participant'
 *       404:
 *         description: Session not found
 */
router.get('/:id/participants', [param('id').isUUID()], controller.getParticipants);

/**
 * @swagger
 * /api/group-buying/{id}/stats:
 *   get:
 *     tags: [Participants]
 *     summary: Get session statistics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session statistics including MOQ progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalParticipants:
 *                   type: integer
 *                 totalQuantity:
 *                   type: integer
 *                 moqProgress:
 *                   type: number
 *       404:
 *         description: Session not found
 */
router.get('/:id/stats', [param('id').isUUID()], controller.getSessionStats);

/**
 * @swagger
 * /api/group-buying/{id}/start-production:
 *   post:
 *     tags: [Production]
 *     summary: Factory owner marks production started
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
 *             required:
 *               - factoryOwnerId
 *             properties:
 *               factoryOwnerId:
 *                 type: string
 *                 format: uuid
 *             example:
 *               factoryOwnerId: "550e8400-e29b-41d4-a716-446655440004"
 *     responses:
 *       200:
 *         description: Production started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (e.g., invalid factory owner ID)
 */
router.post(
  '/:id/start-production',
  [
    param('id').isUUID(),
    body('factoryOwnerId').isUUID().withMessage('Invalid factory owner ID'),
  ],
  controller.startProduction
);

/**
 * @swagger
 * /api/group-buying/{id}/complete-production:
 *   post:
 *     tags: [Production]
 *     summary: Factory owner marks production completed
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
 *             required:
 *               - factoryOwnerId
 *             properties:
 *               factoryOwnerId:
 *                 type: string
 *                 format: uuid
 *             example:
 *               factoryOwnerId: "550e8400-e29b-41d4-a716-446655440004"
 *     responses:
 *       200:
 *         description: Production completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (e.g., invalid factory owner ID)
 */
router.post(
  '/:id/complete-production',
  [
    param('id').isUUID(),
    body('factoryOwnerId').isUUID().withMessage('Invalid factory owner ID'),
  ],
  controller.completeProduction
);

/**
 * @swagger
 * /api/group-buying/{id}/cancel:
 *   post:
 *     tags: [Group Buying Sessions]
 *     summary: Cancel a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *             example:
 *               reason: "Insufficient participants"
 *     responses:
 *       200:
 *         description: Session cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 */
router.post(
  '/:id/cancel',
  [
    param('id').isUUID(),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  controller.cancelSession
);

/**
 * @swagger
 * /api/group-buying/process-expired:
 *   post:
 *     tags: [Group Buying Sessions]
 *     summary: Process all expired sessions (cron job endpoint)
 *     responses:
 *       200:
 *         description: Expired sessions processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.post('/process-expired', controller.processExpired);

/**
 * @swagger
 * /api/group-buying/process-nearing-expiration:
 *   post:
 *     tags: [Group Buying Sessions]
 *     summary: Process sessions nearing expiration (10 min before - cron job endpoint)
 *     description: |
 *       Processes sessions that are 10 minutes before expiration.
 *       - Adds bots to reach 25% MOQ if there's at least 1 real participant and current < 25%
 *       - Expires sessions with no participants and creates new session for next day
 *     responses:
 *       200:
 *         description: Sessions processed successfully
 *       500:
 *         description: Internal server error
 */
router.post('/process-nearing-expiration', controller.processNearingExpiration);

/**
 * @swagger
 * /api/group-buying/{id}/manual-expire:
 *   post:
 *     tags: [Group Buying Sessions]
 *     summary: Manually expire and process a session (TESTING ONLY)
 *     description: Sets session end_time to past and immediately processes it. Use for testing without waiting for actual expiration.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session manually expired and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
 */
router.post('/:id/manual-expire', [param('id').isUUID()], controller.manualExpire);

/**
 * @swagger
 * /api/group-buying/{sessionId}/variant-availability/{variantId}:
 *   get:
 *     tags: [Group Buying Sessions]
 *     summary: Check variant availability for grosir allocation (DIAGNOSTIC)
 *     description: Shows current orders, dynamic cap, and whether variant is locked
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant UUID or "null" for base product
 *     responses:
 *       200:
 *         description: Variant availability details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     variantId:
 *                       type: string
 *                     allocation:
 *                       type: integer
 *                     maxAllowed:
 *                       type: integer
 *                     totalOrdered:
 *                       type: integer
 *                     available:
 *                       type: integer
 *                     isLocked:
 *                       type: boolean
 *                     minOrderedAcrossVariants:
 *                       type: integer
 *                     ordersByVariant:
 *                       type: object
 *       400:
 *         description: Bad request or variant not configured
 */
router.get(
  '/:sessionId/variant-availability/:variantId',
  [param('sessionId').isUUID(), param('variantId').notEmpty()],
  controller.checkVariantAvailability
);

/**
 * @swagger
 * /api/group-buying/{id}:
 *   delete:
 *     tags: [Group Buying Sessions]
 *     summary: Delete a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Session not found
 */
router.delete('/:id', [param('id').isUUID()], controller.deleteSession);

export default router;

// Placeholder for schemas (to be defined in components section of OpenAPI spec)
/**
 * @swagger
 * components:
 *   schemas:
 *     GroupBuyingSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Session UUID
 *         productId:
 *           type: string
 *           format: uuid
 *           description: Product UUID
 *         factoryId:
 *           type: string
 *           format: uuid
 *           description: Factory UUID
 *         sessionCode:
 *           type: string
 *           description: Unique session code
 *         targetMoq:
 *           type: integer
 *           description: Minimum order quantity
 *         groupPrice:
 *           type: number
 *           description: Current active price
 *         priceTier25:
 *           type: number
 *           nullable: true
 *           description: Price when 25% MOQ filled (highest)
 *         priceTier50:
 *           type: number
 *           nullable: true
 *           description: Price when 50% MOQ filled
 *         priceTier75:
 *           type: number
 *           nullable: true
 *           description: Price when 75% MOQ filled
 *         priceTier100:
 *           type: number
 *           nullable: true
 *           description: Price when 100% MOQ filled (lowest)
 *         currentTier:
 *           type: integer
 *           nullable: true
 *           description: Current active tier (25, 50, 75, or 100)
 *         botParticipantId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Bot participant UUID (if exists)
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Session expiry time
 *         estimatedCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Estimated production completion date
 *         status:
 *           type: string
 *           enum: [forming, moq_reached, pending_stock, stock_received, success, failed, cancelled]
 *           description: Session status
 *     Participant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Participant UUID
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User UUID
 *         sessionId:
 *           type: string
 *           format: uuid
 *           description: Group session UUID
 *         quantity:
 *           type: integer
 *           description: Quantity ordered
 *         unitPrice:
 *           type: number
 *           description: Price per unit at time of join
 *         totalPrice:
 *           type: number
 *           description: Total price paid
 *         variantId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Product variant UUID (if applicable)
 *         isBotParticipant:
 *           type: boolean
 *           description: True if this is a bot participant
 */