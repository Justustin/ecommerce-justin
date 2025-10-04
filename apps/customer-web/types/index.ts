// ============================================================================
// ENUMS - Match Prisma schema enums exactly
// ============================================================================

export enum UserRole {
  CUSTOMER = 'customer',
  OFFICE_STAFF = 'office_staff',
  FACTORY_OWNER = 'factory_owner',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum GroupStatus {
  FORMING = 'forming',           // Group is open, users can join
  ACTIVE = 'active',             // Group is active, no new joins
  MOQ_REACHED = 'moq_reached',   // MOQ met, ready for production
  SUCCESS = 'success',           // Production completed
  FAILED = 'failed',             // MOQ not met by deadline
  CANCELLED = 'cancelled',       // Manually cancelled
}

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  EWALLET_OVO = 'ewallet_ovo',
  EWALLET_GOPAY = 'ewallet_gopay',
  EWALLET_DANA = 'ewallet_dana',
  EWALLET_SHOPEEPAY = 'ewallet_shopeepay',
  COD = 'cod',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  PAYMENT_SUCCESS = 'payment_success',
  MOQ_REACHED = 'moq_reached',
  PRODUCTION_STARTED = 'production_started',
  READY_FOR_PICKUP = 'ready_for_pickup',
  PICKED_UP = 'picked_up',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  REVIEW_REMINDER = 'review_reminder',
  GROUP_EXPIRING = 'group_expiring',
  GROUP_FAILED = 'group_failed',
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  phone_number: string;
  email?: string;
  first_name: string;
  last_name?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  referral_code?: string;
  referred_by?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;                    // e.g. "Home", "Office", "Parents"
  recipient_name: string;
  phone_number: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  address_line: string;
  notes?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Category {
  id: string;
  parent_id?: string;
  name: string;
  slug: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  factory_id: string;
  category_id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  status: ProductStatus;
  primary_image_url?: string;
  base_price: number;               // Decimal as number
  cost_price?: number;
  min_order_quantity: number;       // MOQ for group buying
  group_duration_hours: number;     // How long group stays open (48h default)
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  stock_quantity: number;
  meta_title?: string;
  meta_description?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated by API)
  category?: Category;
  factory?: Factory;
  images?: ProductImage[];
  variants?: ProductVariant[];
  active_session?: GroupBuyingSession;  // Current group buying session
  reviews?: ProductReview[];
  average_rating?: number;              // Calculated field
  total_reviews?: number;               // Calculated field
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;             // e.g. "Merah - Size L"
  color?: string;
  size?: string;
  material?: string;
  price_adjustment: number;         // Add/subtract from base_price
  stock_quantity: number;
  weight_grams?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  order_item_id: string;
  user_id: string;
  rating: number;                   // 1-5
  title?: string;
  comment?: string;
  photo_urls: string[];
  video_url?: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: User;
}

// ============================================================================
// GROUP BUYING TYPES
// ============================================================================

export interface GroupBuyingSession {
  id: string;
  product_id: string;
  factory_id: string;
  session_code: string;             // e.g. "GRP-20250103-001"
  status: GroupStatus;
  target_moq: number;               // Required quantity to start production
  group_price: number;              // Discounted price for group members
  start_time: string;
  end_time: string;
  moq_reached_at?: string;
  production_started_at?: string;
  production_completed_at?: string;
  estimated_completion_date?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  product?: Product;
  factory?: Factory;
  participants?: GroupParticipant[];
  
  // Calculated fields
  current_quantity?: number;        // Sum of all participant quantities
  remaining_quantity?: number;      // target_moq - current_quantity
  progress_percentage?: number;     // (current_quantity / target_moq) * 100
  time_remaining?: string;          // Formatted time until end_time
}

export interface GroupParticipant {
  id: string;
  group_session_id: string;
  user_id: string;
  order_id?: string;
  quantity: number;
  variant_id?: string;
  unit_price: number;
  total_price: number;
  joined_at: string;
  
