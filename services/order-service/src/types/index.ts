export interface CreateOrderDTO {
  userId: string;
  groupSessionId?: string;
  items: OrderItemDTO[];
  shippingAddress: ShippingAddressDTO;
  shippingNotes?: string;
  discountAmount?: number;
}

export interface OrderItemDTO {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface ShippingAddressDTO {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode?: string;
  address: string;
}

export interface UpdateOrderStatusDTO {
  orderId: string;
  newStatus: 
    | 'pending_payment' 
    | 'paid' 
    | 'processing' 
    | 'ready_for_pickup' 
    | 'picked_up' 
    | 'in_transit' 
    | 'delivered' 
    | 'cancelled' 
    | 'refunded' 
    | 'failed';
  estimatedDeliveryDate?: Date;
  notes: string | null;
}

export interface CreateBulkOrdersDTO {
  groupSessionId: string;
  participants: {
    userId: string;
    participantId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface OrderFilters {
  userId?: string;
  factoryId?: string;
  status?: string;
  isGroupBuying?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
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

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

export interface ProductSnapshot {
  product: {
    id: string;
    name: string;
    sku: string;
    description?: string;
    primary_image_url?: string;
    factory_id: string;
    base_price: number;
    weight_grams?: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  variant?: {
    id: string;
    variant_name: string;
    sku: string;
    variant_price?: number;
  };
  factory: {
    id: string;
    factory_name: string;
    city?: string;
  };
}
export interface CreatePaymentDTO {
  userId: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  expiresAt?: string;
  isEscrow?: boolean;
  factoryId?: string;
}