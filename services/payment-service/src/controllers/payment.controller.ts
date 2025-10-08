import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';

export class PaymentController {
  private paymentService: PaymentService;
  private refundService: RefundService;

  constructor() {
    this.paymentService = new PaymentService();
    this.refundService = new RefundService();
  }

  createPayment = async (req: Request, res: Response) => {
    try {
      const result = await this.paymentService.createPayment(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getPaymentByOrder = async (req: Request, res: Response) => {
    try {
      const payment = await this.paymentService.getPaymentByOrderId(req.params.orderId);
      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  };

  releaseEscrow = async (req: Request, res: Response) => {
    try {
      const result = await this.paymentService.releaseEscrow(req.body.groupSessionId);
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

  refundSession = async (req: Request, res: Response) => {
    try {
      const results = await this.refundService.refundSession(req.body.groupSessionId);
      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getEligibleForSettlement = async (req: Request, res: Response) => {
    try {
      const { periodStart, periodEnd } = req.body;
      const payments = await this.paymentService.findEligibleForSettlement(
        new Date(periodStart),
        new Date(periodEnd)
      );
      res.json({
        success: true,
        data: payments
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}