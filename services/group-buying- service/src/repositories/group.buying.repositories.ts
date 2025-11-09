import { PrismaClient } from '@repo/database';
import {
  CreateGroupSessionDTO,
  UpdateGroupSessionDTO,
  JoinGroupDTO,
  GroupSessionFilters,
  PaginatedResponse
} from '../types';

export class GroupBuyingRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createSession(data: CreateGroupSessionDTO) {
    const sessionCode = data.sessionCode || await this.generateSessionCode();

    return this.prisma.group_buying_sessions.create({
      data: {
        product_id: data.productId,
        factory_id: data.factoryId,
        session_code: sessionCode,
        target_moq: data.targetMoq,
        group_price: data.groupPrice,
        start_time: data.startTime || new Date(),
        end_time: data.endTime,
        estimated_completion_date: data.estimatedCompletionDate || null,
        // TIERING SYSTEM: Add price tier fields
        price_tier_25: data.priceTier25 || null,
        price_tier_50: data.priceTier50 || null,
        price_tier_75: data.priceTier75 || null,
        price_tier_100: data.priceTier100 || null,
        current_tier: data.currentTier || 25,
        // status defaults to 'forming' from schema
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            base_price: true,
            product_images: {
              take: 1,
              orderBy: { display_order: 'asc' },
              select: {
                image_url: true
              }
            }
          }
        },
        factories: {
          select: {
            id: true,
            factory_name: true,
            city: true,
            province: true,
            phone_number: true
          }
        },
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });
  }

  async findById(id: string) {
    return this.prisma.group_buying_sessions.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            grosir_unit_size: true,  // NEW: For grosir allocation system
            product_images: {
              orderBy: { display_order: 'asc' },
              select: {
                image_url: true,
                display_order: true
              }
            }
          }
        },
        factories: {
        select: {
          id: true,
          factory_name: true,
          city: true,
          province: true,
          phone_number: true,
          logo_url: true,
          owner_id: true
        }
        },
        group_participants: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true
              }
            },
            product_variants: {
              select: {
                id: true,
                variant_name: true,
                price_adjustment: true
              }
            }
          },
          orderBy: {
            joined_at: 'asc'
          }
        },
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });
  }

  async findByCode(sessionCode: string) {
    return this.prisma.group_buying_sessions.findUnique({
      where: { session_code: sessionCode },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            base_price: true,
            product_images: {
              orderBy: { display_order: 'asc' },
              select: {
                image_url: true
              }
            }
          }
        },
        factories: {
          select: {
            id: true,
            factory_name: true,
            city: true,
            province: true
          }
        },
        group_participants: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true
              }
            }
          },
          orderBy: {
            joined_at: 'asc'
          }
        },
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });
  }

  async findAll(filters: GroupSessionFilters): Promise<PaginatedResponse<any>> {
    const where: any = {};

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Factory filter
    if (filters.factoryId) {
      where.factory_id = filters.factoryId;
    }

    // Product filter
    if (filters.productId) {
      where.product_id = filters.productId;
    }

    // Active only (not expired, not finished)
    if (filters.activeOnly) {
      where.end_time = {
        gt: new Date()
      };
      where.status = {
        in: ['forming', 'active', 'moq_reached']
      };
    }

    // Search by session code or product name
    if (filters.search) {
      where.OR = [
        {
          session_code: {
            contains: filters.search,
            mode: 'insensitive'
          }
        },
        {
          products: {
            product_name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.group_buying_sessions.count({ where }),
      this.prisma.group_buying_sessions.findMany({
        where,
        skip,
        take: limit,
        include: {
          products: {
            select: {
              id: true,
              name: true,
              base_price: true,
              product_images: {
                take: 1,
                orderBy: { display_order: 'asc' },
                select: {
                  image_url: true
                }
              }
            }
          },
          factories: {
            select: {
              id: true,
              factory_name: true,
              city: true
            }
          },
          _count: {
            select: {
              group_participants: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
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

  async updateSession(id: string, data: UpdateGroupSessionDTO) {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.groupPrice !== undefined) updateData.group_price = data.groupPrice;
    if (data.targetMoq !== undefined) updateData.target_moq = data.targetMoq;
    if (data.estimatedCompletionDate !== undefined) {
      updateData.estimated_completion_date = data.estimatedCompletionDate;
    }

    return this.prisma.group_buying_sessions.update({
      where: { id },
      data: updateData,
      include: {
        products: true,
        factories: true,
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });
  }

  async deleteSession(id: string) {
    return this.prisma.group_buying_sessions.delete({
      where: { id }
    });
  }


  async updateStatus(id: string, status: 'forming' | 'active' | 'moq_reached' | 'success' | 'failed' | 'cancelled' | 'pending_stock' | 'stock_received') {
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    // Auto-set timestamps based on status transitions
    if (status === 'moq_reached') {
      updateData.moq_reached_at = new Date();
    }

    if (status === 'success') {
      updateData.production_completed_at = new Date();
    }

    // CRITICAL: For processExpiredSessions race condition prevention
    // Only update if current status is NOT already at the target status
    // This makes the operation idempotent
    try {
      const result = await this.prisma.group_buying_sessions.updateMany({
        where: {
          id,
          status: { not: status } // Only update if status is different
        },
        data: updateData
      });

      // Return true if row was updated, false if already at that status
      return result.count > 0;
    } catch (error) {
      console.error(`Failed to update status for session ${id}:`, error);
      return false;
    }
  }

  async markMoqReached(id: string) {
    return this.updateStatus(id, 'moq_reached');
  }

  async markSuccess(id: string) {
    return this.updateStatus(id, 'success');
  }

  async markFailed(id: string) {
    return this.updateStatus(id, 'failed');
  }

  async startProduction(id: string) {
    return this.prisma.group_buying_sessions.update({
      where: { id },
      data: {
        production_started_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async joinSession(data: JoinGroupDTO) {
    return this.prisma.group_participants.create({
      data: {
        group_session_id: data.groupSessionId,
        user_id: data.userId,
        quantity: data.quantity,
        variant_id: data.variantId || null,
        unit_price: data.unitPrice,
        total_price: data.totalPrice,
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            avatar_url: true
          }
        },
        product_variants: {
          select: {
            id: true,
            variant_name: true
          }
        }
      }
    });
  }

  async leaveSession(sessionId: string, userId: string) {
    // Can only leave if no order has been created
    return this.prisma.group_participants.deleteMany({
      where: {
        group_session_id: sessionId,
        user_id: userId,
        order_id: null
      }
    });
  }

  async hasUserJoined(sessionId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.group_participants.count({
      where: {
        group_session_id: sessionId,
        user_id: userId
      }
    });
    return count > 0;
  }

  async getParticipantCount(sessionId: string): Promise<number> {
    return this.prisma.group_participants.count({
      where: {
        group_session_id: sessionId
      }
    });
  }

  async getParticipantStats(sessionId: string) {
    const stats = await this.prisma.group_participants.aggregate({
      where: { group_session_id: sessionId },
      _count: true,
      _sum: {
        quantity: true,
        total_price: true
      }
    });

    return {
      participantCount: stats._count,
      totalQuantity: stats._sum.quantity || 0,
      totalRevenue: stats._sum.total_price || 0
    };
  }

  async getSessionParticipants(sessionId: string) {
    return this.prisma.group_participants.findMany({
      where: {
        group_session_id: sessionId
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true
          }
        },
        product_variants: {
          select: {
            id: true,
            variant_name: true
          }
        }
      },
      orderBy: {
        joined_at: 'asc'
      }
    });
  }

  async findExpiredSessions() {
    return this.prisma.group_buying_sessions.findMany({
      where: {
        end_time: {
          lte: new Date()
        },
        status: {
          in: ['forming', 'active', 'moq_reached'] // Only get unprocessed sessions
        }
      },
      include: {
        group_participants: {
          where: {
            order_id: null // Only participants without orders
          }
        },
        factories: {
          select: {
            id: true,
            owner_id: true
          }
        },
        products: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async findSessionsReachingMoq() {
    // Get all forming/active sessions that haven't been marked as moq_reached
    const sessions = await this.prisma.group_buying_sessions.findMany({
      where: {
        status: {
          in: ['forming', 'active']
        },
        moq_reached_at: null
      },
      include: {
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });

    // Filter sessions where participant count >= target MOQ
    return sessions.filter(session => 
      session._count.group_participants >= session.target_moq
    );
  }

  private async generateSessionCode(): Promise<string> {
    const crypto = await import('crypto');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let attempts = 0;
    while (attempts < 10) {
      // Generate 8 secure random alphanumeric characters
      const randomBytes = crypto.randomBytes(6);
      const random = randomBytes
        .toString('base64')
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 5)
        .toUpperCase();

      const code = `GB-${date}-${random}`;

      // Check for collision
      const exists = await this.sessionCodeExists(code);
      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique session code after 10 attempts');
  }

  async sessionCodeExists(code: string): Promise<boolean> {
    const count = await this.prisma.group_buying_sessions.count({
      where: { session_code: code }
    });
    return count > 0;
  }

  async markOrdersCreated(sessionId: string) {
  return this.prisma.group_buying_sessions.update({
    where: { id: sessionId },
    data: {
      status: 'orders_created', // New status to prevent reprocessing
      updated_at: new Date()
    }
  });
}

  // ========================================================================
  // NEW: Grosir Bundle-Based Allocation System
  // ========================================================================

  /**
   * Get factory bundle configuration for a product
   * Returns how many units of each variant come in one factory bundle
   */
  async getBundleConfig(productId: string) {
    return this.prisma.grosir_bundle_config.findMany({
      where: { product_id: productId },
      orderBy: { variant_id: 'asc' }
    });
  }

  /**
   * Get warehouse tolerance configuration for a product
   * Returns max excess units acceptable for each variant
   */
  async getWarehouseTolerance(productId: string) {
    return this.prisma.grosir_warehouse_tolerance.findMany({
      where: { product_id: productId },
      orderBy: { variant_id: 'asc' }
    });
  }

  /**
   * Get both bundle config and warehouse tolerance for a product
   * Used by variant availability calculation
   */
  async getGrosirConfig(productId: string) {
    const [bundleConfig, warehouseTolerance] = await Promise.all([
      this.getBundleConfig(productId),
      this.getWarehouseTolerance(productId)
    ]);

    return {
      bundleConfig,
      warehouseTolerance
    };
  }

  /**
   * Create bundle configuration for a product
   * Admin use only - defines factory bundle composition
   */
  async createBundleConfig(data: {
    productId: string;
    variantId: string | null;
    unitsPerBundle: number;
    notes?: string;
  }) {
    return this.prisma.grosir_bundle_config.create({
      data: {
        product_id: data.productId,
        variant_id: data.variantId,
        units_per_bundle: data.unitsPerBundle,
        notes: data.notes || null
      }
    });
  }

  /**
   * Create warehouse tolerance for a product
   * Admin use only - defines max excess acceptable
   */
  async createWarehouseTolerance(data: {
    productId: string;
    variantId: string | null;
    maxExcessUnits: number;
    clearanceRateEstimate?: number;
    notes?: string;
  }) {
    return this.prisma.grosir_warehouse_tolerance.create({
      data: {
        product_id: data.productId,
        variant_id: data.variantId,
        max_excess_units: data.maxExcessUnits,
        clearance_rate_estimate: data.clearanceRateEstimate || null,
        notes: data.notes || null
      }
    });
  }

  /**
   * Update bundle configuration
   */
  async updateBundleConfig(id: string, data: {
    unitsPerBundle?: number;
    notes?: string;
  }) {
    return this.prisma.grosir_bundle_config.update({
      where: { id },
      data: {
        units_per_bundle: data.unitsPerBundle,
        notes: data.notes,
        updated_at: new Date()
      }
    });
  }

  /**
   * Update warehouse tolerance
   */
  async updateWarehouseTolerance(id: string, data: {
    maxExcessUnits?: number;
    clearanceRateEstimate?: number;
    notes?: string;
  }) {
    return this.prisma.grosir_warehouse_tolerance.update({
      where: { id },
      data: {
        max_excess_units: data.maxExcessUnits,
        clearance_rate_estimate: data.clearanceRateEstimate,
        notes: data.notes,
        updated_at: new Date()
      }
    });
  }

  /**
   * Delete bundle config for a product
   */
  async deleteBundleConfig(productId: string) {
    return this.prisma.grosir_bundle_config.deleteMany({
      where: { product_id: productId }
    });
  }

  /**
   * Delete warehouse tolerance for a product
   */
  async deleteWarehouseTolerance(productId: string) {
    return this.prisma.grosir_warehouse_tolerance.deleteMany({
      where: { product_id: productId }
    });
  }
}
