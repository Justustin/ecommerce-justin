import { OrderRepository } from '../repositories/order.repository';
import { OrderUtils } from '../utils/order.utils';
import axios, { AxiosError } from 'axios';

import {
  CreateOrderDTO,
  UpdateOrderStatusDTO,
  CreateBulkOrdersDTO,
  OrderFilters,
  PaginatedResponse,
  CreatePaymentDTO
} from '../types';

export class OrderService {
  private repository: OrderRepository;
  private utils: OrderUtils;

  constructor() {
    this.repository = new OrderRepository();
    this.utils = new OrderUtils();
  }

  async createOrder(data: CreateOrderDTO) {
    // Validation
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    if (!data.shippingAddress.name || !data.shippingAddress.address) {
      throw new Error('Complete shipping address required');
    }

    // Build order items with pricing and snapshots
    const enrichedItems = await Promise.all(
      data.items.map(async (item) => {
        const price = await this.utils.getProductPrice(item.productId, item.variantId);
        const factoryId = await this.utils.getProductFactoryId(item.productId);
        const snapshot = await this.utils.buildProductSnapshot(item.productId, item.variantId);

        return {
          productId: item.productId,
          variantId: item.variantId,
          factoryId,
          quantity: item.quantity,
          unitPrice: price,
          subtotal: price * item.quantity,
          sku: snapshot.product.sku,
          productName: snapshot.product.name,
          variantName: snapshot.variant?.variant_name,
          productSnapshot: snapshot
        };
      })
    );

    // Group items by factory
    const factoryGroups = new Map<string, any[]>();
    enrichedItems.forEach(item => {
      const existing = factoryGroups.get(item.factoryId) || [];
      existing.push(item);
      factoryGroups.set(item.factoryId, existing);
    });

    // Generate base order number
    const orderNumber = this.utils.generateOrderNumber();

    // Create separate orders per factory
    const orders = await this.repository.createOrder(
      data,
      orderNumber,
      factoryGroups
    );

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL

    // MAJOR FIX: Better error handling for payment creation
    const paymentResults = [];
    const failedOrders = [];

    for (const order of orders) {
      try {
        // Type assertion: Repository includes order_items
        const orderWithItems = order as any;

        // Validate order_items exists (from repository include)
        if (!orderWithItems.order_items || orderWithItems.order_items.length === 0) {
          console.error(`No order_items found for order ${order.id}`);
          throw new Error(`Cannot create payment: No items for order ${order.id}`);
        }

        // Use pre-calculated total_amount from repository (includes discounts)
        const totalAmount = Number(order.subtotal || 0); // Convert Decimal to number if needed

        // Get factory_id from first order_item (all share the same factory)
        const factoryId = orderWithItems.order_items[0].factory_id;

        const paymentData: CreatePaymentDTO = {
          orderId: order.id,
          userId: data.userId,
          amount: totalAmount,
          paymentMethod: "bank_transfer",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isEscrow: !!order.group_session_id, // Set isEscrow for group buying orders
        };

        console.log(`Calling PaymentService for order ${order.id} with amount ${totalAmount} and factory_id ${factoryId}`);

        const response = await axios.post(`${paymentServiceUrl}/api/payments`, paymentData, {
          headers: {
            'Content-Type': 'application/json',
            timeout: 10000  // 10 second timeout
            // 'Authorization': `Bearer ${process.env.PAYMENT_SERVICE_API_KEY}`
          }
        });

        paymentResults.push({
          orderId: order.id,
          orderNumber: order.order_number,
          ...response.data
        });
      } catch (error: any) {
        console.error(`Failed to create payment for order ${order.id}:`, error.message);

        failedOrders.push({
          orderId: order.id,
          orderNumber: order.order_number,
          error: error.response?.data?.message || error.message
        });

        // Mark order as failed
        await this.repository.updateStatus({
          orderId: order.id,
          newStatus: 'failed',
          notes: `Payment creation failed: ${error.message}`
        });
      }
    }

    // If all payments failed, throw error
    if (failedOrders.length === orders.length) {
      throw new Error(
        `All payment creations failed. Orders: ${failedOrders.map(f => f.orderNumber).join(', ')}`
      );
    }

    const payments = paymentResults;

    return {
      success: true,
      payments: payments,
      ordersCreated: orders.length,
      orders,
      failedPayments: failedOrders.length > 0 ? failedOrders : undefined,
      message: failedOrders.length > 0
        ? `Partial success: ${paymentResults.length}/${orders.length} payments created. ${failedOrders.length} failed.`
        : factoryGroups.size > 1
        ? `Created ${orders.length} orders (items from ${factoryGroups.size} factories)`
        : 'Order created successfully'
    };
  }

  async createBulkOrdersFromSession(data: CreateBulkOrdersDTO) {
    if (!data.participants || data.participants.length === 0) {
      throw new Error('No participants to create orders for');
    }

    const orders = await this.repository.createBulkOrders(data);

    return {
      success: true,
      ordersCreated: orders.length,
      orders
    };
  }

  async getOrder(id: string) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getOrderByNumber(orderNumber: string) {
    const order = await this.repository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getOrders(filters: OrderFilters): Promise<PaginatedResponse<any>> {
    return this.repository.findAll(filters);
  }

  async updateOrderStatus(data: UpdateOrderStatusDTO) {
    const order = await this.repository.findById(data.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Business rules for status transitions
    const validTransitions: Record<string, string[]> = {
      pending_payment: ['paid', 'failed', 'cancelled'],
      paid: ['processing', 'refunded', 'cancelled'],
      processing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['picked_up', 'cancelled'],
      picked_up: ['in_transit'],
      in_transit: ['delivered', 'failed'],
      delivered: ['refunded'],
      cancelled: ['refunded'],
      refunded: [],
      failed: ['pending_payment']
    };

    const currentStatus = order.status;
    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(data.newStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${data.newStatus}`
      );
    }

    return this.repository.updateStatus(data);
  }

  async updateShippingCost(orderId: string, shippingCost: number, taxAmount: number = 0) {
    if (shippingCost < 0) {
      throw new Error('Shipping cost cannot be negative');
    }
    return this.repository.updateShippingCost(orderId, shippingCost, taxAmount);
  }

  async cancelOrder(orderId: string, userId?: string) {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Only user or admin can cancel
    if (userId && order.user_id !== userId) {
      // TODO: Check if userId is admin
      throw new Error('Unauthorized to cancel this order');
    }

    return this.repository.cancelOrder(orderId, userId);
  }

  async getOrderStats(filters: Partial<OrderFilters>) {
    return this.repository.getOrderStats(filters);
  }

  async getUserOrders(userId: string, page = 1, limit = 20) {
    return this.repository.findAll({
      userId,
      page,
      limit
    });
  }

  async getFactoryOrders(factoryId: string, page = 1, limit = 20) {
    return this.repository.findAll({
      factoryId,
      page,
      limit
    });
  }
}