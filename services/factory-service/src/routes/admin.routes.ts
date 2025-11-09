import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// ============================================================================
// FACTORY MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/factories:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Register a new factory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - factoryName
 *               - ownerName
 *               - email
 *               - phone
 *               - address
 *               - city
 *             properties:
 *               factoryName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               description:
 *                 type: string
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *               minimumOrderValue:
 *                 type: number
 *               productionCapacityPerMonth:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Factory registered successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  [
    body('factoryName').notEmpty().trim(),
    body('ownerName').notEmpty().trim(),
    body('email').isEmail(),
    body('phone').notEmpty().trim(),
    body('address').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('province').optional().trim(),
    body('postalCode').optional().trim(),
    body('description').optional().trim(),
    body('certifications').optional().isArray(),
    body('minimumOrderValue').optional().isNumeric(),
    body('productionCapacityPerMonth').optional().isInt({ min: 0 })
  ],
  controller.registerFactory
);

/**
 * @swagger
 * /api/admin/factories/{id}:
 *   put:
 *     tags: [Admin - Factories]
 *     summary: Update factory details
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
 *     responses:
 *       200:
 *         description: Factory updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('factoryName').optional().trim(),
    body('description').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('province').optional().trim(),
    body('postalCode').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().isEmail(),
    body('minimumOrderValue').optional().isNumeric(),
    body('productionCapacityPerMonth').optional().isInt({ min: 0 })
  ],
  controller.updateFactory
);

/**
 * @swagger
 * /api/admin/factories/{id}:
 *   delete:
 *     tags: [Admin - Factories]
 *     summary: Delete/suspend factory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Factory deleted successfully
 *       400:
 *         description: Error deleting factory
 */
router.delete('/:id', [param('id').isUUID()], controller.deleteFactory);

/**
 * @swagger
 * /api/admin/factories/{id}/verify:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Verify factory (admin approval)
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
 *               - verificationNotes
 *               - verifiedBy
 *             properties:
 *               verificationNotes:
 *                 type: string
 *               verifiedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Factory verified successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/:id/verify',
  [
    param('id').isUUID(),
    body('verificationNotes').notEmpty().trim(),
    body('verifiedBy').notEmpty().trim()
  ],
  controller.verifyFactory
);

/**
 * @swagger
 * /api/admin/factories/{id}/suspend:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Suspend factory
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               suspensionDuration:
 *                 type: string
 *     responses:
 *       200:
 *         description: Factory suspended successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/:id/suspend',
  [
    param('id').isUUID(),
    body('reason').notEmpty().trim(),
    body('suspensionDuration').optional().trim()
  ],
  controller.suspendFactory
);

/**
 * @swagger
 * /api/admin/factories/{id}/reactivate:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Reactivate factory
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Factory reactivated successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/:id/reactivate',
  [param('id').isUUID(), body('notes').notEmpty().trim()],
  controller.reactivateFactory
);

/**
 * @swagger
 * /api/admin/factories/{id}/metrics:
 *   get:
 *     tags: [Admin - Factories]
 *     summary: Get factory performance metrics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *         description: Factory metrics retrieved successfully
 */
router.get(
  '/:id/metrics',
  [
    param('id').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  controller.getFactoryMetrics
);

// ============================================================================
// FACTORY SESSIONS MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/factories/{id}/sessions:
 *   get:
 *     tags: [Admin - Factories]
 *     summary: List factory sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Factory sessions retrieved successfully
 */
router.get(
  '/:id/sessions',
  [param('id').isUUID(), query('page').optional().isInt(), query('limit').optional().isInt()],
  controller.getFactorySessions
);

/**
 * @swagger
 * /api/admin/factories/{id}/sessions/{sessionId}/cancel:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Force cancel session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sessionId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               refundParticipants:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Session cancelled successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/:id/sessions/:sessionId/cancel',
  [
    param('id').isUUID(),
    param('sessionId').isUUID(),
    body('reason').notEmpty().trim(),
    body('refundParticipants').optional().isBoolean()
  ],
  controller.forceCancelSession
);

/**
 * @swagger
 * /api/admin/factories/{id}/analytics:
 *   get:
 *     tags: [Admin - Factories]
 *     summary: Get factory analytics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, yearly]
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Factory analytics retrieved successfully
 */
router.get(
  '/:id/analytics',
  [
    param('id').isUUID(),
    query('period').optional().isIn(['monthly', 'yearly']),
    query('year').optional().isInt()
  ],
  controller.getFactoryAnalytics
);

export default router;
