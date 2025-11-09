import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';
import { LogisticsRepository } from '../repositories/logistics.repository';
import { UpdateShipmentStatusDTO } from '../types';

export class AdminController {
    private repository: LogisticsRepository;

    constructor() {
        this.repository = new LogisticsRepository();
    }

    /**
     * 1. Get all shipments with filtering
     */
    getAllShipments = async (req: Request, res: Response) => {
        try {
            const result = await this.repository.findAll({
                orderId: req.query.orderId as string,
                pickupTaskId: req.query.pickupTaskId as string,
                courierService: req.query.courierService as string,
                status: req.query.status as any,
                trackingNumber: req.query.trackingNumber as string,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get all shipments error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get shipment details by ID
     */
    getShipmentById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const shipment = await this.repository.findById(id);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            res.json({
                success: true,
                data: shipment
            });
        } catch (error: any) {
            console.error('Get shipment by ID error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Force update shipment status
     */
    updateShipmentStatus = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const {
                status,
                description,
                location,
                deliveryPhotoUrl,
                recipientSignatureUrl,
                receivedBy
            } = req.body;

            const shipment = await this.repository.findById(id);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            // Update shipment status
            const additionalData: any = {};
            if (status === 'delivered') {
                additionalData.delivered_at = new Date();
                if (deliveryPhotoUrl) additionalData.delivery_photo_url = deliveryPhotoUrl;
                if (recipientSignatureUrl) additionalData.recipient_signature_url = recipientSignatureUrl;
                if (receivedBy) additionalData.received_by = receivedBy;
            } else if (status === 'cancelled') {
                additionalData.cancelled_at = new Date();
            }

            const updated = await this.repository.updateStatus(id, status, additionalData);

            // Create tracking event
            await this.repository.createTrackingEvent({
                shipmentId: id,
                status,
                description: description || `Status updated to ${status}`,
                location
            });

            res.json({
                success: true,
                message: `Shipment status updated to ${status}`,
                data: updated
            });
        } catch (error: any) {
            console.error('Update shipment status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Cancel shipment
     */
    cancelShipment = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const shipment = await this.repository.findById(id);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            if (shipment.status === 'delivered') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot cancel delivered shipment'
                });
            }

            const updated = await this.repository.updateStatus(id, 'cancelled', {
                cancelled_at: new Date()
            });

            // Create tracking event
            await this.repository.createTrackingEvent({
                shipmentId: id,
                status: 'cancelled',
                description: `Shipment cancelled by admin. Reason: ${reason || 'No reason provided'}`
            });

            res.json({
                success: true,
                message: 'Shipment cancelled',
                data: updated
            });
        } catch (error: any) {
            console.error('Cancel shipment error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Get shipment tracking history
     */
    getTrackingHistory = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const shipment = await this.repository.findById(id);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            const trackingEvents = await this.repository.getTrackingHistory(id);

            res.json({
                success: true,
                data: {
                    shipment: {
                        id: shipment.id,
                        trackingNumber: shipment.tracking_number,
                        status: shipment.status,
                        courierService: shipment.courier_service
                    },
                    trackingEvents
                }
            });
        } catch (error: any) {
            console.error('Get tracking history error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Add tracking event manually
     */
    addTrackingEvent = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { status, description, location, eventTime } = req.body;

            const shipment = await this.repository.findById(id);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    error: 'Shipment not found'
                });
            }

            const event = await this.repository.createTrackingEvent({
                shipmentId: id,
                status,
                description,
                location,
                eventTime: eventTime ? new Date(eventTime) : undefined
            });

            res.json({
                success: true,
                message: 'Tracking event added',
                data: event
            });
        } catch (error: any) {
            console.error('Add tracking event error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 7. Get shipments analytics
     */
    getShipmentsAnalytics = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, courierService } = req.query;

            const where: any = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            if (courierService) {
                where.courier_service = courierService;
            }

            const [
                totalShipments,
                statusCounts,
                courierCounts,
                avgShippingCost,
                avgDeliveryTime
            ] = await Promise.all([
                prisma.shipments.count({ where }),
                prisma.shipments.groupBy({
                    by: ['status'],
                    where,
                    _count: true
                }),
                prisma.shipments.groupBy({
                    by: ['courier_service'],
                    where,
                    _count: true
                }),
                prisma.shipments.aggregate({
                    where,
                    _avg: { shipping_cost: true }
                }),
                // Calculate average delivery time for delivered shipments
                prisma.$queryRaw`
                    SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))/86400) as avg_days
                    FROM shipments
                    WHERE status = 'delivered'
                    AND delivered_at IS NOT NULL
                    ${startDate ? prisma.$queryRawUnsafe('AND created_at >= $1', new Date(startDate as string)) : prisma.$queryRawUnsafe('')}
                    ${endDate ? prisma.$queryRawUnsafe('AND created_at <= $1', new Date(endDate as string)) : prisma.$queryRawUnsafe('')}
                `
            ]);

            const shipmentsByStatus: Record<string, number> = {};
            statusCounts.forEach(item => {
                shipmentsByStatus[item.status] = item._count;
            });

            const shipmentsByCourier: Record<string, number> = {};
            courierCounts.forEach(item => {
                shipmentsByCourier[item.courier_service] = item._count;
            });

            const analytics = {
                totalShipments,
                shipmentsByStatus,
                shipmentsByCourier,
                avgShippingCost: Number(avgShippingCost._avg.shipping_cost || 0),
                avgDeliveryTimeDays: avgDeliveryTime && (avgDeliveryTime as any)[0]
                    ? Number((avgDeliveryTime as any)[0].avg_days || 0)
                    : 0
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            console.error('Get shipments analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 8. Bulk update shipment statuses
     */
    bulkUpdateStatus = async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { shipmentIds, status, description } = req.body;

            // Update all shipments
            const updated = await prisma.shipments.updateMany({
                where: {
                    id: { in: shipmentIds }
                },
                data: {
                    status,
                    updated_at: new Date(),
                    ...(status === 'delivered' && { delivered_at: new Date() }),
                    ...(status === 'cancelled' && { cancelled_at: new Date() })
                }
            });

            // Create tracking events for all shipments
            await Promise.all(
                shipmentIds.map((shipmentId: string) =>
                    this.repository.createTrackingEvent({
                        shipmentId,
                        status,
                        description: description || `Bulk status update to ${status}`
                    })
                )
            );

            res.json({
                success: true,
                message: `Updated ${updated.count} shipments to ${status}`,
                count: updated.count
            });
        } catch (error: any) {
            console.error('Bulk update status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 9. Get problem shipments (delayed, failed, etc.)
     */
    getProblemShipments = async (req: Request, res: Response) => {
        try {
            const { page = 1, limit = 50 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);

            // Get shipments that are potentially problematic:
            // 1. In transit for more than 7 days
            // 2. Stuck in same status for more than 3 days
            // 3. Failed or returned status
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const [problemShipments, total] = await Promise.all([
                prisma.shipments.findMany({
                    where: {
                        OR: [
                            // In transit for too long
                            {
                                status: 'in_transit',
                                created_at: { lt: sevenDaysAgo }
                            },
                            // Picked up but not in transit for 3 days
                            {
                                status: 'picked_up',
                                updated_at: { lt: threeDaysAgo }
                            },
                            // Failed statuses
                            {
                                status: { in: ['failed', 'returned', 'cancelled'] }
                            }
                        ]
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        orders: {
                            select: {
                                order_number: true,
                                shipping_name: true,
                                shipping_phone: true
                            }
                        },
                        shipment_tracking_events: {
                            orderBy: { event_time: 'desc' },
                            take: 5
                        }
                    }
                }),
                prisma.shipments.count({
                    where: {
                        OR: [
                            { status: 'in_transit', created_at: { lt: sevenDaysAgo } },
                            { status: 'picked_up', updated_at: { lt: threeDaysAgo } },
                            { status: { in: ['failed', 'returned', 'cancelled'] } }
                        ]
                    }
                })
            ]);

            res.json({
                success: true,
                data: problemShipments,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get problem shipments error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
