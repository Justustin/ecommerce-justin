import { Request, Response } from 'express';
import { LogisticsService } from '../services/logistics.service';
import { 
  GetRatesDTO,
  CreateShipmentDTO, 
  UpdateShipmentStatusDTO,
  ShipmentFilters 
} from '../types';

const service = new LogisticsService();

/**
 * Get shipping rates from multiple couriers
 */
export async function getShippingRates(req: Request, res: Response) {
  try {
    const data: GetRatesDTO = {
      orderId: req.body.orderId,
      originPostalCode: req.body.originPostalCode,
      originLatitude: req.body.originLatitude,
      originLongitude: req.body.originLongitude,
      destinationPostalCode: req.body.destinationPostalCode,
      destinationLatitude: req.body.destinationLatitude,
      destinationLongitude: req.body.destinationLongitude,
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
