import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@repo/database';

export class AdminController {
  /**
   * Admin: Register factory
   */
  registerFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        ownerId,
        factoryCode,
        factoryName,
        phoneNumber,
        email,
        province,
        city,
        district,
        postalCode,
        addressLine,
        description,
        businessLicenseNumber,
        taxId,
        logoUrl
      } = req.body;

      const factory = await prisma.factories.create({
        data: {
          owner_id: ownerId,
          factory_code: factoryCode,
          factory_name: factoryName,
          phone_number: phoneNumber,
          email: email || null,
          province,
          city,
          district,
          postal_code: postalCode || null,
          address_line: addressLine,
          description: description || null,
          business_license_number: businessLicenseNumber || null,
          tax_id: taxId || null,
          logo_url: logoUrl || null,
          verification_status: 'pending',
          status: 'pending'
        }
      });

      res.status(201).json({
        message: 'Factory registered successfully',
        data: factory
      });
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        return res.status(409).json({
          error: `${field} already exists`,
          field: field
        });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Update factory
   */
  updateFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const {
        factoryName,
        description,
        addressLine,
        city,
        district,
        province,
        postalCode,
        phoneNumber,
        email,
        businessLicenseNumber,
        taxId,
        logoUrl
      } = req.body;

      const updateData: any = {
        updated_at: new Date()
      };

      if (factoryName !== undefined) updateData.factory_name = factoryName;
      if (description !== undefined) updateData.description = description;
      if (addressLine !== undefined) updateData.address_line = addressLine;
      if (city !== undefined) updateData.city = city;
      if (district !== undefined) updateData.district = district;
      if (province !== undefined) updateData.province = province;
      if (postalCode !== undefined) updateData.postal_code = postalCode;
      if (phoneNumber !== undefined) updateData.phone_number = phoneNumber;
      if (email !== undefined) updateData.email = email;
      if (businessLicenseNumber !== undefined) updateData.business_license_number = businessLicenseNumber;
      if (taxId !== undefined) updateData.tax_id = taxId;
      if (logoUrl !== undefined) updateData.logo_url = logoUrl;

      const factory = await prisma.factories.update({
        where: { id },
        data: updateData
      });

      res.json({
        message: 'Factory updated successfully',
        data: factory
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Factory not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Delete/suspend factory
   */
  deleteFactory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.factories.delete({
        where: { id }
      });

      res.json({
        message: 'Factory deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Verify factory (admin approval)
   */
  verifyFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { verifiedBy } = req.body;

      const factory = await prisma.factories.update({
        where: { id },
        data: {
          verification_status: 'verified',
          verified_at: new Date(),
          verified_by: verifiedBy,
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Factory verified successfully',
        data: factory
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Factory not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Suspend factory
   */
  suspendFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { reason, suspensionDuration } = req.body;

      const factory = await prisma.factories.update({
        where: { id },
        data: {
          status: 'suspended',
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Factory suspended successfully',
        data: {
          factory,
          suspension: {
            reason,
            duration: suspensionDuration
          }
        }
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Factory not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Reactivate factory
   */
  reactivateFactory = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      const factory = await prisma.factories.update({
        where: { id },
        data: {
          status: 'active',
          updated_at: new Date()
        }
      });

      res.json({
        message: 'Factory reactivated successfully',
        data: factory
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Factory not found' });
      }
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Get factory performance metrics
   */
  getFactoryMetrics = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const where: any = {
        factory_id: id
      };

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate as string);
        if (endDate) where.created_at.lte = new Date(endDate as string);
      }

      // Get all sessions for this factory
      const sessions = await prisma.group_buying_sessions.findMany({
        where,
        include: {
          group_participants: true
        }
      });

      // Calculate metrics
      const totalSessions = sessions.length;
      const successfulSessions = sessions.filter(s => s.status === 'success').length;
      const successRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0;

      const totalRevenue = sessions
        .filter(s => s.status === 'success')
        .reduce((sum, s) => {
          const participants = s.group_participants || [];
          return sum + participants.reduce((pSum, p) => pSum + (p.total_price || 0), 0);
        }, 0);

      const averageSessionValue = successfulSessions > 0 ? totalRevenue / successfulSessions : 0;

      res.json({
        message: 'Factory metrics retrieved successfully',
        data: {
          factoryId: id,
          period: {
            startDate,
            endDate
          },
          metrics: {
            totalSessions,
            successfulSessions,
            failedSessions: totalSessions - successfulSessions,
            successRate: Math.round(successRate * 100) / 100,
            totalRevenue,
            averageSessionValue: Math.round(averageSessionValue)
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: List factory sessions
   */
  getFactorySessions = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {
        factory_id: id
      };

      if (status) {
        where.status = status;
      }

      const [sessions, total] = await Promise.all([
        prisma.group_buying_sessions.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            products: {
              select: {
                id: true,
                name: true,
                base_price: true
              }
            },
            _count: {
              select: {
                group_participants: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.group_buying_sessions.count({ where })
      ]);

      res.json({
        message: 'Factory sessions retrieved successfully',
        data: sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Admin: Force cancel session
   */
  forceCancelSession = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, sessionId } = req.params;
      const { reason, refundParticipants } = req.body;

      // Update session status
      const session = await prisma.group_buying_sessions.update({
        where: { id: sessionId },
        data: {
          status: 'failed',
          notes: `Admin cancelled: ${reason}`,
          updated_at: new Date()
        }
      });

      // TODO: If refundParticipants is true, trigger refund process
      // This would require calling the Payment Service

      res.json({
        message: 'Session cancelled successfully',
        data: {
          session,
          cancellation: {
            reason,
            refundParticipants
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Admin: Get factory analytics
   */
  getFactoryAnalytics = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { period = 'monthly', year = new Date().getFullYear() } = req.query;

      // Get all sessions for the factory
      const sessions = await prisma.group_buying_sessions.findMany({
        where: {
          factory_id: id,
          created_at: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`)
          }
        },
        include: {
          products: true,
          group_participants: true
        }
      });

      // Group by month
      const monthlyData = new Array(12).fill(0).map((_, month) => {
        const monthSessions = sessions.filter(s =>
          new Date(s.created_at).getMonth() === month
        );

        const revenue = monthSessions
          .filter(s => s.status === 'success')
          .reduce((sum, s) => {
            const participants = s.group_participants || [];
            return sum + participants.reduce((pSum, p) => pSum + (p.total_price || 0), 0);
          }, 0);

        return {
          month: month + 1,
          totalSessions: monthSessions.length,
          successfulSessions: monthSessions.filter(s => s.status === 'success').length,
          revenue
        };
      });

      // Get top products
      const productMap = new Map();
      sessions.forEach(s => {
        if (s.status === 'success') {
          const productId = s.product_id;
          const current = productMap.get(productId) || {
            productId,
            productName: s.products.name,
            sessions: 0,
            revenue: 0
          };

          const participants = s.group_participants || [];
          const revenue = participants.reduce((sum, p) => sum + (p.total_price || 0), 0);

          productMap.set(productId, {
            ...current,
            sessions: current.sessions + 1,
            revenue: current.revenue + revenue
          });
        }
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      res.json({
        message: 'Factory analytics retrieved successfully',
        data: {
          factoryId: id,
          period,
          year: Number(year),
          monthlyTrend: monthlyData,
          topProducts,
          summary: {
            totalSessions: sessions.length,
            successfulSessions: sessions.filter(s => s.status === 'success').length,
            totalRevenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0)
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
