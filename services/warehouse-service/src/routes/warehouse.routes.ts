import { Router } from 'express';
import { body } from 'express-validator';
import { WarehouseController } from '../controllers/warehouse.controller';

const router = Router();
const controller = new WarehouseController();

/**
 * @swagger
 * /api/fulfill-demand:
 *   post:
 *     summary: (Internal) Fulfills demand from a completed group buy session
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, wholesaleUnit]
 *             properties:
 *               productId: { type: 'string', format: 'uuid' }
 *               variantId: { type: 'string', format: 'uuid' }
 *               quantity: { type: 'integer', minimum: 1 }
 *               wholesaleUnit: { type: 'integer', minimum: 1 }
 *     responses:
 *       200: { description: 'Demand processed' }
 *       500: { description: 'Internal server error' }
 */
router.post('/fulfill-demand', [
    body('productId').isUUID(),
    body('variantId').optional().isUUID(),
    body('quantity').isInt({ gt: 0 }),
    body('wholesaleUnit').isInt({ gt: 0 }),
], controller.fulfillDemand);

/**
 * @swagger
 * /api/fulfill-bundle-demand:
 *   post:
 *     summary: (Internal) Fulfills demand using grosir bundle configuration
 *     description: More sophisticated than fulfill-demand - uses bundle config and warehouse tolerance
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, wholesaleUnit]
 *             properties:
 *               productId: { type: 'string', format: 'uuid' }
 *               variantId: { type: 'string', format: 'uuid', nullable: true }
 *               quantity: { type: 'integer', minimum: 1 }
 *               wholesaleUnit: { type: 'integer', minimum: 1 }
 *     responses:
 *       200:
 *         description: Demand processed with bundle calculations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 message: { type: 'string' }
 *                 hasStock: { type: 'boolean' }
 *                 bundlesNeeded: { type: 'integer' }
 *                 excessUnits: { type: 'integer' }
 *                 unitsPerBundle: { type: 'integer' }
 *       500: { description: 'Internal server error' }
 */
router.post('/fulfill-bundle-demand', [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('quantity').isInt({ gt: 0 }),
    body('wholesaleUnit').isInt({ gt: 0 }),
], controller.fulfillBundleDemand);

export default router;