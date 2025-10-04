import { Request, Response } from 'express';
import { FactoryService } from '../services/factory.service';
import { validationResult } from 'express-validator';

export class FactoryController {
  private service: FactoryService;

  constructor() {
    this.service = new FactoryService();
  }

  /**
   * Create a new factory
   */
  createFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const factory = await this.service.createFactory(req.body);
      res.status(201).json({
        message: 'Factory created successfully',
        data: factory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get all factories with filters
   */
  getFactories = async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as any,
        verificationStatus: req.query.verificationStatus as any,
        city: req.query.city as string,
        province: req.query.province as string,
        district: req.query.district as string,
        officeId: req.query.officeId as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.service.getFactories(filters);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get factory by ID
   */
  getFactoryById = async (req: Request, res: Response) => {
    try {
      const factory = await this.service.getFactoryById(req.params.id);
      res.json({ data: factory });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Get factory by code
   */
  getFactoryByCode = async (req: Request, res: Response) => {
    try {
      const factory = await this.service.getFactoryByCode(req.params.code);
      res.json({ data: factory });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  /**
   * Get factories by owner ID
   */
  getFactoriesByOwner = async (req: Request, res: Response) => {
    try {
      const factories = await this.service.getFactoriesByOwner(req.params.ownerId);
      res.json({ data: factories });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Update factory
   */
  updateFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const factory = await this.service.updateFactory(req.params.id, req.body);
      res.json({
        message: 'Factory updated successfully',
        data: factory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Verify factory (Admin only)
   */
  verifyFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const factory = await this.service.verifyFactory(req.params.id, req.body);
      res.json({
        message: 'Factory verification updated successfully',
        data: factory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Update factory status
   */
  updateFactoryStatus = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const factory = await this.service.updateFactoryStatus(req.params.id, req.body);
      res.json({
        message: 'Factory status updated successfully',
        data: factory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Assign factory to an office
   */
  assignOffice = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const factory = await this.service.assignOffice(req.params.id, req.body);
      res.json({
        message: 'Office assigned successfully',
        data: factory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Delete factory (HARD DELETE)
   */
  deleteFactory = async (req: Request, res: Response) => {
    try {
      await this.service.deleteFactory(req.params.id);
      res.json({
        message: 'Factory deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}