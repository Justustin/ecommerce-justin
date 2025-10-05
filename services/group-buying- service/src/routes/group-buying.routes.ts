import { Router } from 'express';
import { body } from 'express-validator';
import { GroupBuyingController } from '../controllers/group-buying.controller';

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
 *                 minimum: 1
 *               groupPrice:
 *                 type: number
 *                 minimum: 0.01
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Session created successfully
 */
router.post(
  '/',
  [
    body('productId').isUUID().withMessage('Invalid product ID'),
    body('factoryId').isUUID().withMessage('Invalid factory ID'),
    body('targetMoq').isInt({ min: 1 }).withMessage('Target MOQ must be at least 1'),
    body('groupPrice').isFloat({ min: 0.01 }).withMessage('Group price must be greater than 0'),
    body('endTime').isISO8601().withMessage('Invalid end time format'),
    body('sessionCode').optional().isLength({ min: 1, max: 20 }),
    body('estimatedCompletionDate').optional().isISO8601(),
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
 *       404:
 *         description: Session not found
 */
router.get('/:id', controller.getSessionById);

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
 *       404:
 *         description: Session not found
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
 *               targetMoq:
 *                 type: integer
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Session updated
 */
router.patch(
  '/:id',
  [
    body('endTime').optional().isISO8601(),
    body('groupPrice').optional().isFloat({ min: 0.01 }),
    body('targetMoq').optional().isInt({ min: 1 }),
    body('estimatedCompletionDate').optional().isISO8601(),
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
 *     responses:
 *       201:
 *         description: Successfully joined session
 */
router.post(
  '/:id/join',
  [
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
 *     responses:
 *       200:
 *         description: Successfully left session
 */
router.delete(
  '/:id/leave',
  [
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
 */
router.get('/:id/participants', controller.getParticipants);

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
 */
router.get('/:id/stats', controller.getSessionStats);

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
 *     responses:
 *       200:
 *         description: Production started
 */
router.post(
  '/:id/start-production',
  [
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
 *     responses:
 *       200:
 *         description: Production completed
 */
router.post(
  '/:id/complete-production',
  [
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session cancelled
 */
router.post(
  '/:id/cancel',
  [
    body('reason').optional().isString(),
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
 */
router.delete('/:id', controller.deleteSession);

export default router;