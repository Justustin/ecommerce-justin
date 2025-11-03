import { prisma } from '@repo/database';
import { ShipmentFilters, PaginatedResponse } from '../types';
import { shipment_status } from '@repo/database';

export class LogisticsRepository {
  /**
   * Create shipment record in database
   */
  async createShipment(data: {
    orderId: string;
    pickupTaskId?: string;
    biteshipOrderId: string;
    courierService: string;
    serviceType: string;
    trackingNumber: string;
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    senderPostalCode?: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity: string;
    recipientPostalCode?: string;
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    shippingCost: number;
    insuranceCost?: number;
    estimatedDeliveryDate?: Date;
    biteshipResponse?: any;
  }) {
    return prisma.shipments.create({
      data: {
        order_id: data.orderId,
        pickup_task_id: data.pickupTaskId || null,
        courier_service: data.courierService as any,
        service_type: data.serviceType,
        tracking_number: data.trackingNumber,
        status: 'pending',
        
        sender_name: data.senderName,
        sender_phone: data.senderPhone,
        sender_address: data.senderAddress,
        sender_city: data.senderCity,
        sender_postal_code: data.senderPostalCode,
        
        recipient_name: data.recipientName,
        recipient_phone: data.recipientPhone,
        recipient_address: data.recipientAddress,
        recipient_city: data.recipientCity,
        recipient_postal_code: data.recipientPostalCode,
        
        weight_grams: data.weightGrams,
        length_cm: data.lengthCm,
        width_cm: data.widthCm,
        height_cm: data.heightCm,
        
        shipping_cost: data.shippingCost,
        insurance_cost: data.insuranceCost || 0,
        estimated_delivery_date: data.estimatedDeliveryDate,
        
        courier_api_response: data.biteshipResponse || {},
      },
      include: {
        orders: {
          select: {
            order_number: true,
            user_id: true
          }
        }
      }
    });
  }

    async findById(id: string) {
    return prisma.shipments.findUnique({
        where: { id },
        include: {
        orders: {
            include: {
            order_items: true
            }
        },
        pickup_tasks: {
            include: {
            factories: true
            }
        },
        shipment_tracking_events: {
            orderBy: { event_time: 'desc' }
        }
        }
    });
    }

  async findByTrackingNumber(trackingNumber: string) {
    return prisma.shipments.findUnique({
      where: { tracking_number: trackingNumber },
      include: {
        orders: true,
        shipment_tracking_events: {
          orderBy: { event_time: 'desc' }
        }
      }
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.shipments.findFirst({
      where: { order_id: orderId },
      include: {
        shipment_tracking_events: {
          orderBy: { event_time: 'desc' }
        }
      }
    });
  }

  async findAll(filters: ShipmentFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.orderId) where.order_id = filters.orderId;
    if (filters.pickupTaskId) where.pickup_task_id = filters.pickupTaskId;
    if (filters.courierService) where.courier_service = filters.courierService;
    if (filters.status) where.status = filters.status;
    if (filters.trackingNumber) {
      where.tracking_number = { contains: filters.trackingNumber };
    }
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    const [shipments, total] = await Promise.all([
      prisma.shipments.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          orders: {
            select: {
              order_number: true,
              shipping_name: true
            }
          }
        }
      }),
      prisma.shipments.count({ where })
    ]);

    return {
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateStatus(
    shipmentId: string,
    status: shipment_status,
    additionalData?: any
  ) {
    return prisma.shipments.update({
      where: { id: shipmentId },
      data: {
        status,
        updated_at: new Date(),
        ...additionalData
      }
    });
  }

  async createTrackingEvent(data: {
    shipmentId: string;
    status: string;
    description: string;
    location?: string;
    eventTime?: Date;
  }) {
    return prisma.shipment_tracking_events.create({
      data: {
        shipment_id: data.shipmentId,
        status: data.status,
        description: data.description,
        location: data.location,
        event_time: data.eventTime || new Date()
      }
    });
  }

  async getTrackingHistory(shipmentId: string) {
    return prisma.shipment_tracking_events.findMany({
      where: { shipment_id: shipmentId },
      orderBy: { event_time: 'desc' }
    });
  }
}