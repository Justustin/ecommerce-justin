import { LogisticsRepository } from '../repositories/logistics.repository';
import { biteshipAPI } from '../utils/biteship-api';
import {
  GetRatesDTO,
  CreateShipmentDTO,
  UpdateShipmentStatusDTO,
  ShipmentFilters,
  TrackingInfo,
  RatesResponse
} from '../types';
import { prisma } from '@repo/database';
import axios from 'axios';
import { shipment_status } from '@repo/database';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

export class LogisticsService {
  private repository: LogisticsRepository;

  constructor() {
    this.repository = new LogisticsRepository();
  }

  async getShippingRates(data: GetRatesDTO): Promise<RatesResponse> {
    let items: any[] = [];
    let destinationPostalCode = data.destinationPostalCode;
    let originPostalCode = data.originPostalCode;

    // SCENARIO 1: Calculate rates from existing order (post-payment)
    if (data.orderId) {
      const order = await prisma.orders.findUnique({
        where: { id: data.orderId },
        include: {
          order_items: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      let totalWeight = 0;
      let totalValue = 0;
      let maxLength = 0;
      let maxWidth = 0;
      let maxHeight = 0;
      const itemNames: string[] = [];

      order.order_items.forEach(item => {
        const snapshot = item.product_snapshot as any;
        const product = snapshot?.product || {};
        const variant = snapshot?.variant || {};

        const itemWeight = Number(variant.weight_grams || product.weight_grams || 500);
        totalWeight += itemWeight * item.quantity;
        totalValue += Number(item.unit_price) * item.quantity;

        const length = Number(product.length_cm || 10);
        const width = Number(product.width_cm || 10);
        const height = Number(product.height_cm || 10);

        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
        maxHeight = Math.max(maxHeight, height);

        itemNames.push(`${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`);
      });

      items = [{
        name: itemNames.join(', ') || 'Package',
        description: `${order.order_items.length} item(s)`,
        value: totalValue,
        length: maxLength,
        width: maxWidth,
        height: maxHeight,
        weight: totalWeight,
        quantity: 1
      }];

      destinationPostalCode = destinationPostalCode || Number(order.shipping_postal_code);
    }
    // SCENARIO 2: Calculate rates from product/variant (pre-order - GROUP BUYING!)
    else if (data.productId) {
      const quantity = data.quantity || 1;

      // Fetch product and variant data
      const product = await prisma.products.findUnique({
        where: { id: data.productId },
        include: {
          product_variants: data.variantId ? {
            where: { id: data.variantId }
          } : false,
          factories: {
            select: {
              id: true,
              factory_name: true,
              city: true,
              postal_code: true
              // Note: factories table doesn't have latitude/longitude fields
            }
          }
        }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Get product weight/dimensions
      let weight = 500; // default 500g
      let length = 10;  // default 10cm
      let width = 10;
      let height = 10;
      let value = Number(product.price);
      let itemName = product.name;

      if (data.variantId && product.product_variants && product.product_variants.length > 0) {
        const variant = product.product_variants[0];
        weight = Number(variant.weight_grams) || weight;
        value = Number(variant.price) || value;
        itemName = `${product.name} (${variant.name})`;
      } else {
        weight = Number(product.weight_grams) || weight;
        length = Number(product.length_cm) || length;
        width = Number(product.width_cm) || width;
        height = Number(product.height_cm) || height;
      }

      items = [{
        name: itemName,
        description: `${quantity} item(s)`,
        value: value * quantity,
        length,
        width,
        height,
        weight: weight * quantity,
        quantity: 1
      }];

      // Get origin from factory if not provided
      if (!originPostalCode && product.factories) {
        originPostalCode = Number(product.factories.postal_code);
        // Factory doesn't have coordinates - postal code is sufficient for Biteship
      }

      // Get destination from user's default address if userId provided
      if (data.userId && !destinationPostalCode) {
        const userAddress = await prisma.user_addresses.findFirst({
          where: {
            user_id: data.userId,
            is_default: true
          },
          select: {
            postal_code: true
            // Note: user_addresses table doesn't have latitude/longitude fields
            // Postal code is sufficient for Biteship API
          }
        });

        if (userAddress) {
          destinationPostalCode = Number(userAddress.postal_code);
          // Postal code is sufficient for Biteship - coordinates not required
        }
      }
    }
    // SCENARIO 3: Fallback - use dummy values (should not happen in production)
    else {
      items = [{
        name: 'Package',
        description: 'Order package',
        value: 100000,
        length: 10,
        width: 10,
        height: 10,
        weight: 1000,
        quantity: 1
      }];
    }

    // Validate required fields
    if (!destinationPostalCode) {
      throw new Error('Destination postal code is required. Provide either orderId, userId with default address, or destinationPostalCode directly.');
    }

    if (!originPostalCode) {
      throw new Error('Origin postal code is required. Provide either orderId, productId with factory data, or originPostalCode directly.');
    }

    const ratesResponse = await biteshipAPI.getRates({
      origin_postal_code: originPostalCode,
      origin_latitude: data.originLatitude,
      origin_longitude: data.originLongitude,
      destination_postal_code: destinationPostalCode,
      destination_latitude: data.destinationLatitude,
      destination_longitude: data.destinationLongitude,
      couriers: data.couriers || 'jne,jnt,sicepat,anteraja',
      items
    });

    return ratesResponse;
  }

  async createShipment(data: CreateShipmentDTO) {
    const order = await prisma.orders.findUnique({
      where: { id: data.orderId },
      include: {
        order_items: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'ready_for_pickup' && order.status !== 'picked_up' && order.status !== 'paid' && order.status !== 'processing') {
      throw new Error(`Cannot create shipment for order with status: ${order.status}`);
    }

    const existing = await this.repository.findByOrderId(data.orderId);
    if (existing) {
      throw new Error('Shipment already exists for this order');
    }

    let items: any[];
    
    if (data.items && data.items.length > 0) {
      items = data.items;
    } else {
      let totalWeight = 0;
      let totalValue = 0;
      let maxLength = 0;
      let maxWidth = 0;
      let maxHeight = 0;
      const itemNames: string[] = [];

      order.order_items.forEach(item => {
        const snapshot = item.product_snapshot as any;
        const product = snapshot?.product || {};
        const variant = snapshot?.variant || {};
        
        const itemWeight = Number(variant.weight_grams || product.weight_grams || 500);
        totalWeight += itemWeight * item.quantity;
        totalValue += Number(item.unit_price) * item.quantity;
        
        const length = Number(product.length_cm || 10);
        const width = Number(product.width_cm || 10);
        const height = Number(product.height_cm || 10);
        
        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
        maxHeight = Math.max(maxHeight, height);
        
        itemNames.push(`${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`);
      });

      items = [{
        name: itemNames.join(', ') || 'Package',
        description: `${order.order_items.length} item(s)`,
        value: totalValue,
        length: maxLength,
        width: maxWidth,
        height: maxHeight,
        weight: totalWeight,
        quantity: 1
      }];
    }

    const biteshipOrder = await biteshipAPI.createOrder({
      shipper_contact_name: data.shipperContactName,
      shipper_contact_phone: data.shipperContactPhone,
      shipper_contact_email: data.shipperContactEmail,
      shipper_organization: data.shipperOrganization,
      
      origin_contact_name: data.originContactName,
      origin_contact_phone: data.originContactPhone,
      origin_address: data.originAddress,
      origin_postal_code: data.originPostalCode,
      origin_note: data.originNote,
      origin_coordinate: data.originLatitude && data.originLongitude ? {
        latitude: data.originLatitude,
        longitude: data.originLongitude
      } : undefined,
      
      destination_contact_name: data.destinationContactName,
      destination_contact_phone: data.destinationContactPhone,
      destination_contact_email: data.destinationContactEmail,
      destination_address: data.destinationAddress,
      destination_postal_code: data.destinationPostalCode,
      destination_note: data.destinationNote,
      destination_coordinate: data.destinationLatitude && data.destinationLongitude ? {
        latitude: data.destinationLatitude,
        longitude: data.destinationLongitude
      } : undefined,
      
      courier_company: data.courierCompany,
      courier_type: data.courierType,
      courier_insurance: data.courierInsurance,
      
      delivery_type: data.deliveryType,
      delivery_date: data.deliveryDate,
      delivery_time: data.deliveryTime,
      order_note: data.orderNote,
      
      items,
      reference_id: order.order_number
    });

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const maxLength = Math.max(...items.map(i => i.length));
    const maxWidth = Math.max(...items.map(i => i.width));
    const maxHeight = Math.max(...items.map(i => i.height));

    const shipment = await this.repository.createShipment({
      orderId: data.orderId,
      pickupTaskId: data.pickupTaskId,
      biteshipOrderId: biteshipOrder.id,
      courierService: data.courierCompany,
      serviceType: data.courierType,
      trackingNumber: biteshipOrder.courier.waybill_id,
      senderName: data.originContactName,
      senderPhone: data.originContactPhone,
      senderAddress: data.originAddress,
      senderCity: data.originAddress.split(',').pop()?.trim() || '',
      senderPostalCode: data.originPostalCode.toString(),
      recipientName: data.destinationContactName,
      recipientPhone: data.destinationContactPhone,
      recipientAddress: data.destinationAddress,
      recipientCity: data.destinationAddress.split(',').pop()?.trim() || order.shipping_city,
      recipientPostalCode: data.destinationPostalCode.toString(),
      weightGrams: totalWeight,
      lengthCm: maxLength,
      widthCm: maxWidth,
      heightCm: maxHeight,
      shippingCost: biteshipOrder.price,
      insuranceCost: data.courierInsurance,
      biteshipResponse: biteshipOrder
    });

    await this.repository.createTrackingEvent({
      shipmentId: shipment.id,
      status: 'pending',
      description: 'Shipment created and awaiting pickup',
      location: data.originAddress
    });

    const currentShippingCost = Number(order.shipping_cost || 0);
    if (!order.shipping_cost || currentShippingCost === 0) {
      await prisma.orders.update({
        where: { id: data.orderId },
        data: {
          shipping_cost: biteshipOrder.price,
          updated_at: new Date()
        }
      });
    }

    return shipment;
  }

  async getTracking(shipmentId: string) {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const biteshipResponse = shipment.courier_api_response as any;
    const biteshipOrderId = biteshipResponse?.id;

    if (!biteshipOrderId) {
      throw new Error('Biteship order ID not found in shipment');
    }

    const biteshipTracking = await biteshipAPI.trackOrder(biteshipOrderId);

    if (biteshipTracking.status && biteshipTracking.status !== shipment.status) {
      const mappedStatus = this.mapBiteshipStatus(biteshipTracking.status);
      await this.updateShipmentStatus({
        shipmentId: shipment.id,
        status: mappedStatus,
        description: biteshipTracking.history[0]?.note || 'Status updated',
        location: biteshipTracking.history[0]?.service_type,
        eventTime: new Date(biteshipTracking.history[0]?.updated_at)
      });
    }

    return biteshipTracking as TrackingInfo;
  }

  async updateShipmentStatus(data: UpdateShipmentStatusDTO) {
    const shipment = await this.repository.findById(data.shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    await this.repository.updateStatus(data.shipmentId, data.status, {
      actual_delivery_date: data.status === 'delivered' ? new Date() : undefined,
      delivery_photo_url: data.deliveryPhotoUrl,
      recipient_signature_url: data.recipientSignatureUrl,
      received_by: data.receivedBy
    });

    await this.repository.createTrackingEvent({
      shipmentId: data.shipmentId,
      status: data.status,
      description: data.description,
      location: data.location,
      eventTime: data.eventTime
    });

    await this.updateOrderStatus(shipment.order_id, data.status);

    return this.repository.findById(data.shipmentId);
  }

  async handleBiteshipWebhook(payload: any) {
    const orderId = payload.order_id;
    const waybillId = payload.courier?.waybill_id;

    if (!waybillId) {
      console.warn('Webhook payload missing waybill_id');
      return { message: 'Invalid webhook payload' };
    }

    const shipment = await this.repository.findByTrackingNumber(waybillId);
    if (!shipment) {
      console.warn(`Shipment not found for waybill: ${waybillId}`);
      return { message: 'Shipment not found' };
    }

    const internalStatus = this.mapBiteshipStatus(payload.status);

    await this.updateShipmentStatus({
      shipmentId: shipment.id,
      status: internalStatus,
      description: payload.history?.[0]?.note || 'Status updated from webhook',
      location: payload.history?.[0]?.service_type
    });

    return { message: 'Webhook processed successfully' };
  }

  async getShipmentByOrderId(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  async getShipments(filters: ShipmentFilters) {
    return this.repository.findAll(filters);
  }

  async generateShippingLabel(shipmentId: string, format: 'pdf' | 'html' = 'pdf') {
    const shipment = await this.repository.findById(shipmentId);
    
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const labelData = {
      senderName: shipment.sender_name,
      senderAddress: shipment.sender_address,
      senderCity: shipment.sender_city,
      senderPostalCode: shipment.sender_postal_code || '',
      senderPhone: shipment.sender_phone,
      recipientName: shipment.recipient_name,
      recipientAddress: shipment.recipient_address,
      recipientCity: shipment.recipient_city,
      recipientPostalCode: shipment.recipient_postal_code || '',
      recipientPhone: shipment.recipient_phone,
      trackingNumber: shipment.tracking_number,
      courierName: shipment.courier_service.toUpperCase(),
      serviceType: shipment.service_type || 'Regular',
      orderNumber: shipment.orders?.order_number || '',
      shippingCost: Number(shipment.shipping_cost),
      weight: shipment.weight_grams / 1000,
      quantity: shipment.orders?.order_items?.length || 1,
      itemDescription: shipment.orders?.order_items?.map(item => item.product_name).join(', ') || '',
      shippingDate: new Date(shipment.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    };

    // TODO: Generate actual PDF or HTML label using a template library
    // For now, return the label data
    return labelData;
  }

  private mapBiteshipStatus(biteshipStatus: string): shipment_status {
    const statusMap: Record<string, shipment_status> = {
      'confirmed': 'pending',
      'allocated': 'pending',
      'picking_up': 'pending',
      'picked': 'picked_up',
      'dropping_off': 'in_transit',
      'on_transit': 'in_transit',
      'delivering': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'failed',
      'rejected': 'failed',
      'courier_not_found': 'failed',
      'returned': 'returned'
    };

    return statusMap[biteshipStatus.toLowerCase()] || 'in_transit';
  }

  private async updateOrderStatus(orderId: string, shipmentStatus: shipment_status) {
    const statusMap: Record<shipment_status, string> = {
      'pending': 'ready_for_pickup',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'out_for_delivery': 'in_transit',
      'delivered': 'delivered',
      'failed': 'processing',
      'returned': 'processing'
    };

    const orderStatus = statusMap[shipmentStatus];
    if (!orderStatus) return;

    try {
      await axios.post(`${ORDER_SERVICE_URL}/api/orders/status-callback`, {
        orderId,
        newStatus: orderStatus
      });
      console.log(`✅ Order ${orderId} status updated to ${orderStatus}`);
    } catch (error: any) {
      console.error(`❌ Failed to update order status:`, error.message);
    }
  }

  private async sendShipmentNotification(
    userId: string,
    orderId: string,
    status: string,
    trackingNumber: string,
    description?: string
  ) {
    try {
      const order = await prisma.orders.findUnique({
        where: { id: orderId },
        include: {
          order_items: {
            take: 1,
            select: { product_name: true }
          }
        }
      });

      // Map shipment status to notification type
      const notificationTypeMap: Record<string, string> = {
        'picked_up': 'picked_up',
        'in_transit': 'shipped',
        'out_for_delivery': 'shipped',
        'delivered': 'delivered'
      };

      const notificationType = notificationTypeMap[status] || 'shipped';

      await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
        userId: userId,
        type: notificationType,
        title: `Order ${status.replace(/_/g, ' ')}`,
        message: description || `Your order ${order?.order_number} is ${status.replace(/_/g, ' ')}. Tracking: ${trackingNumber}`,
        actionUrl: `/orders/${orderId}`,
        relatedId: orderId
      });

      console.log(`✅ Shipment notification sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to send shipment notification:', error);
    }
  }
}