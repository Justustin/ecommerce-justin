import { Router } from 'express';
import { body, param } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

/**
 * @swagger
 * /api/admin/grosir/configure-product:
 *   post:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Bulk configure grosir settings for a product
 *     description: |
 *       Configure both factory bundle composition and warehouse tolerance for all variants.
 *       This is a transactional operation that replaces existing configurations.
 *
 *       **Factory Bundle:** How many units of each variant come in one factory bundle
 *       Example: Bundle = 2S + 5M + 4L + 1XL (12 units total)
 *
 *       **Warehouse Tolerance:** Maximum excess units acceptable per variant
 *       Example: XL max_excess=30 means platform can hold up to 30 unsold XL units
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - bundleConfigs
 *               - warehouseTolerances
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               bundleConfigs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - unitsPerBundle
 *                   properties:
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     unitsPerBundle:
 *                       type: integer
 *                       minimum: 1
 *                     notes:
 *                       type: string
 *               warehouseTolerances:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - maxExcessUnits
 *                   properties:
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     maxExcessUnits:
 *                       type: integer
 *                       minimum: 0
 *                     clearanceRateEstimate:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Configuration created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/configure-product',
  [
    body('productId').isUUID(),
    body('bundleConfigs').isArray({ min: 1 }),
    body('bundleConfigs.*.variantId').optional({ nullable: true }).isUUID(),
    body('bundleConfigs.*.unitsPerBundle').isInt({ min: 1 }),
    body('bundleConfigs.*.notes').optional().isString(),
    body('warehouseTolerances').isArray({ min: 1 }),
    body('warehouseTolerances.*.variantId').optional({ nullable: true }).isUUID(),
    body('warehouseTolerances.*.maxExcessUnits').isInt({ min: 0 }),
    body('warehouseTolerances.*.clearanceRateEstimate')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 100 }),
    body('warehouseTolerances.*.notes').optional().isString()
  ],
  controller.configureProduct
);

/**
 * @swagger
 * /api/admin/grosir/bundle-config:
 *   post:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Create bundle configuration for a product variant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - unitsPerBundle
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               unitsPerBundle:
 *                 type: integer
 *                 minimum: 1
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bundle config created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/bundle-config',
  [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('unitsPerBundle').isInt({ min: 1 }),
    body('notes').optional().isString()
  ],
  controller.createBundleConfig
);

/**
 * @swagger
 * /api/admin/grosir/bundle-config/{productId}:
 *   get:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Get bundle configurations for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bundle configurations retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get(
  '/bundle-config/:productId',
  [param('productId').isUUID()],
  controller.getBundleConfig
);

/**
 * @swagger
 * /api/admin/grosir/bundle-config/{id}:
 *   put:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Update bundle configuration
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
 *               unitsPerBundle:
 *                 type: integer
 *                 minimum: 1
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bundle config updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/bundle-config/:id',
  [
    param('id').isUUID(),
    body('unitsPerBundle').optional().isInt({ min: 1 }),
    body('notes').optional().isString()
  ],
  controller.updateBundleConfig
);

/**
 * @swagger
 * /api/admin/grosir/bundle-config/{productId}:
 *   delete:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Delete all bundle configurations for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bundle configurations deleted successfully
 *       400:
 *         description: Error deleting configurations
 */
router.delete(
  '/bundle-config/:productId',
  [param('productId').isUUID()],
  controller.deleteBundleConfig
);

/**
 * @swagger
 * /api/admin/grosir/warehouse-tolerance:
 *   post:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Create warehouse tolerance for a product variant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - maxExcessUnits
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               maxExcessUnits:
 *                 type: integer
 *                 minimum: 0
 *               clearanceRateEstimate:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse tolerance created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/warehouse-tolerance',
  [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('maxExcessUnits').isInt({ min: 0 }),
    body('clearanceRateEstimate')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 100 }),
    body('notes').optional().isString()
  ],
  controller.createWarehouseTolerance
);

/**
 * @swagger
 * /api/admin/grosir/warehouse-tolerance/{productId}:
 *   get:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Get warehouse tolerances for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Warehouse tolerances retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get(
  '/warehouse-tolerance/:productId',
  [param('productId').isUUID()],
  controller.getWarehouseTolerance
);

/**
 * @swagger
 * /api/admin/grosir/warehouse-tolerance/{id}:
 *   put:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Update warehouse tolerance
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
 *               maxExcessUnits:
 *                 type: integer
 *                 minimum: 0
 *               clearanceRateEstimate:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Warehouse tolerance updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/warehouse-tolerance/:id',
  [
    param('id').isUUID(),
    body('maxExcessUnits').optional().isInt({ min: 0 }),
    body('clearanceRateEstimate')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 100 }),
    body('notes').optional().isString()
  ],
  controller.updateWarehouseTolerance
);

/**
 * @swagger
 * /api/admin/grosir/warehouse-tolerance/{productId}:
 *   delete:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Delete all warehouse tolerances for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Warehouse tolerances deleted successfully
 *       400:
 *         description: Error deleting tolerances
 */
router.delete(
  '/warehouse-tolerance/:productId',
  [param('productId').isUUID()],
  controller.deleteWarehouseTolerance
);

/**
 * @swagger
 * /api/admin/grosir/config/{productId}:
 *   get:
 *     tags: [Admin - Grosir Configuration]
 *     summary: Get complete grosir configuration for a product
 *     description: Returns both bundle configs and warehouse tolerances
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Complete grosir configuration retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get(
  '/config/:productId',
  [param('productId').isUUID()],
  controller.getGrosirConfig
);

export default router;
