import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ProductRepository } from '../repositories/product.repository';

export class AdminController {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Admin: Create product
   */
  createProduct = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await this.repository.create(req.body);
      res.status(201).json({
        message: 'Product created successfully',
        data: product
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Update product
   */
  updateProduct = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await this.repository.update(req.params.id, req.body);
      res.json({
        message: 'Product updated successfully',
        data: product
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete product (soft delete)
   */
  deleteProduct = async (req: Request, res: Response) => {
    try {
      await this.repository.delete(req.params.id);
      res.json({
        message: 'Product deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Add product variant
   */
  createVariant = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const variant = await this.repository.createVariant({
        ...req.body,
        productId: req.params.id
      });

      res.status(201).json({
        message: 'Variant created successfully',
        data: variant
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Update product variant
   */
  updateVariant = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { variantId } = req.params;
      const variant = await this.repository.updateVariant(variantId, req.body);

      res.json({
        message: 'Variant updated successfully',
        data: variant
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete variant
   */
  deleteVariant = async (req: Request, res: Response) => {
    try {
      const { variantId } = req.params;
      await this.repository.deleteVariant(variantId);

      res.json({
        message: 'Variant deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Upload product images
   */
  addImages = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { images } = req.body;

      const productImages = await this.repository.addImages(id, images);

      res.status(201).json({
        message: 'Images added successfully',
        data: productImages
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Reorder product images
   */
  reorderImages = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { imageOrders } = req.body; // Array of { imageId: string, sortOrder: number }

      // Update each image's sort order
      const { prisma } = await import('@repo/database');
      await Promise.all(
        imageOrders.map((order: { imageId: string; sortOrder: number }) =>
          prisma.product_images.update({
            where: { id: order.imageId },
            data: { display_order: order.sortOrder }
          })
        )
      );

      res.json({
        message: 'Images reordered successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete product image
   */
  deleteImage = async (req: Request, res: Response) => {
    try {
      const { imageId } = req.params;

      const { prisma } = await import('@repo/database');
      await prisma.product_images.delete({
        where: { id: imageId }
      });

      res.json({
        message: 'Image deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Bulk import products via CSV
   * TODO: Implement CSV parsing logic
   */
  bulkImport = async (req: Request, res: Response) => {
    try {
      // TODO: Parse CSV file and bulk insert products
      res.status(501).json({
        message: 'Bulk import not yet implemented'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Bulk update products
   */
  bulkUpdate = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body; // Array of { productId: string, data: UpdateProductDTO }

      const results = await Promise.all(
        updates.map(async (update: { productId: string; data: any }) => {
          try {
            return await this.repository.update(update.productId, update.data);
          } catch (error: any) {
            return { productId: update.productId, error: error.message };
          }
        })
      );

      res.json({
        message: 'Bulk update completed',
        data: results
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Bulk delete products
   */
  bulkDelete = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productIds } = req.body; // Array of product IDs

      const results = await Promise.all(
        productIds.map(async (productId: string) => {
          try {
            await this.repository.delete(productId);
            return { productId, success: true };
          } catch (error: any) {
            return { productId, success: false, error: error.message };
          }
        })
      );

      res.json({
        message: 'Bulk delete completed',
        data: results
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Create category
   */
  createCategory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, parentCategoryId, iconUrl } = req.body;

      const { prisma } = await import('@repo/database');

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const category = await prisma.categories.create({
        data: {
          name,
          slug,
          parent_id: parentCategoryId || null,
          icon_url: iconUrl || null
        }
      });

      res.status(201).json({
        message: 'Category created successfully',
        data: category
      });
    } catch (error: any) {
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Category with this name already exists',
          field: error.meta?.target?.[0]
        });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Update category
   */
  updateCategory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, iconUrl } = req.body;

      const { prisma } = await import('@repo/database');

      // Prepare update data
      const updateData: any = {
        updated_at: new Date()
      };

      if (name) {
        updateData.name = name;
        // Regenerate slug if name changes
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      if (iconUrl !== undefined) {
        updateData.icon_url = iconUrl;
      }

      const category = await prisma.categories.update({
        where: { id },
        data: updateData
      });

      res.json({
        message: 'Category updated successfully',
        data: category
      });
    } catch (error: any) {
      // Handle Prisma errors
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Category with this name already exists',
          field: error.meta?.target?.[0]
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete category
   */
  deleteCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { prisma } = await import('@repo/database');
      await prisma.categories.delete({
        where: { id }
      });

      res.json({
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
