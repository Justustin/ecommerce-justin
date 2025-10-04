import { Router } from 'express';
import { body } from 'express-validator';
import { FactoryController } from '../controllers/factory.controller';

const router = Router();
const controller = new FactoryController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Factory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         ownerId:
 *           type: string
 *           format: uuid
 *         officeId:
 *           type: string
 *           format: uuid
 *         factoryCode:
 *           type: string
 *         factoryName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, active, suspended, inactive]
 *         verificationStatus:
 *           type: string
 *           enum: [unverified, pending, verified, rejected]
 *         businessLicenseNumber:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         email:
 *           type: string
 *         province:
 *           type: string
 *         city:
 *           type: string
 *         district:
 *           type: string
 *         addressLine:
 *           type: string
 */

/**
 * @swagger
 * /api/factories:
 *   post:
 *     tags: [Factories]
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
 *                 example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *               officeId:
 *                 type: string
 *                 format: uuid
 *               factoryCode:
 *                 type: string
 *                 example: "FACT-PKL-BUD-123456"
 *               factoryName:
 *                 type: string
 *                 example: "Batik Pekalongan Premium"
 *               businessLicenseNumber:
 *                 type: string
 *                 example: "NIB-1234567890"
 *               businessLicensePhotoUrl:
 *                 type: string
 *               taxId:
 *                 type: string
 *                 example: "01.234.567.8-901.000"
 *               phoneNumber:
 *                 type: string
 *                 example: "081234567890"
 *               email:
 *                 type: string
 *                 example: "factory@batik.com"
 *               province:
 *                 type: string
 *                 example: "Jawa Tengah"
 *               city:
 *                 type: string
 *                 example: "Pekalongan"
 *               district:
 *                 type: string
 *                 example: "Pekalongan Barat"
 *               postalCode:
 *                 type: string
 *                 example: "51111"
 *               addressLine:
 *                 type: string
 *                 example: "Jl. Batik Raya No. 123"
 *               logoUrl:
 *                 type: string
 *               description:
 *                 type: string
 *                 example: "Premium batik manufacturer"
 *     responses:
 *       201:
 *         description: Factory created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  [
    body('ownerId').isUUID().withMessage('Invalid owner ID'),
    body('factoryCode').notEmpty().withMessage('Factory code is required'),
    body('factoryName').notEmpty().withMessage('Factory name is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('province').notEmpty().withMessage('Province is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('district').notEmpty().withMessage('District is required'),
    body('addressLine').notEmpty().withMessage('Address is required'),
  ],
  controller.createFactory
);

/**
 * @swagger
 * /api/factories:
 *   get:
 *     tags: [Factories]
 *     summary: Get all factories with filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, suspended, inactive]
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [unverified, pending, verified, rejected]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by factory name or code
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
 *         description: List of factories
 */
router.get('/', controller.getFactories);

/**
 * @swagger
 * /api/factories/{id}:
 *   get:
 *     tags: [Factories]
 *     summary: Get factory by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Factory details
 *       404:
 *         description: Factory not found
 */
router.get('/:id', controller.getFactoryById);

/**
 * @swagger
 * /api/factories/code/{code}:
 *   get:
 *     tags: [Factories]
 *     summary: Get factory by factory code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         example: "FACT-PKL-001"
 *     responses:
 *       200:
 *         description: Factory details
 *       404:
 *         description: Factory not found
 */
router.get('/code/:code', controller.getFactoryByCode);

/**
 * @swagger
 * /api/factories/owner/{ownerId}:
 *   get:
 *     tags: [Factories]
 *     summary: Get all factories owned by a user
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of factories owned by the user
 */
router.get('/owner/:ownerId', controller.getFactoriesByOwner);

/**
 * @swagger
 * /api/factories/{id}:
 *   patch:
 *     tags: [Factories]
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
 *             properties:
 *               factoryName:
 *                 type: string
 *               businessLicenseNumber:
 *                 type: string
 *               businessLicensePhotoUrl:
 *                 type: string
 *               taxId:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
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
 *               logoUrl:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Factory updated successfully
 *       404:
 *         description: Factory not found
 */
router.patch('/:id', controller.updateFactory);

/**
 * @swagger
 * /api/factories/{id}/verify:
 *   patch:
 *     tags: [Factories]
 *     summary: Verify factory (Admin only)
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
 *               - verificationStatus
 *             properties:
 *               verificationStatus:
 *                 type: string
 *                 enum: [unverified, pending, verified, rejected]
 *               verifiedBy:
 *                 type: string
 *                 format: uuid
 *                 description: Admin user ID who verified
 *     responses:
 *       200:
 *         description: Factory verification updated
 *       404:
 *         description: Factory not found
 */
router.patch(
  '/:id/verify',
  [
    body('verificationStatus')
      .isIn(['unverified', 'pending', 'verified', 'rejected'])
      .withMessage('Invalid verification status'),
    body('verifiedBy').optional().isUUID().withMessage('Invalid verifier ID'),
  ],
  controller.verifyFactory
);

/**
 * @swagger
 * /api/factories/{id}/status:
 *   patch:
 *     tags: [Factories]
 *     summary: Update factory status
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, active, suspended, inactive]
 *     responses:
 *       200:
 *         description: Factory status updated
 *       400:
 *         description: Cannot activate unverified factory
 */
router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(['pending', 'active', 'suspended', 'inactive'])
      .withMessage('Invalid status'),
  ],
  controller.updateFactoryStatus
);

/**
 * @swagger
 * /api/factories/{id}/assign-office:
 *   patch:
 *     tags: [Factories]
 *     summary: Assign factory to an office
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
 *               - officeId
 *             properties:
 *               officeId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Office assigned successfully
 *       404:
 *         description: Factory not found
 */
router.patch(
  '/:id/assign-office',
  [
    body('officeId').isUUID().withMessage('Invalid office ID'),
  ],
  controller.assignOffice
);

/**
 * @swagger
 * /api/factories/{id}:
 *   delete:
 *     tags: [Factories]
 *     summary: Delete factory (HARD DELETE - use with caution)
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
 *       404:
 *         description: Factory not found
 */
router.delete('/:id', controller.deleteFactory);

export default router;