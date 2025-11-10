import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/warehouse/inventory:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: View all inventory
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 */
router.get('/inventory', controller.getAllInventory);

/**
 * @swagger
 * /api/admin/warehouse/inventory/{productId}:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: View product inventory
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product inventory retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/inventory/:productId', [param('productId').isUUID()], controller.getProductInventory);

/**
 * @swagger
 * /api/admin/warehouse/inventory/adjust:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Manual stock adjustment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - adjustmentType
 *               - quantity
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               adjustmentType:
 *                 type: string
 *                 enum: [add, remove, set]
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/inventory/adjust',
  [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('adjustmentType').isIn(['add', 'remove', 'set']),
    body('quantity').isInt({ min: 0 }),
    body('reason').notEmpty().trim(),
    body('notes').optional().trim()
  ],
  controller.adjustStock
);

/**
 * @swagger
 * /api/admin/warehouse/inventory/{productId}/reserve:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Manual reserve stock
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - quantity
 *               - reason
 *             properties:
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               reason:
 *                 type: string
 *               referenceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock reserved successfully
 *       400:
 *         description: Insufficient stock
 */
router.post(
  '/inventory/:productId/reserve',
  [
    param('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('reason').notEmpty().trim(),
    body('referenceId').optional().trim()
  ],
  controller.reserveStock
);

/**
 * @swagger
 * /api/admin/warehouse/inventory/{productId}/release:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Release reservation
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - quantity
 *               - reason
 *             properties:
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               reason:
 *                 type: string
 *               referenceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation released successfully
 *       400:
 *         description: Insufficient reserved stock
 */
router.post(
  '/inventory/:productId/release',
  [
    param('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('reason').notEmpty().trim(),
    body('referenceId').optional().trim()
  ],
  controller.releaseReservation
);

// ============================================================================
// PURCHASE ORDER MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/warehouse/purchase-orders:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: List all purchase orders
 *     parameters:
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
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Purchase orders retrieved successfully
 */
router.get('/purchase-orders', controller.getAllPurchaseOrders);

/**
 * @swagger
 * /api/admin/warehouse/purchase-orders/{id}:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: View PO details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Purchase order retrieved successfully
 *       404:
 *         description: Purchase order not found
 */
router.get('/purchase-orders/:id', [param('id').isUUID()], controller.getPurchaseOrderDetails);

/**
 * @swagger
 * /api/admin/warehouse/purchase-orders/{id}:
 *   put:
 *     tags: [Admin - Warehouse]
 *     summary: Update PO status
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
 *                 enum: [pending, confirmed, in_production, shipped, received, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: PO status updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/purchase-orders/:id',
  [
    param('id').isUUID(),
    body('status').isIn(['pending', 'confirmed', 'in_production', 'shipped', 'received', 'cancelled']),
    body('notes').optional().trim()
  ],
  controller.updatePurchaseOrderStatus
);

/**
 * @swagger
 * /api/admin/warehouse/purchase-orders/{id}/receive:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Mark PO as received
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
 *               - receivedItems
 *               - receivedDate
 *             properties:
 *               receivedItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - quantityReceived
 *                   properties:
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     quantityReceived:
 *                       type: integer
 *                     quantityDamaged:
 *                       type: integer
 *                     notes:
 *                       type: string
 *               receivedDate:
 *                 type: string
 *                 format: date-time
 *               receivedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: PO received successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/purchase-orders/:id/receive',
  [
    param('id').isUUID(),
    body('receivedItems').isArray({ min: 1 }),
    body('receivedItems.*.variantId').optional({ nullable: true }).isUUID(),
    body('receivedItems.*.quantityReceived').isInt({ min: 0 }),
    body('receivedItems.*.quantityDamaged').optional().isInt({ min: 0 }),
    body('receivedDate').isISO8601(),
    body('receivedBy').notEmpty().trim()
  ],
  controller.receivePurchaseOrder
);

/**
 * @swagger
 * /api/admin/warehouse/purchase-orders/{id}/cancel:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Cancel PO
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
 *               refundRequired:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: PO cancelled successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/purchase-orders/:id/cancel',
  [
    param('id').isUUID(),
    body('reason').notEmpty().trim(),
    body('refundRequired').optional().isBoolean()
  ],
  controller.cancelPurchaseOrder
);

// ============================================================================
// STOCK AUDITING
// ============================================================================

/**
 * @swagger
 * /api/admin/warehouse/audit-log:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: View audit log
 *     responses:
 *       501:
 *         description: Not yet implemented
 */
router.get('/audit-log', controller.getAuditLog);

/**
 * @swagger
 * /api/admin/warehouse/cycle-count:
 *   post:
 *     tags: [Admin - Warehouse]
 *     summary: Initiate cycle count
 *     responses:
 *       501:
 *         description: Not yet implemented
 */
router.post('/cycle-count', controller.initiateCycleCount);

/**
 * @swagger
 * /api/admin/warehouse/discrepancies:
 *   get:
 *     tags: [Admin - Warehouse]
 *     summary: View discrepancies
 *     responses:
 *       501:
 *         description: Not yet implemented
 */
router.get('/discrepancies', controller.getDiscrepancies);

// ============================================================================
// WAREHOUSE LOCATIONS (Two-Leg Shipping)
// ============================================================================

/**
 * @swagger
 * /api/admin/warehouse/locations:
 *   post:
 *     tags: [Admin - Warehouse Locations]
 *     summary: Create warehouse location
 *     description: Create a new warehouse location for receiving bulk shipments from factories (Leg 1 destination, Leg 2 origin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - addressLine
 *               - city
 *               - postalCode
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jakarta Central Warehouse"
 *               addressLine:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               postalCode:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/locations',
  [
    body('name').notEmpty().trim(),
    body('addressLine').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('province').optional().trim(),
    body('postalCode').isInt(),
    body('notes').optional().trim()
  ],
  controller.createWarehouse
);

/**
 * @swagger
 * /api/admin/warehouse/locations:
 *   get:
 *     tags: [Admin - Warehouse Locations]
 *     summary: List all warehouse locations
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Warehouses retrieved successfully
 */
router.get(
  '/locations',
  [
    query('page').optional().isInt(),
    query('limit').optional().isInt()
  ],
  controller.listWarehouses
);

/**
 * @swagger
 * /api/admin/warehouse/locations/{id}:
 *   get:
 *     tags: [Admin - Warehouse Locations]
 *     summary: Get warehouse location details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Warehouse retrieved successfully
 *       404:
 *         description: Warehouse not found
 */
router.get('/locations/:id', [param('id').isUUID()], controller.getWarehouseDetails);

/**
 * @swagger
 * /api/admin/warehouse/locations/{id}:
 *   put:
 *     tags: [Admin - Warehouse Locations]
 *     summary: Update warehouse location
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
 *         description: Warehouse updated successfully
 *       404:
 *         description: Warehouse not found
 */
router.put(
  '/locations/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('addressLine').optional().trim(),
    body('city').optional().trim(),
    body('province').optional().trim(),
    body('postalCode').optional().isInt(),
    body('notes').optional().trim()
  ],
  controller.updateWarehouse
);

/**
 * @swagger
 * /api/admin/warehouse/locations/{id}:
 *   delete:
 *     tags: [Admin - Warehouse Locations]
 *     summary: Delete warehouse location
 *     description: Cannot delete if warehouse is assigned to factories or used in active sessions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Warehouse deleted successfully
 *       400:
 *         description: Cannot delete - warehouse is in use
 *       404:
 *         description: Warehouse not found
 */
router.delete(
  '/locations/:id',
  [param('id').isUUID()],
  controller.deleteWarehouse
);

export default router;
