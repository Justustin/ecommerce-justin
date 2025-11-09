import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';
import { OrderRepository } from '../repositories/order.repository';
import { UpdateOrderStatusDTO } from '../types';

export class AdminController {
    private repository: OrderRepository;

    constructor() {
        this.repository = new OrderRepository();
    }

    /**
     * 1. Get all orders with admin-level details and filtering
     */
    getAllOrders = async (req: Request, res: Response) => {
        try {
            const result = await this.repository.findAll({
                userId: req.query.userId as string,
                factoryId: req.query.factoryId as string,
                status: req.query.status as string,
                isGroupBuying: req.query.isGroupBuying === 'true' ? true : req.query.isGroupBuying === 'false' ? false : undefined,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                search: req.query.search as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get all orders error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get order details by ID (admin view with full details)
     */
    getOrderById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const order = await prisma.orders.findUnique({
                where: { id },
                include: {
                    order_items: {
                        include: {
                            products: true,
                            product_variants: true,
                            factories: true
                        }
                    },
                    users: true,
                    group_buying_sessions: true,
                    payments: {
                        include: {
                            refunds: true
                        }
                    },
                    shipments: {
                        include: {
                            couriers: true
                        }
                    }
                }
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            res.json({
                success: true,
                data: order
            });
        } catch (error: any) {
            console.error('Get order by ID error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Force update order status (admin override)
     */
    updateOrderStatus = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { newStatus, estimatedDeliveryDate, notes } = req.body;

            const updateData: UpdateOrderStatusDTO = {
                orderId: id,
                newStatus,
                estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
                notes
            };

            const updated = await this.repository.updateStatus(updateData);

            res.json({
                success: true,
                message: `Order status updated to ${newStatus}`,
                data: updated
            });
        } catch (error: any) {
            console.error('Update order status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Cancel order (admin force cancel)
     */
    cancelOrder = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const order = await this.repository.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            const cancelled = await this.repository.cancelOrder(id);

            // TODO: Trigger refund if payment was made

            res.json({
                success: true,
                message: 'Order cancelled',
                data: cancelled,
                cancellationReason: reason
            });
        } catch (error: any) {
            console.error('Cancel order error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Update shipping details (cost, courier, etc.)
     */
    updateShippingDetails = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const {
                shippingCost,
                taxAmount,
                selectedCourier,
                selectedCourierService,
                estimatedDeliveryDate
            } = req.body;

            const order = await this.repository.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            // Update shipping cost and recalculate total
            if (shippingCost !== undefined) {
                await this.repository.updateShippingCost(
                    id,
                    shippingCost,
                    taxAmount || 0
                );
            }

            // Update courier details
            const updateData: any = {};
            if (selectedCourier) updateData.selected_courier = selectedCourier;
            if (selectedCourierService) updateData.selected_courier_service = selectedCourierService;
            if (estimatedDeliveryDate) updateData.estimated_delivery_date = new Date(estimatedDeliveryDate);

            const updated = await prisma.orders.update({
                where: { id },
                data: updateData,
                include: {
                    order_items: true
                }
            });

            res.json({
                success: true,
                message: 'Shipping details updated',
                data: updated
            });
        } catch (error: any) {
            console.error('Update shipping details error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Get order analytics and statistics
     */
    getOrderAnalytics = async (req: Request, res: Response) => {
        try {
            const { factoryId, userId, startDate, endDate } = req.query;

            const stats = await this.repository.getOrderStats({
                factoryId: factoryId as string,
                userId: userId as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined
            });

            // Additional analytics
            const where: any = {};
            if (factoryId) {
                where.order_items = { some: { factory_id: factoryId } };
            }
            if (userId) where.user_id = userId;
            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [
                groupBuyingOrders,
                platformOrders,
                avgItemsPerOrder
            ] = await Promise.all([
                prisma.orders.count({
                    where: { ...where, group_session_id: { not: null } }
                }),
                prisma.orders.count({
                    where: { ...where, group_session_id: null }
                }),
                prisma.order_items.aggregate({
                    where: {
                        orders: where
                    },
                    _avg: { quantity: true }
                })
            ]);

            const analytics = {
                ...stats,
                groupBuyingOrders,
                platformOrders,
                avgItemsPerOrder: avgItemsPerOrder._avg.quantity || 0
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            console.error('Get order analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 7. Bulk update order statuses
     */
    bulkUpdateStatus = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { orderIds, newStatus } = req.body;

            const updated = await prisma.orders.updateMany({
                where: {
                    id: { in: orderIds }
                },
                data: {
                    status: newStatus,
                    updated_at: new Date(),
                    ...(newStatus === 'paid' && { paid_at: new Date() }),
                    ...(newStatus === 'picked_up' && { shipped_at: new Date() }),
                    ...(newStatus === 'delivered' && { delivered_at: new Date() }),
                    ...(newStatus === 'cancelled' && { cancelled_at: new Date() })
                }
            });

            res.json({
                success: true,
                message: `Updated ${updated.count} orders to ${newStatus}`,
                count: updated.count
            });
        } catch (error: any) {
            console.error('Bulk update status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 8. Get orders by factory (for factory portal)
     */
    getOrdersByFactory = async (req: Request, res: Response) => {
        try {
            const { factoryId } = req.params;
            const { status, page = 1, limit = 50 } = req.query;

            const result = await this.repository.findAll({
                factoryId,
                status: status as string,
                page: parseInt(page as string),
                limit: parseInt(limit as string)
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get orders by factory error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 9. Get revenue report
     */
    getRevenueReport = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, factoryId, groupBy = 'day' } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate and endDate are required'
                });
            }

            const where: any = {
                status: { in: ['paid', 'processing', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered'] },
                created_at: {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                }
            };

            if (factoryId) {
                where.order_items = {
                    some: { factory_id: factoryId }
                };
            }

            const orders = await prisma.orders.findMany({
                where,
                select: {
                    id: true,
                    order_number: true,
                    total_amount: true,
                    subtotal: true,
                    shipping_cost: true,
                    created_at: true,
                    status: true
                },
                orderBy: { created_at: 'asc' }
            });

            // Group by day/week/month
            const grouped: Record<string, { count: number; revenue: number; orders: any[] }> = {};

            orders.forEach(order => {
                let key: string;
                const date = new Date(order.created_at);

                if (groupBy === 'week') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                } else if (groupBy === 'month') {
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                } else {
                    key = date.toISOString().split('T')[0];
                }

                if (!grouped[key]) {
                    grouped[key] = { count: 0, revenue: 0, orders: [] };
                }

                grouped[key].count++;
                grouped[key].revenue += Number(order.total_amount);
                grouped[key].orders.push(order.order_number);
            });

            const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
            const totalOrders = orders.length;

            res.json({
                success: true,
                data: {
                    summary: {
                        totalRevenue,
                        totalOrders,
                        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
                    },
                    grouped,
                    period: {
                        start: startDate,
                        end: endDate,
                        groupBy
                    }
                }
            });
        } catch (error: any) {
            console.error('Get revenue report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 10. Update order address
     */
    updateOrderAddress = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const {
                shippingName,
                shippingPhone,
                shippingProvince,
                shippingCity,
                shippingDistrict,
                shippingPostalCode,
                shippingAddress,
                shippingNotes
            } = req.body;

            const order = await this.repository.findById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot update address for order in current status'
                });
            }

            const updated = await prisma.orders.update({
                where: { id },
                data: {
                    shipping_name: shippingName || order.shipping_name,
                    shipping_phone: shippingPhone || order.shipping_phone,
                    shipping_province: shippingProvince || order.shipping_province,
                    shipping_city: shippingCity || order.shipping_city,
                    shipping_district: shippingDistrict || order.shipping_district,
                    shipping_postal_code: shippingPostalCode || order.shipping_postal_code,
                    shipping_address: shippingAddress || order.shipping_address,
                    shipping_notes: shippingNotes !== undefined ? shippingNotes : order.shipping_notes,
                    updated_at: new Date()
                },
                include: {
                    order_items: true
                }
            });

            res.json({
                success: true,
                message: 'Order address updated',
                data: updated
            });
        } catch (error: any) {
            console.error('Update order address error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 11. Export orders (CSV format)
     */
    exportOrders = async (req: Request, res: Response) => {
        try {
            const { factoryId, status, startDate, endDate, format = 'json' } = req.query;

            const result = await this.repository.findAll({
                factoryId: factoryId as string,
                status: status as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: 10000 // Large limit for export
            });

            if (format === 'csv') {
                // Convert to CSV
                const headers = [
                    'Order Number',
                    'Customer Name',
                    'Email',
                    'Status',
                    'Total Amount',
                    'Shipping Cost',
                    'Created At',
                    'Paid At'
                ];

                const rows = result.data.map((order: any) => [
                    order.order_number,
                    `${order.users?.first_name || ''} ${order.users?.last_name || ''}`.trim(),
                    order.users?.email || '',
                    order.status,
                    order.total_amount,
                    order.shipping_cost,
                    new Date(order.created_at).toISOString(),
                    order.paid_at ? new Date(order.paid_at).toISOString() : ''
                ]);

                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=orders_${Date.now()}.csv`);
                res.send(csv);
            } else {
                // JSON export
                res.json({
                    success: true,
                    ...result,
                    exportedAt: new Date().toISOString()
                });
            }
        } catch (error: any) {
            console.error('Export orders error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
