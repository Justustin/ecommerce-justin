import { Router } from 'express';
import { body } from 'express-validator';
import { WarehouseController } from '../controllers/warehouse.controller';

const router = Router();
const controller = new WarehouseController();

/**
 * @swagger
 * /api/fulfill-demand:
 *   post:
 *     summary: (DEPRECATED) Old single-variant fulfillment - Use /fulfill-bundle-demand instead
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
 *     summary: (NEW) Bundle-based fulfillment for all variants considering factory bundles
 *     description: |
 *       Fulfills demand from a group buying session using the bundle-based allocation system.
 *
 *       This endpoint:
 *       - Gets bundle configuration for the product (how many of each variant per bundle)
 *       - Gets warehouse tolerance (max excess allowed per variant)
 *       - Calculates how many factory bundles needed
 *       - Checks if warehouse tolerance allows this many bundles
 *       - Reserves existing stock or creates PO for complete bundles
 *       - Sends WhatsApp to factory if ordering needed
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, sessionId, variantDemands]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: Product UUID
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Group buying session UUID
 *               variantDemands:
 *                 type: array
 *                 description: Demand for each variant
 *                 items:
 *                   type: object
 *                   required: [quantity]
 *                   properties:
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Variant UUID (null for base product)
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Total demand for this variant
 *           example:
 *             productId: "550e8400-e29b-41d4-a716-446655440000"
 *             sessionId: "660e8400-e29b-41d4-a716-446655440000"
 *             variantDemands:
 *               - variantId: "770e8400-e29b-41d4-a716-446655440001"
 *                 quantity: 38
 *               - variantId: "770e8400-e29b-41d4-a716-446655440002"
 *                 quantity: 25
 *     responses:
 *       200:
 *         description: Demand processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 hasStock:
 *                   type: boolean
 *                 bundlesOrdered:
 *                   type: integer
 *                 totalUnitsOrdered:
 *                   type: integer
 *                 constrainingVariant:
 *                   type: string
 *                   nullable: true
 *       500:
 *         description: Internal server error
 */
router.post('/fulfill-bundle-demand', [
    body('productId').isUUID(),
    body('sessionId').isUUID(),
    body('variantDemands').isArray({ min: 1 }),
    body('variantDemands.*.variantId').optional({ nullable: true }).isUUID(),
    body('variantDemands.*.quantity').isInt({ gt: 0 }),
], controller.fulfillBundleDemand);

export default router;