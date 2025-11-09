import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { GroupBuyingRepository } from '../repositories/group.buying.repositories';

export class AdminController {
  private repository: GroupBuyingRepository;

  constructor() {
    this.repository = new GroupBuyingRepository();
  }

  /**
   * Bulk configure grosir settings for a product
   * Creates both bundle config and warehouse tolerance in one transaction
   */
  configureProduct = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, bundleConfigs, warehouseTolerances } = req.body;

      // Validate that each variant in bundleConfigs has a matching tolerance
      const bundleVariants = new Set(
        bundleConfigs.map((bc: any) => bc.variantId || 'null')
      );
      const toleranceVariants = new Set(
        warehouseTolerances.map((wt: any) => wt.variantId || 'null')
      );

      for (const variant of bundleVariants) {
        if (!toleranceVariants.has(variant)) {
          return res.status(400).json({
            error: `Missing warehouse tolerance for variant: ${variant}`
          });
        }
      }

      // Delete existing configurations
      await Promise.all([
        this.repository.deleteBundleConfig(productId),
        this.repository.deleteWarehouseTolerance(productId)
      ]);

      // Create new configurations
      const [createdBundles, createdTolerances] = await Promise.all([
        Promise.all(
          bundleConfigs.map((config: any) =>
            this.repository.createBundleConfig({
              productId,
              variantId: config.variantId || null,
              unitsPerBundle: config.unitsPerBundle,
              notes: config.notes
            })
          )
        ),
        Promise.all(
          warehouseTolerances.map((tolerance: any) =>
            this.repository.createWarehouseTolerance({
              productId,
              variantId: tolerance.variantId || null,
              maxExcessUnits: tolerance.maxExcessUnits,
              clearanceRateEstimate: tolerance.clearanceRateEstimate,
              notes: tolerance.notes
            })
          )
        )
      ]);

      res.status(201).json({
        message: 'Product grosir configuration created successfully',
        data: {
          bundleConfigs: createdBundles,
          warehouseTolerances: createdTolerances
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Create bundle configuration for a product variant
   */
  createBundleConfig = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, variantId, unitsPerBundle, notes } = req.body;

      const config = await this.repository.createBundleConfig({
        productId,
        variantId: variantId || null,
        unitsPerBundle,
        notes
      });

      res.status(201).json({
        message: 'Bundle configuration created successfully',
        data: config
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get bundle configurations for a product
   */
  getBundleConfig = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const configs = await this.repository.getBundleConfig(productId);

      res.json({
        message: 'Bundle configurations retrieved successfully',
        data: configs
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Update bundle configuration
   */
  updateBundleConfig = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { unitsPerBundle, notes } = req.body;

      const config = await this.repository.updateBundleConfig(id, {
        unitsPerBundle,
        notes
      });

      res.json({
        message: 'Bundle configuration updated successfully',
        data: config
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Delete all bundle configurations for a product
   */
  deleteBundleConfig = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      await this.repository.deleteBundleConfig(productId);

      res.json({
        message: 'Bundle configurations deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Create warehouse tolerance for a product variant
   */
  createWarehouseTolerance = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        productId,
        variantId,
        maxExcessUnits,
        clearanceRateEstimate,
        notes
      } = req.body;

      const tolerance = await this.repository.createWarehouseTolerance({
        productId,
        variantId: variantId || null,
        maxExcessUnits,
        clearanceRateEstimate,
        notes
      });

      res.status(201).json({
        message: 'Warehouse tolerance created successfully',
        data: tolerance
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get warehouse tolerances for a product
   */
  getWarehouseTolerance = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const tolerances = await this.repository.getWarehouseTolerance(productId);

      res.json({
        message: 'Warehouse tolerances retrieved successfully',
        data: tolerances
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Update warehouse tolerance
   */
  updateWarehouseTolerance = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { maxExcessUnits, clearanceRateEstimate, notes } = req.body;

      const tolerance = await this.repository.updateWarehouseTolerance(id, {
        maxExcessUnits,
        clearanceRateEstimate,
        notes
      });

      res.json({
        message: 'Warehouse tolerance updated successfully',
        data: tolerance
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Delete all warehouse tolerances for a product
   */
  deleteWarehouseTolerance = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      await this.repository.deleteWarehouseTolerance(productId);

      res.json({
        message: 'Warehouse tolerances deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get complete grosir configuration for a product
   * Returns both bundle configs and warehouse tolerances
   */
  getGrosirConfig = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const config = await this.repository.getGrosirConfig(productId);

      res.json({
        message: 'Grosir configuration retrieved successfully',
        data: config
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };
}
