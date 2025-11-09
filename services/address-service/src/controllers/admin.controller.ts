import { Request, Response } from 'express';
import { prisma } from '@repo/database';

export class AdminController {
    /**
     * 1. Get all addresses with filtering
     */
    getAllAddresses = async (req: Request, res: Response) => {
        try {
            const {
                userId,
                province,
                city,
                page = 1,
                limit = 50
            } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};

            if (userId) where.user_id = userId;
            if (province) where.province = province;
            if (city) where.city = city;

            const [addresses, total] = await Promise.all([
                prisma.user_addresses.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { created_at: 'desc' },
                    include: {
                        users: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true
                            }
                        }
                    }
                }),
                prisma.user_addresses.count({ where })
            ]);

            res.json({
                success: true,
                data: addresses,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            console.error('Get all addresses error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 2. Get address analytics (geographic distribution)
     */
    getAddressAnalytics = async (req: Request, res: Response) => {
        try {
            const [
                totalAddresses,
                byProvince,
                byCity
            ] = await Promise.all([
                prisma.user_addresses.count(),
                prisma.user_addresses.groupBy({
                    by: ['province'],
                    _count: true,
                    orderBy: {
                        _count: {
                            province: 'desc'
                        }
                    },
                    take: 10
                }),
                prisma.user_addresses.groupBy({
                    by: ['city'],
                    _count: true,
                    orderBy: {
                        _count: {
                            city: 'desc'
                        }
                    },
                    take: 10
                })
            ]);

            const topProvinces: Record<string, number> = {};
            byProvince.forEach(item => {
                topProvinces[item.province] = item._count;
            });

            const topCities: Record<string, number> = {};
            byCity.forEach(item => {
                topCities[item.city] = item._count;
            });

            res.json({
                success: true,
                data: {
                    totalAddresses,
                    topProvinces,
                    topCities
                }
            });
        } catch (error: any) {
            console.error('Get address analytics error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 3. Delete address
     */
    deleteAddress = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            await prisma.user_addresses.delete({
                where: { id }
            });

            res.json({
                success: true,
                message: 'Address deleted'
            });
        } catch (error: any) {
            console.error('Delete address error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    /**
     * 4. Update address
     */
    updateAddress = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const updated = await prisma.user_addresses.update({
                where: { id },
                data: updateData
            });

            res.json({
                success: true,
                message: 'Address updated',
                data: updated
            });
        } catch (error: any) {
            console.error('Update address error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
