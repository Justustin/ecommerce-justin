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
 *               - ownerId
 *               - factoryCode
 *               - factoryName
 *               - phoneNumber
 *               - province
 *               - city
 *               - district
 *               - addressLine
 *             properties:
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *               factoryCode:
 *                 type: string
 *                 example: "FACT-JKT-001"
 *               factoryName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               province:
 *                 type: string
 *               city:
 *                 type: string
 *               district:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               addressLine:
 *                 type: string
 *               description:
 *                 type: string
 *               businessLicenseNumber:
 *                 type: string
 *               taxId:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Factory registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Factory code already exists
 */
router.post(
  '/',
  [
    body('ownerId').isUUID(),
    body('factoryCode').notEmpty().trim(),
    body('factoryName').notEmpty().trim(),
    body('phoneNumber').notEmpty().trim(),
    body('email').optional().isEmail(),
    body('province').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('district').notEmpty().trim(),
    body('postalCode').optional().trim(),
    body('addressLine').notEmpty().trim(),
    body('description').optional().trim(),
    body('businessLicenseNumber').optional().trim(),
    body('taxId').optional().trim(),
    body('logoUrl').optional().isURL()
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
    body('addressLine').optional().trim(),
    body('city').optional().trim(),
    body('district').optional().trim(),
    body('province').optional().trim(),
    body('postalCode').optional().trim(),
    body('phoneNumber').optional().trim(),
    body('email').optional().isEmail(),
    body('businessLicenseNumber').optional().trim(),
    body('taxId').optional().trim(),
    body('logoUrl').optional().isURL()
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
 *               - verifiedBy
 *             properties:
 *               verifiedBy:
 *                 type: string
 *                 format: uuid
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
    body('verifiedBy').isUUID()
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
 *     responses:
 *       200:
 *         description: Factory reactivated successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/:id/reactivate',
  [param('id').isUUID()],
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

/**
 * @swagger
 * /api/admin/factories/{id}/assign-warehouse:
 *   post:
 *     tags: [Admin - Factories]
 *     summary: Assign warehouse to factory
 *     description: |
 *       Set default warehouse for factory's bulk shipments (Leg 1: Factory → Warehouse).
 *       NOTE: Warehouse CRUD operations are in warehouse-service, not here.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - warehouseId
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Warehouse assigned to factory successfully
 *       404:
 *         description: Factory or warehouse not found
 */
router.post(
  '/:id/assign-warehouse',
  [
    param('id').isUUID(),
    body('warehouseId').isUUID()
  ],
  controller.assignWarehouseToFactory
);

export default router;
