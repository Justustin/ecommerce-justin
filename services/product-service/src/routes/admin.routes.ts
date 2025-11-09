import { Router } from 'express';
import { body, param } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - factoryId
 *               - categoryId
 *               - sku
 *               - basePrice
 *               - moq
 *             properties:
 *               name:
 *                 type: string
 *               factoryId:
 *                 type: string
 *                 format: uuid
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               moq:
 *                 type: integer
 *               groupDurationHours:
 *                 type: integer
 *               stockQuantity:
 *                 type: integer
 *               weight:
 *                 type: integer
 *               lengthCm:
 *                 type: number
 *               widthCm:
 *                 type: number
 *               heightCm:
 *                 type: number
 *               primaryImageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/products',
  [
    body('name').notEmpty().trim(),
    body('factoryId').isUUID(),
    body('categoryId').isUUID(),
    body('sku').notEmpty().trim(),
    body('basePrice').isNumeric(),
    body('moq').isInt({ min: 1 }),
    body('costPrice').optional().isNumeric(),
    body('description').optional().trim(),
    body('groupDurationHours').optional().isInt({ min: 1 }),
    body('stockQuantity').optional().isInt({ min: 0 }),
    body('weight').optional().isInt({ min: 0 }),
    body('lengthCm').optional().isNumeric(),
    body('widthCm').optional().isNumeric(),
    body('heightCm').optional().isNumeric(),
    body('primaryImageUrl').optional().isURL()
  ],
  controller.createProduct
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     tags: [Admin - Products]
 *     summary: Update a product
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
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/products/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('basePrice').optional().isNumeric(),
    body('costPrice').optional().isNumeric(),
    body('status').optional().isIn(['draft', 'active', 'archived']),
    body('stockQuantity').optional().isInt({ min: 0 })
  ],
  controller.updateProduct
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     tags: [Admin - Products]
 *     summary: Delete a product (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       400:
 *         description: Error deleting product
 */
router.delete('/products/:id', [param('id').isUUID()], controller.deleteProduct);

// ============================================================================
// VARIANT MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/products/{id}/variants:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Add a variant to a product
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
 *               - sku
 *               - variantName
 *             properties:
 *               sku:
 *                 type: string
 *               variantName:
 *                 type: string
 *               priceAdjustment:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Variant created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/products/:id/variants',
  [
    param('id').isUUID(),
    body('sku').notEmpty().trim(),
    body('variantName').notEmpty().trim(),
    body('priceAdjustment').optional().isNumeric(),
    body('stockQuantity').optional().isInt({ min: 0 })
  ],
  controller.createVariant
);

/**
 * @swagger
 * /api/admin/products/{id}/variants/{variantId}:
 *   put:
 *     tags: [Admin - Products]
 *     summary: Update a product variant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: variantId
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
 *         description: Variant updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/products/:id/variants/:variantId',
  [
    param('id').isUUID(),
    param('variantId').isUUID(),
    body('sku').optional().trim(),
    body('variantName').optional().trim(),
    body('priceAdjustment').optional().isNumeric(),
    body('stockQuantity').optional().isInt({ min: 0 })
  ],
  controller.updateVariant
);

/**
 * @swagger
 * /api/admin/products/{id}/variants/{variantId}:
 *   delete:
 *     tags: [Admin - Products]
 *     summary: Delete a product variant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variant deleted successfully
 *       400:
 *         description: Error deleting variant
 */
router.delete(
  '/products/:id/variants/:variantId',
  [param('id').isUUID(), param('variantId').isUUID()],
  controller.deleteVariant
);

// ============================================================================
// IMAGE MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/products/{id}/images:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Add images to a product
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
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - imageUrl
 *                     - sortOrder
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Images added successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/products/:id/images',
  [
    param('id').isUUID(),
    body('images').isArray({ min: 1 }),
    body('images.*.imageUrl').isURL(),
    body('images.*.sortOrder').isInt({ min: 0 })
  ],
  controller.addImages
);

/**
 * @swagger
 * /api/admin/products/{id}/images/reorder:
 *   put:
 *     tags: [Admin - Products]
 *     summary: Reorder product images
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
 *               - imageOrders
 *             properties:
 *               imageOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - imageId
 *                     - sortOrder
 *                   properties:
 *                     imageId:
 *                       type: string
 *                       format: uuid
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Images reordered successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/products/:id/images/reorder',
  [
    param('id').isUUID(),
    body('imageOrders').isArray({ min: 1 }),
    body('imageOrders.*.imageId').isUUID(),
    body('imageOrders.*.sortOrder').isInt({ min: 0 })
  ],
  controller.reorderImages
);

/**
 * @swagger
 * /api/admin/products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Admin - Products]
 *     summary: Delete a product image
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Error deleting image
 */
router.delete(
  '/products/:id/images/:imageId',
  [param('id').isUUID(), param('imageId').isUUID()],
  controller.deleteImage
);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * @swagger
 * /api/admin/products/bulk/import:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Bulk import products via CSV
 *     responses:
 *       501:
 *         description: Not yet implemented
 */
router.post('/products/bulk/import', controller.bulkImport);

/**
 * @swagger
 * /api/admin/products/bulk/update:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Bulk update products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - data
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Bulk update completed
 *       400:
 *         description: Validation error
 */
router.post(
  '/products/bulk/update',
  [
    body('updates').isArray({ min: 1 }),
    body('updates.*.productId').isUUID(),
    body('updates.*.data').isObject()
  ],
  controller.bulkUpdate
);

/**
 * @swagger
 * /api/admin/products/bulk/delete:
 *   post:
 *     tags: [Admin - Products]
 *     summary: Bulk delete products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Bulk delete completed
 *       400:
 *         description: Validation error
 */
router.post(
  '/products/bulk/delete',
  [body('productIds').isArray({ min: 1 }), body('productIds.*').isUUID()],
  controller.bulkDelete
);

// ============================================================================
// CATEGORY MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     tags: [Admin - Categories]
 *     summary: Create a new category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentCategoryId:
 *                 type: string
 *                 format: uuid
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/categories',
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('parentCategoryId').optional({ nullable: true }).isUUID(),
    body('imageUrl').optional().isURL()
  ],
  controller.createCategory
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     tags: [Admin - Categories]
 *     summary: Update a category
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
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/categories/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('imageUrl').optional().isURL()
  ],
  controller.updateCategory
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     tags: [Admin - Categories]
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Error deleting category
 */
router.delete('/categories/:id', [param('id').isUUID()], controller.deleteCategory);

export default router;
