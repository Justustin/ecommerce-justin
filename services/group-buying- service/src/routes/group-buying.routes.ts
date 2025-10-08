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
 *     summary: Create a new group buying session
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
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               factoryId:
 *                 type: string
 *                 format: uuid
 *               sessionCode:
 *                 type: string
 *                 maxLength: 20
 *               targetMoq:
 *                 type: integer
 *                 minimum: 2
 *               groupPrice:
 *                 type: number
 *                 minimum: 0.01
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *             example:
 *               productId: "550e8400-e29b-41d4-a716-446655440000"
 *               factoryId: "550e8400-e29b-41d4-a716-446655440001"
 *               sessionCode: "GROUP2025"
 *               targetMoq: 50
 *               groupPrice: 100.50
 *               endTime: "2025-10-07T19:00:00.000Z"
 *               estimatedCompletionDate: "2025-10-15T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Session created successfully
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
 *         description: Bad request (e.g., invalid data)
 */
router.post(
  '/',
  [
    param('id').optional().isUUID(), // Not used here but included for consistency
    body('productId').isUUID().withMessage('Invalid product ID'),
    body('factoryId').isUUID().withMessage('Invalid factory ID'),
    body('targetMoq').isInt({ min: 2 }).withMessage('Target MOQ must be at least 2'), // Updated to match service
    body('groupPrice').isFloat({ min: 0.01 }).withMessage('Group price must be greater than 0'),
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
 *           enum: [forming, active, moq_reached, success, failed, cancelled]
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
 *                 enum: [forming, active, moq_reached, success, failed, cancelled]
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
 *               status: "active"
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
 * /api/group-buying/{id}/join:
 *   post:
 *     tags: [Participants]
 *     summary: Join a group buying session
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
 *             example:
 *               userId: "550e8400-e29b-41d4-a716-446655440002"
 *               quantity: 5
 *               variantId: "550e8400-e29b-41d4-a716-446655440003"
 *               unitPrice: 100.50
 *               totalPrice: 502.50
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
 *                   $ref: '#/components/schemas/Participant'
 *       400:
 *         description: Bad request (e.g., invalid data)
 */
router.post(
  '/:id/join',
  [
    param('id').isUUID(),
    body('userId').isUUID().withMessage('Invalid user ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unitPrice').isFloat({ min: 0.01 }).withMessage('Unit price must be greater than 0'),
    body('totalPrice').isFloat({ min: 0.01 }).withMessage('Total price must be greater than 0'),
    body('variantId').optional().isUUID(),
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
 *         productId:
 *           type: string
 *           format: uuid
 *         factoryId:
 *           type: string
 *           format: uuid
 *         sessionCode:
 *           type: string
 *         targetMoq:
 *           type: integer
 *         groupPrice:
 *           type: number
 *         endTime:
 *           type: string
 *           format: date-time
 *         estimatedCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [forming, active, moq_reached, success, failed, cancelled]
 *     Participant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         sessionId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: number
 *         totalPrice:
 *           type: number
 *         variantId:
 *           type: string
 *           format: uuid
 *           nullable: true
 */