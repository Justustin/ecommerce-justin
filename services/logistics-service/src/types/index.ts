import { courier_service, shipment_status } from '@repo/database';

// ==================== Rate Comparison ====================
export interface GetRatesDTO {
  orderId: string;
  originPostalCode?: number;
  originLatitude?: number;
  originLongitude?: number;
  destinationPostalCode?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  couriers?: string; // "jne,jnt,sicepat,anteraja"
}

export interface CourierRate {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  description: string;
  duration: string; // "1-2 days"
  shipment_duration_range: string;
  shipment_duration_unit: string;
  price: number;
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
  available_for_insurance: boolean;
  company: string;
  courier_insurance_fee?: number;
  type: string;
}

export interface RatesResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  origin: any;
  destination: any;
  pricing: CourierRate[];
}

// ==================== Shipment Creation ====================
export interface CreateShipmentDTO {
  orderId: string;
  pickupTaskId?: string;
  
  // Selected courier from rates
  courierCompany: string; // "jne", "jnt", "sicepat"
  courierType: string; // "reg", "express", "oke"
  courierInsurance?: number;
  
  // Origin (Factory/Warehouse)
  shipperContactName: string;
  shipperContactPhone: string;
  shipperContactEmail?: string;
  shipperOrganization?: string;
  originContactName: string;
  originContactPhone: string;
  originAddress: string;
  originPostalCode: number;
  originNote?: string;
  originLatitude?: number;
  originLongitude?: number;
  
  // Destination (Customer)
  destinationContactName: string;
  destinationContactPhone: string;
  destinationContactEmail?: string;
  destinationAddress: string;
  destinationPostalCode: number;
  destinationNote?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  
  // Delivery options
  deliveryType: 'now' | 'scheduled';
  deliveryDate?: string;
  deliveryTime?: string;
  orderNote?: string;
  
  // Items
  items: Array<{
    name: string;
    description?: string;
    value: number;
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
  }>;
}

export interface BiteshipOrderResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  id: string; // Biteship order ID
  shipper: any;
  origin: any;
  destination: any;
  courier: {
    company: string;
    name: string;
    type: string;
    link: string;
    waybill_id: string;
    tracking_id?: string;
  };
  delivery: any;
  reference_id: string;
  items: any[];
  price: number;
  status: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

// ==================== Tracking ====================
export interface TrackingInfo {
  success: boolean;
  object: string;
  message: string;
  code: number;
  id: string;
  waybill_id: string;
  courier: {
    company: string;
    name: string;
    phone: string;
  };
  origin: any;
  destination: any;
  history: Array<{
    note: string;
    updated_at: string;
    status: string;
    service_type?: string;
  }>;
  link: string;
  order_id: string;
  status: string;
}

// ==================== Database Models ====================
export interface UpdateShipmentStatusDTO {
  shipmentId: string;
  status: shipment_status;
  description: string;
  location?: string;
  eventTime?: Date;
  deliveryPhotoUrl?: string;
  recipientSignatureUrl?: string;
  receivedBy?: string;
}

export interface ShipmentFilters {
  orderId?: string;
  pickupTaskId?: string;
  courierService?: string;
  status?: shipment_status;
  trackingNumber?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== LOGISTICS INTEGRATION TYPES ====================

export interface ShippingRateOption {
  courier_code: string;
  courier_service_code: string;
  courier_name: string;
  courier_service_name: string;
  duration: string;
  price: number;
}

export interface CalculateShippingDTO {
  orderId?: string;
  items?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  destinationPostalCode: string;
  destinationCity?: string;
}

export interface CreateShipmentDTO {
  orderId: string;
  courierCompany: string;
  courierType: string;
}

export interface ShipmentData {
  id: string;
  tracking_number: string;
  status: string;
  courier_service: string;
  estimated_delivery_date?: string;
  tracking_events: Array<{
    status: string;
    note: string;
    updated_at: string;
  }>;
}

export interface UpdateOrderStatusFromLogisticsDTO {
  orderId: string;
  newStatus: string;
  trackingNumber?: string;
}