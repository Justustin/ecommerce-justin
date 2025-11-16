import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { sendMessage } from '../whatsappService';

export class AdminController {
    /**
     * 1. Get all WhatsApp messages with filtering
     */
    getAllMessages = async (req: Request, res: Response) => {
        try {
            const {
                phoneNumber,
                status,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (phoneNumber) where.phone_number = { contains: phoneNumber };
            if (status) where.status = status;
            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [messages, total] = await Promise.all([
                prisma.whatsapp_messages.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' }
                }),
                prisma.whatsapp_messages.count({ where })
            ]);

            res.json({
                success: true,
                data: messages,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all messages error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get WhatsApp analytics
     */
    getAnalytics = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            const where: any = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at.gte = new Date(startDate as string);
                if (endDate) where.created_at.lte = new Date(endDate as string);
            }

            const [
                totalMessages,
                sentCount,
                failedCount,
                pendingCount
            ] = await Promise.all([
                prisma.whatsapp_messages.count({ where }),
                prisma.whatsapp_messages.count({ where: { ...where, status: 'sent' } }),
                prisma.whatsapp_messages.count({ where: { ...where, status: 'failed' } }),
                prisma.whatsapp_messages.count({ where: { ...where, status: 'pending' } })
            ]);

            res.json({
                success: true,
                data: {
                    totalMessages,
                    sentCount,
                    failedCount,
                    pendingCount,
                    deliveryRate: totalMessages > 0 ? (sentCount / totalMessages) * 100 : 0
                }
            });
        } catch (error: any) {
            console.error('Get analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Retry failed messages
     */
    retryFailedMessages = async (req: Request, res: Response) => {
        try {
            // This would require integration with the WhatsApp sending logic
            // For now, just mark them as pending for retry

            const result = await prisma.whatsapp_messages.updateMany({
                where: { status: 'failed' },
                data: { status: 'pending' }
            });

            res.json({
                success: true,
                message: `Marked ${result.count} failed messages for retry`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Retry failed messages error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Delete old messages
     */
    deleteOldMessages = async (req: Request, res: Response) => {
        try {
            const { olderThanDays = 30 } = req.body;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - Number(olderThanDays));

            const result = await prisma.whatsapp_messages.deleteMany({
                where: {
                    created_at: { lt: cutoffDate }
                }
            });

            res.json({
                success: true,
                message: `Deleted ${result.count} messages older than ${olderThanDays} days`,
                count: result.count
            });
        } catch (error: any) {
            console.error('Delete old messages error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 5. Get message templates
     */
    getTemplates = async (req: Request, res: Response) => {
        try {
            // Return predefined WhatsApp templates
            const templates = [
                {
                    id: 'otp',
                    name: 'OTP Verification',
                    message: 'Your OTP code is {otp}. Valid for 5 minutes.',
                    variables: ['otp']
                },
                {
                    id: 'order_confirmation',
                    name: 'Order Confirmation',
                    message: 'Thank you for your order #{orderNumber}. Total: Rp {amount}',
                    variables: ['orderNumber', 'amount']
                },
                {
                    id: 'factory_po',
                    name: 'Factory PO Notification',
                    message: 'New PO #{poNumber}: {productName} - Qty: {quantity}',
                    variables: ['poNumber', 'productName', 'quantity']
                }
            ];

            res.json({
                success: true,
                data: templates
            });
        } catch (error: any) {
            console.error('Get templates error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 6. Send test message
     */
    sendTestMessage = async (req: Request, res: Response) => {
        try {
            const { phoneNumber, message } = req.body;

            // Create message record in database
            const whatsappMessage = await prisma.whatsapp_messages.create({
                data: {
                    recipient_phone: phoneNumber,
                    message_body: message,
                    status: 'pending'
                }
            });

            // Actually send via WhatsApp using Baileys
            const sendResult = await sendMessage(phoneNumber, message);

            if (sendResult.success) {
                // Update message status to sent
                await prisma.whatsapp_messages.update({
                    where: { id: whatsappMessage.id },
                    data: {
                        status: 'sent',
                        sent_at: new Date(),
                        updated_at: new Date()
                    }
                });

                res.json({
                    success: true,
                    message: 'Message sent successfully via WhatsApp',
                    data: whatsappMessage
                });
            } else {
                // Update message status to failed
                await prisma.whatsapp_messages.update({
                    where: { id: whatsappMessage.id },
                    data: {
                        status: 'failed',
                        failed_reason: sendResult.error || 'Unknown error',
                        retry_count: 1,
                        updated_at: new Date()
                    }
                });

                res.status(500).json({
                    success: false,
                    error: sendResult.error || 'Failed to send message'
                });
            }
        } catch (error: any) {
            console.error('Send test message error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
