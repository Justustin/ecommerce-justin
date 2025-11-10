import { Request, Response } from 'express';
import { LogisticsService } from '../services/logistics.service';
import { BiteshipWebhookVerification, getClientIP } from '../utils/webhook-verification';
import {
  GetRatesDTO,
  CreateShipmentDTO,
  UpdateShipmentStatusDTO,
  ShipmentFilters
} from '../types';

const service = new LogisticsService();

/**
 * Get shipping rates from multiple couriers
 *
 * SUPPORTS TWO MODES:
 * 1. Post-Order: Pass orderId (for existing orders)
 * 2. Pre-Order (GROUP BUYING): Pass productId + variantId + quantity + userId
 */
export async function getShippingRates(req: Request, res: Response) {
  try {
    const data: GetRatesDTO = {
      // For existing orders
      orderId: req.body.orderId,

      // For pre-order calculation (group buying, cart)
      productId: req.body.productId,
      variantId: req.body.variantId,
      quantity: req.body.quantity,
      userId: req.body.userId,

      // Origin (factory/warehouse)
      originPostalCode: req.body.originPostalCode,
      originLatitude: req.body.originLatitude,
      originLongitude: req.body.originLongitude,

      // Destination (customer)
      destinationPostalCode: req.body.destinationPostalCode,
      destinationLatitude: req.body.destinationLatitude,
      destinationLongitude: req.body.destinationLongitude,

      // Courier selection
      couriers: req.body.couriers
    };

    const rates = await service.getShippingRates(data);

    res.json({
      success: true,
      data: rates
    });
  } catch (error: any) {
    console.error('Get shipping rates error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Create a new shipment via Biteship
 */
export async function createShipment(req: Request, res: Response) {
  try {
    const data: CreateShipmentDTO = req.body;
    const result = await service.createShipment(data);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Shipment created successfully via Biteship'
    });
  } catch (error: any) {
    console.error('Create shipment error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(req: Request, res: Response) {
  try {
    const data: UpdateShipmentStatusDTO = req.body;
    const shipment = await service.updateShipmentStatus(data);
    
    res.json({
      success: true,
      data: shipment,
      message: 'Shipment status updated'
    });
  } catch (error: any) {
    console.error('Update shipment status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Track shipment by tracking number
 */
export async function trackShipment(req: Request, res: Response) {
  try {
    const { trackingNumber } = req.params;
    const tracking = await service.trackShipment(trackingNumber);
    
    res.json({
      success: true,
      data: tracking
    });
  } catch (error: any) {
    console.error('Track shipment error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get shipment by order ID
 */
export async function getShipmentByOrderId(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const shipment = await service.getShipmentByOrderId(orderId);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found for this order'
      });
    }
    
    res.json({
      success: true,
      data: shipment
    });
  } catch (error: any) {
    console.error('Get shipment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all shipments with filters
 */
export async function getShipments(req: Request, res: Response) {
  try {
    const filters: ShipmentFilters = {
      orderId: req.query.orderId as string,
      pickupTaskId: req.query.pickupTaskId as string,
      courierService: req.query.courierService as string,
      status: req.query.status as any,
      trackingNumber: req.query.trackingNumber as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    
    const result = await service.getShipments(filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Get shipments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle Biteship webhook
 */
export async function handleBiteshipWebhook(req: Request, res: Response) {
  try {
    // CRITICAL FIX: Verify webhook signature before processing
    const webhookSecret = process.env.BITESHIP_WEBHOOK_SECRET;

    // Option 1: HMAC signature verification (if Biteship uses this method)
    const signature = req.headers['x-biteship-signature'] as string;

    // Option 2: Token verification (if Biteship uses static token)
    // const token = req.headers['x-biteship-token'] as string;

    if (webhookSecret) {
      const payload = JSON.stringify(req.body);

      // Verify using HMAC (adjust header name based on Biteship docs)
      if (signature) {
        const isValid = BiteshipWebhookVerification.verifySignature(
          payload,
          signature,
          webhookSecret
        );

        if (!isValid) {
          console.warn('⚠️  Invalid Biteship webhook signature from IP:', getClientIP(req));
          return res.status(403).json({
            success: false,
            error: 'Invalid webhook signature'
          });
        }
      } else {
        console.warn('⚠️  Biteship webhook received without signature from IP:', getClientIP(req));

        // Uncomment to enforce signature requirement:
        // return res.status(403).json({
        //   success: false,
        //   error: 'Missing webhook signature'
        // });
      }

      // Optional: Verify timestamp to prevent replay attacks
      const timestamp = req.headers['x-biteship-timestamp'] as string;
      if (timestamp) {
        const isValidTime = BiteshipWebhookVerification.verifyTimestamp(timestamp);
        if (!isValidTime) {
          console.warn('⚠️  Biteship webhook timestamp too old (possible replay attack)');
          return res.status(403).json({
            success: false,
            error: 'Webhook timestamp too old'
          });
        }
      }
    } else {
      console.warn('⚠️  BITESHIP_WEBHOOK_SECRET not configured - webhook not verified!');
      console.warn('   Configure it in .env for security');
    }

    const payload = req.body;
    console.log('📦 Biteship webhook received:', JSON.stringify(payload, null, 2));

    const result = await service.handleBiteshipWebhook(payload);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
