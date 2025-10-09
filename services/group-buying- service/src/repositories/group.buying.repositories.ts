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
    return this.prisma.group_buying_sessions.create({
      data: {
        product_id: data.productId,
        factory_id: data.factoryId,
        session_code: data.sessionCode || this.generateSessionCode(),
        target_moq: data.targetMoq,
        group_price: data.groupPrice,
        start_time: data.startTime || new Date(),
        end_time: data.endTime,
        estimated_completion_date: data.estimatedCompletionDate || null,
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
          owner_id: true  // ✅ Add this
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


  async updateStatus(id: string, status: 'forming' | 'active' | 'moq_reached' | 'success' | 'failed' | 'cancelled') {
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

    return this.prisma.group_buying_sessions.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            group_participants: true
          }
        }
      }
    });
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

  private generateSessionCode(): string {
    // Format: GB-YYYYMMDD-XXXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `GB-${date}-${random}`;
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
}
