import { prisma } from '@repo/database';
import { 
  CreateOrderDTO, 
  UpdateOrderStatusDTO, 
  CreateBulkOrdersDTO,
  OrderFilters, 
  PaginatedResponse,
  ShippingAddressDTO
} from '../types';
import { OrderUtils } from '../utils/order.utils';

export class OrderRepository {
  private utils: OrderUtils;

  constructor() {
    this.utils = new OrderUtils();
  }

  async createOrder(
    data: CreateOrderDTO,
    orderNumber: string,
    factoryItems: Map<string, any[]>
  ) {
    const orders: Array<Awaited<ReturnType<typeof prisma.orders.create>>> = [];

    // Create separate order for each factory
    for (const [factoryId, items] of factoryItems.entries()) {
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      
      const order = await prisma.orders.create({
        data: {
          order_number: orderNumber + (orders.length > 0 ? `-F${orders.length + 1}` : ''),
          user_id: data.userId,
          group_session_id: data.groupSessionId || null,
          status: 'pending_payment',
          subtotal: subtotal,
          shipping_cost: 0,
          tax_amount: 0,
          discount_amount: data.discountAmount || 0,
          total_amount: subtotal - (data.discountAmount || 0),
          shipping_name: data.shippingAddress.name,
          shipping_phone: data.shippingAddress.phone,
          shipping_province: data.shippingAddress.province,
          shipping_city: data.shippingAddress.city,
          shipping_district: data.shippingAddress.district,
          shipping_postal_code: data.shippingAddress.postalCode,
          shipping_address: data.shippingAddress.address,
          shipping_notes: data.shippingNotes,
          order_items: {
            create: items.map(item => ({
              product_id: item.productId,
              variant_id: item.variantId,
              factory_id: factoryId,
              sku: item.sku,
              product_name: item.productName,
              variant_name: item.variantName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.subtotal,
              product_snapshot: item.productSnapshot
            }))
          }
        },
        include: {
          order_items: true,
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      });

      orders.push(order);
    }

    return orders;
  }

  async createBulkOrders(data: CreateBulkOrdersDTO) {
  const orders: Array<Awaited<ReturnType<typeof prisma.orders.create>>> = [];

  for (const participant of data.participants) {
    const orderNumber = this.utils.generateOrderNumber();
    
    try {
      // Call auth-service API for address
      const defaultAddress = await this.utils.getUserDefaultAddress(participant.userId);
      
      const factoryId = await this.utils.getProductFactoryId(participant.productId);
      const productSnapshot = await this.utils.buildProductSnapshot(
        participant.productId,
        participant.variantId
      );

      const productDetails = await this.utils.getProductDetails(participant.productId);

      let variantName: string | undefined;
      if (participant.variantId) {
        const variantDetails = await this.utils.getVariantDetails(participant.variantId);
        variantName = variantDetails?.variant_name;
      }

      const subtotal = participant.quantity * participant.unitPrice;

      const order = await prisma.orders.create({
        data: {
          order_number: orderNumber,
          user_id: participant.userId,
          group_session_id: data.groupSessionId,
          status: 'paid',
          subtotal: subtotal,
          shipping_cost: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: subtotal,
          shipping_name: defaultAddress.recipient_name,
          shipping_phone: defaultAddress.phone_number,
          shipping_province: defaultAddress.province,
          shipping_city: defaultAddress.city,
          shipping_district: defaultAddress.district,
          shipping_postal_code: defaultAddress.postal_code,
          shipping_address: defaultAddress.address_line,
          shipping_notes: defaultAddress.notes,
          paid_at: new Date(),
          order_items: {
            create: {
              product_id: participant.productId,
              variant_id: participant.variantId,
              factory_id: factoryId,
              sku: productDetails.sku,
              product_name: productDetails.name,
              variant_name: variantName,
              quantity: participant.quantity,
              unit_price: participant.unitPrice,
              subtotal: subtotal,
              product_snapshot: JSON.stringify(productSnapshot)
            }
          }
        },
        include: {
          order_items: true
        }
      });

      // Link order to group participant
      await prisma.group_participants.updateMany({
        where: { id: participant.participantId },
        data: { order_id: order.id }
      });

      orders.push(order);
      
    } catch (error) {
      console.error(`Failed to create order for participant ${participant.userId}:`, error);
      continue; // Skip this participant if address not found
    }
  }

  return orders;
}

  async findById(id: string) {
    return prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                primary_image_url: true
              }
            },
            product_variants: {
              select: {
                id: true,
                variant_name: true
              }
            },
            factories: {
              select: {
                id: true,
                factory_name: true,
                phone_number: true,
                email: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        },
        group_buying_sessions: {
          select: {
            id: true,
            session_code: true,
            status: true
          }
        }
      }
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return prisma.orders.findUnique({
      where: { order_number: orderNumber },
      include: {
        order_items: {
          include: {
            products: true,
            factories: true
          }
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        }
      }
    });
  }

  async findAll(filters: OrderFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.status) where.status = filters.status;

    if (filters.isGroupBuying !== undefined) {
      where.group_session_id = filters.isGroupBuying 
        ? { not: null } 
        : null;
    }

    if (filters.factoryId) {
      where.order_items = {
        some: {
          factory_id: filters.factoryId
        }
      };
    }

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    if (filters.search) {
      where.OR = [
        { order_number: { contains: filters.search, mode: 'insensitive' } },
        { shipping_name: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          order_items: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  primary_image_url: true
                }
              },
              factories: {
                select: {
                  id: true,
                  factory_name: true
                }
              }
            }
          },
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateStatus(data: UpdateOrderStatusDTO) {
    const updateData: any = {
      status: data.newStatus,
      updated_at: new Date()
    };

    // Update relevant timestamp fields
    switch (data.newStatus) {
      case 'paid':
        updateData.paid_at = new Date();
        break;
      case 'picked_up':
        updateData.shipped_at = new Date();
        break;
      case 'delivered':
        updateData.delivered_at = new Date();
        break;
      case 'cancelled':
      case 'failed':
        updateData.cancelled_at = new Date();
        break;
    }

    if (data.estimatedDeliveryDate) {
      updateData.estimated_delivery_date = data.estimatedDeliveryDate;
    }

    return prisma.orders.update({
      where: { id: data.orderId },
      data: updateData,
      include: {
        order_items: true
      }
    });
  }

  async updateShippingCost(orderId: string, shippingCost: number, taxAmount: number = 0) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');

    const newTotal = Number(order.subtotal) + shippingCost + taxAmount - Number(order.discount_amount);

    return prisma.orders.update({
      where: { id: orderId },
      data: {
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        total_amount: newTotal,
        updated_at: new Date()
      }
    });
  }

  async getOrderStats(filters: Partial<OrderFilters>) {
    const where: any = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.factoryId) {
      where.order_items = {
        some: { factory_id: filters.factoryId }
      };
    }
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    const [totalOrders, revenueData, statusCounts] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.aggregate({
        where,
        _sum: { total_amount: true },
        _avg: { total_amount: true }
      }),
      prisma.orders.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    const ordersByStatus: Record<string, number> = {};
    statusCounts.forEach(item => {
      ordersByStatus[item.status] = item._count;
    });

    return {
      totalOrders,
      totalRevenue: Number(revenueData._sum.total_amount || 0),
      averageOrderValue: Number(revenueData._avg.total_amount || 0),
      ordersByStatus
    };
  }

  async cancelOrder(orderId: string, userId?: string) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');

    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      throw new Error('Cannot cancel order in current status');
    }

    return prisma.orders.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date()
      }
    });
  }
}