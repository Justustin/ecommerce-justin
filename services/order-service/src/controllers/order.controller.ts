import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';

export class OrderController {
  private service: OrderService;

  constructor() {
    this.service = new OrderService();
  }

  createOrder = async (req: Request, res: Response) => {
    try {
      const result = await this.service.createOrder(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  createBulkOrders = async (req: Request, res: Response) => {
    try {
      const result = await this.service.createBulkOrdersFromSession(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getOrder = async (req: Request, res: Response) => {
    try {
      const order = await this.service.getOrder(req.params.id);
      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  };

  getOrderByNumber = async (req: Request, res: Response) => {
    try {
      const order = await this.service.getOrderByNumber(req.params.orderNumber);
      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  };

  getOrders = async (req: Request, res: Response) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        factoryId: req.query.factoryId as string,
        status: req.query.status as string,
        isGroupBuying: req.query.isGroupBuying === 'true' ? true : req.query.isGroupBuying === 'false' ? false : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const result = await this.service.getOrders(filters);
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    try {
      const order = await this.service.updateOrderStatus({
        orderId: req.params.id,
        ...req.body
      });
      res.json({
        success: true,
        message: 'Order status updated',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  updateShippingCost = async (req: Request, res: Response) => {
    try {
      const { shippingCost, taxAmount } = req.body;
      const order = await this.service.updateShippingCost(
        req.params.id,
        shippingCost,
        taxAmount
      );
      res.json({
        success: true,
        message: 'Shipping cost updated',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  cancelOrder = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const order = await this.service.cancelOrder(
        req.params.id,
        userId
      );
      res.json({
        success: true,
        message: 'Order cancelled',
        data: order
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getOrderStats = async (req: Request, res: Response) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        factoryId: req.query.factoryId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const stats = await this.service.getOrderStats(filters);
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getUserOrders = async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const result = await this.service.getUserOrders(
        req.params.userId,
        page,
        limit
      );
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getFactoryOrders = async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const result = await this.service.getFactoryOrders(
        req.params.factoryId,
        page,
        limit
      );
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}