  // Relations
  user?: User;
  variant?: ProductVariant;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface Order {
  id: string;
  order_number: string;             // e.g. "ORD-20250103-001"
  user_id: string;
  group_session_id?: string;
  status: OrderStatus;
  
  // Amounts
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Shipping details
  shipping_name: string;
  shipping_phone: string;
  shipping_province: string;
  shipping_city: string;
  shipping_district: string;
  shipping_postal_code?: string;
  shipping_address: string;
  shipping_notes?: string;
  
  // Timestamps
  estimated_delivery_date?: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  items?: OrderItem[];
  payment?: Payment;
  shipment?: Shipment;
  group_session?: GroupBuyingSession;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  factory_id: string;
  sku: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_snapshot?: Record<string, any>;  // JSON snapshot of product at purchase time
  created_at: string;
  
  // Relations
  product?: Product;
  variant?: ProductVariant;
  review?: ProductReview;           // User's review for this item
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  
  // Amounts
  order_amount: number;
  payment_gateway_fee: number;
  total_amount: number;
  currency: string;                 // Default: "IDR"
  
  // Gateway details
  payment_gateway?: string;         // e.g. "midtrans"
  gateway_transaction_id?: string;
  gateway_response?: Record<string, any>;
  payment_code?: string;            // Bank transfer code
  va_number?: string;               // Virtual account number
  payment_url?: string;             // Redirect URL for payment
  qr_code_url?: string;             // QR code for ewallet
  
  // Escrow
  is_in_escrow: boolean;
  escrow_released_at?: string;
  
  // Refund
  refund_amount: number;
  refund_reason?: string;
  refunded_at?: string;
  
  // Timestamps
  expires_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FACTORY TYPES
// ============================================================================

export interface Factory {
  id: string;
  owner_id: string;
  office_id?: string;
  factory_code: string;
  factory_name: string;
  status: string;                   // factory_status enum
  verification_status: string;      // verification_status enum
  phone_number: string;
  email?: string;
  province: string;
  city: string;
  district: string;
  postal_code?: string;
  address_line: string;
  logo_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  
  // Calculated fields
  average_rating?: number;
  total_reviews?: number;
  total_products?: number;
}

export interface FactoryReview {
  id: string;
  factory_id: string;
  order_id: string;
  user_id: string;
  rating: number;                   // 1-5
  comment?: string;
  created_at: string;
  
  // Relations
  user?: User;
}

// ============================================================================
// SHIPMENT TYPES
// ============================================================================

export interface Shipment {
  id: string;
  pickup_task_id: string;
  order_id: string;
  courier_service: string;          // courier_service enum (jne, jnt, etc.)
  service_type?: string;            // e.g. "REG", "YES", "OKE"
  tracking_number: string;
  status: string;                   // shipment_status enum
  
  // Sender (Office/Warehouse)
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_city: string;
  sender_postal_code?: string;
  
  // Recipient (Customer)
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: string;
  recipient_postal_code?: string;
  
  // Package details
  weight_grams: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  
  // Costs
  shipping_cost: number;
  insurance_cost: number;
  
  // Dates
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  tracking_events?: ShipmentTrackingEvent[];
}

export interface ShipmentTrackingEvent {
  id: string;
  shipment_id: string;
  status: string;
  description: string;
  location?: string;
  event_time: string;
  created_at: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  related_id?: string;              // ID of related entity (order, product, etc.)
  is_read: boolean;
  is_pushed: boolean;
  read_at?: string;
  created_at: string;
}

// ============================================================================
// CART TYPES (Frontend only - not in DB)
// ============================================================================

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  group_session?: GroupBuyingSession;  // If joining a group buying session
}

export interface Cart {
  items: CartItem[];
  total_items: number;              // Calculated: sum of all quantities
  subtotal: number;                 // Calculated: sum of (price * quantity)
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// FORM TYPES (for checkout, etc.)
// ============================================================================

export interface CheckoutFormData {
  // Shipping address
  shipping_name: string;
  shipping_phone: string;
  shipping_province: string;
  shipping_city: string;
  shipping_district: string;
  shipping_postal_code?: string;
  shipping_address: string;
  shipping_notes?: string;
  
  // Payment
  payment_method: PaymentMethod;
  
  // Use saved address
  use_saved_address?: boolean;
  saved_address_id?: string;
}

export interface JoinGroupFormData {
  product_id: string;
  session_id: string;
  variant_id?: string;
  quantity: number;
}

export interface ReviewFormData {
  order_item_id: string;
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
  photo_files?: File[];
  video_file?: File;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface RegisterRequest {
  phone_number: string;
  password: string;
  first_name: string;
  last_name?: string;
  referral_code?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export interface ProductFilters {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  status?: ProductStatus;
  factory_id?: string;
  has_active_group?: boolean;       // Only products with active group buying
  search?: string;                  // Search by name/description
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'moq_asc';
  page?: number;
  limit?: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}