import { GroupBuyingRepository } from '../repositories/group.buying.repositories'
import axios from "axios"
import { retryWithBackoff } from '../utils/retry.utils'
import { logger } from '../utils/logger.utils'

import {
  CreateGroupSessionDTO,
  UpdateGroupSessionDTO,
  JoinGroupDTO,
  GroupSessionFilters
} from '../types'

export class GroupBuyingService {
    private repository: GroupBuyingRepository;

    constructor() {
        this.repository = new GroupBuyingRepository()
    }

    async createSession(data: CreateGroupSessionDTO) {
        if(data.targetMoq < 2) {
            throw new Error('Minimum order quantity (moq) must be at least 2');
        }
        if(data.groupPrice <= 0) {
            throw new Error('Group price must be greater than 0')
        }
        if(data.endTime <= new Date()) {
            throw new Error('End time must be in the future')
        }

        const startTime = data.startTime || new Date()
        if(data.sessionCode) {
            const exists = await this.repository.sessionCodeExists(data.sessionCode)
            if(exists) {
                throw new Error(`Session code ${data.sessionCode} already exists`)
            }
        }

        // TIERING SYSTEM: Validate tier prices are provided and in descending order
        if (!data.priceTier25 || !data.priceTier50 || !data.priceTier75 || !data.priceTier100) {
            throw new Error(
                'All tier prices must be provided: priceTier25, priceTier50, priceTier75, priceTier100'
            );
        }

        const tier25 = Number(data.priceTier25);
        const tier50 = Number(data.priceTier50);
        const tier75 = Number(data.priceTier75);
        const tier100 = Number(data.priceTier100);

        // Validate prices are in descending order (higher tier = lower price)
        if (tier25 < tier50 || tier50 < tier75 || tier75 < tier100) {
            throw new Error(
                'Tier prices must be in descending order: ' +
                'priceTier25 >= priceTier50 >= priceTier75 >= priceTier100. ' +
                `Got: ${tier25} >= ${tier50} >= ${tier75} >= ${tier100}`
            );
        }

        // Validate all tier prices are positive
        if (tier25 <= 0 || tier50 <= 0 || tier75 <= 0 || tier100 <= 0) {
            throw new Error('All tier prices must be greater than 0');
        }

        const sessionData = {
            ...data,
            priceTier25: tier25,
            priceTier50: tier50,
            priceTier75: tier75,
            priceTier100: tier100,
            currentTier: 25,
            groupPrice: data.groupPrice  // Store base price (NOT tier price)
        };

        const session = await this.repository.createSession(sessionData);

        // NOTE: Bot is NOT created here
        // Bot will be created in processExpiredSessions ONLY if < 25% MOQ filled
        // This ensures we don't always hit 25% but only fill to minimum when needed

        logger.info('Group buying session created with tiering', {
            sessionId: session.id,
            sessionCode: session.session_code,
            basePrice: data.groupPrice,
            tiers: {
                tier25,
                tier50,
                tier75,
                tier100
            }
        });

        return session;
    }

    async getSessionById(id: string) {
        const session = await this.repository.findById(id)
        if(!session) {
            throw new Error('Session not found')
        }
        // Add computed statistics for total quantity
        return this.enrichSessionWithStats(session)
    }

    /**
     * Enrich session data with computed statistics
     * Calculates totalQuantity by summing participant quantities
     */
    private enrichSessionWithStats(session: any) {
        // Calculate total quantity from all participants
        const totalQuantity = session.group_participants?.reduce(
            (sum: number, p: any) => sum + Number(p.quantity || 0),
            0
        ) || 0;

        // Calculate total revenue
        const totalRevenue = session.group_participants?.reduce(
            (sum: number, p: any) => sum + Number(p.total_price || 0),
            0
        ) || 0;

        // Return session with enhanced stats
        return {
            ...session,
            _stats: {
                totalQuantity,
                totalRevenue,
                participantCount: session._count?.group_participants || 0,
                moqProgress: session.target_moq > 0 ? (totalQuantity / session.target_moq) * 100 : 0,
                moqReached: totalQuantity >= session.target_moq
            }
        };
    }

    async getSessionByCode(code: string) {
        const session = await this.repository.findByCode(code)
        if(!session) {
            throw new Error('Session not found')
        }
        // Add computed statistics for total quantity
        return this.enrichSessionWithStats(session)
    }
    async listSessions(filters: GroupSessionFilters) {
        return this.repository.findAll(filters)
    }
    async updateSession(id: string, data: UpdateGroupSessionDTO) {
        const session = await this.repository.findById(id)
        if(!session) {
            throw new Error('Session not found')
        }
        if(session.status !== 'forming') {
            throw new Error('Only session in forming status can be updated')
        }
        if(data.endTime && data.endTime <= new Date()) {
            throw new Error('End time must be in the future')
        }
        if(data.groupPrice !== undefined && data.groupPrice <= 0) {
            throw new Error('Group price must be greater than 0')
        }
        if(data.targetMoq !== undefined && data.targetMoq < 2) {
            throw new Error('Minimum order quantity (moq) must be at least 2')
        }
        return this.repository.updateSession(id,data)
    }
    async joinSession(data: JoinGroupDTO) {
        const session = await this.repository.findById(data.groupSessionId)
        if(!session) {
            throw new Error('Session not found')
        }
        if(session.status !== 'forming' && session.status !== 'active') {
            throw new Error('Cannot join this session. Session is no longer accepting participants')
        }
        if(session.end_time <= new Date()) {
            throw new Error('Session has expired')
        }

        // Validate quantity
        if(data.quantity < 1) {
            throw new Error('Quantity must be at least 1')
        }

        // GROSIR VARIANT ALLOCATION CHECK: Enforce 2x allocation limit
        if (data.variantId) {
            try {
                const variantAvail = await this.getVariantAvailability(
                    data.groupSessionId,
                    data.variantId
                );

                if (variantAvail.isLocked) {
                    throw new Error(
                        `Variant is currently locked. ` +
                        `Max ${variantAvail.maxAllowed} allowed, ` +
                        `${variantAvail.totalOrdered} already ordered. ` +
                        `Other variants need to catch up before you can order more of this variant.`
                    );
                }

                if (data.quantity > variantAvail.available) {
                    throw new Error(
                        `Only ${variantAvail.available} units available for this variant. ` +
                        `Already ordered: ${variantAvail.totalOrdered}/${variantAvail.maxAllowed}`
                    );
                }

                logger.info('Variant availability check passed', {
                    sessionId: data.groupSessionId,
                    variantId: data.variantId,
                    requested: data.quantity,
                    available: variantAvail.available,
                    totalOrdered: variantAvail.totalOrdered
                });
            } catch (error: any) {
                // If allocation doesn't exist, that's okay - product might not use grosir system
                if (!error.message.includes('not configured')) {
                    throw error;
                }
                logger.info('Product does not use grosir allocation system', {
                    sessionId: data.groupSessionId,
                    productId: session.product_id
                });
            }
        }

        // CRITICAL FIX #1: Validate unit price matches session group price
        if(Number(data.unitPrice) !== Number(session.group_price)) {
            throw new Error(
                `Invalid unit price. Expected ${session.group_price}, got ${data.unitPrice}`
            )
        }

        // Validate total price calculation
        const calculatedTotal = data.quantity * Number(session.group_price)
        if(data.totalPrice !== calculatedTotal) {
            throw new Error(`Total price must be ${calculatedTotal} for quantity ${data.quantity}`)
        }

        // Create participant - users can join multiple times with different variants
        const participant = await this.repository.joinSession(data)

        let paymentResult;
        try {
            const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

            const paymentData = {
              userId: data.userId,
              groupSessionId: data.groupSessionId,
              participantId: participant.id,
              amount: data.totalPrice,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              isEscrow: true,
              factoryId: session.factory_id
            };

            // CRITICAL FIX #3: Add retry logic with exponential backoff
            const response = await retryWithBackoff(
              () => axios.post(`${paymentServiceUrl}/api/payments/escrow`, paymentData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000  // 10 second timeout
              }),
              {
                maxRetries: 3,
                initialDelay: 1000
              }
            );

            paymentResult = response.data.data;
          } catch (error: any) {
            // CRITICAL FIX #4: Proper rollback error handling with logging
            try {
              await this.repository.leaveSession(data.groupSessionId, data.userId);

              logger.info('Participant rollback successful after payment failure', {
                groupSessionId: data.groupSessionId,
                userId: data.userId,
                participantId: participant.id
              });
            } catch (rollbackError: any) {
              // CRITICAL: Rollback failed - requires manual intervention
              logger.critical('CRITICAL: Failed to rollback participant after payment failure', {
                groupSessionId: data.groupSessionId,
                userId: data.userId,
                participantId: participant.id,
                paymentError: error.message,
                rollbackError: rollbackError.message,
                stackTrace: rollbackError.stack
              });

              // Throw with more context for operations team
              throw new Error(
                `Payment failed AND rollback failed. Manual cleanup required. ` +
                `Participant ID: ${participant.id}. ` +
                `Original error: ${error.response?.data?.message || error.message}`
              );
            }

            throw new Error(`Payment failed: ${error.response?.data?.message || error.message}`);
          }

        await this.checkMoqReached(session.id)

        // NOTE: Tier pricing is NOT calculated here
        // Everyone pays BASE PRICE upfront
        // Refunds based on final tier are issued in processExpiredSessions

        return {
          participant,
          payment: paymentResult.payment,
          paymentUrl: paymentResult.paymentUrl,
          invoiceId: paymentResult.invoiceId
        };
    }
    async leaveSession(sessionId: string, userId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'moq_reached' || session.status === 'success') {
      throw new Error('Cannot leave confirmed sessions');
    }

    const result = await this.repository.leaveSession(sessionId, userId);
    
    if (result.count === 0) {
      throw new Error('User is not a participant or has already been converted to an order');
    }

    return { message: 'Successfully left the session' };
  }

  async getParticipants(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return this.repository.getSessionParticipants(sessionId);
  }

  async getSessionStats(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const stats = await this.repository.getParticipantStats(sessionId);
    
    return {
      ...stats,
      targetMoq: session.target_moq,
      progress: (stats.participantCount / session.target_moq) * 100,
      moqReached: stats.participantCount >= session.target_moq,
      timeRemaining: this.calculateTimeRemaining(session.end_time),
      status: session.status
    };
  }

  /**
   * Get variant availability for grosir allocation system
   * DYNAMIC CAP: A variant can only be 2x allocation AHEAD of the least ordered variant
   *
   * Example: MOQ=12 (3S, 3M, 3L, 3XL per grosir)
   * - Orders: 6M, 0S, 0L, 0XL
   * - Least = 0, so M capped at 0 + (2*3) = 6 ← LOCKED
   * - When others reach 3, M can order 3 more (up to 9)
   */
  async getVariantAvailability(sessionId: string, variantId: string | null) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { prisma } = await import('@repo/database');

    // Get ALL variant allocations for this product
    const allocations = await prisma.grosir_variant_allocations.findMany({
      where: {
        product_id: session.product_id
      }
    });

    if (allocations.length === 0) {
      throw new Error(
        `Variant allocation not configured for this product. ` +
        `Please contact factory to set up grosir allocations.`
      );
    }

    // Get requested variant's allocation
    const requestedAllocation = allocations.find(
      a => (a.variant_id || null) === (variantId || null)
    );

    if (!requestedAllocation) {
      throw new Error(`Variant not found in grosir allocation configuration.`);
    }

    // Get ALL participants in this session (exclude bots)
    const allParticipants = await prisma.group_participants.findMany({
      where: {
        group_session_id: sessionId,
        is_bot_participant: false  // Don't count bot in variant calculations
      }
    });

    // Group orders by variant and calculate total per variant
    const ordersByVariant: Record<string, number> = {};

    for (const allocation of allocations) {
      const variantKey = allocation.variant_id || 'null';
      const variantOrders = allParticipants.filter(
        p => (p.variant_id || 'null') === variantKey
      );
      ordersByVariant[variantKey] = variantOrders.reduce((sum, p) => sum + p.quantity, 0);
    }

    // Find minimum ordered quantity across ALL variants
    const orderedQuantities = Object.values(ordersByVariant);
    const minOrdered = orderedQuantities.length > 0 ? Math.min(...orderedQuantities) : 0;

    // DYNAMIC CAP: min + (2 * allocation)
    const dynamicCap = minOrdered + (2 * requestedAllocation.allocation_quantity);

    // Current orders for requested variant
    const requestedVariantKey = variantId || 'null';
    const currentOrdered = ordersByVariant[requestedVariantKey] || 0;

    // Available = dynamic cap - current ordered
    const available = Math.max(0, dynamicCap - currentOrdered);

    logger.info('Variant availability calculated', {
      sessionId,
      variantId,
      allOrders: ordersByVariant,
      minOrdered,
      allocation: requestedAllocation.allocation_quantity,
      dynamicCap,
      currentOrdered,
      available,
      isLocked: available <= 0
    });

    return {
      variantId,
      allocation: requestedAllocation.allocation_quantity,
      maxAllowed: dynamicCap,  // This is now dynamic!
      totalOrdered: currentOrdered,
      available,
      isLocked: available <= 0,
      // Additional context for debugging
      minOrderedAcrossVariants: minOrdered,
      ordersByVariant
    };
  }

  /**
   * Fulfill demand via warehouse service
   * Warehouse will check stock, reserve it, and send WhatsApp to factory if needed
   */
  async fulfillWarehouseDemand(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const warehouseServiceUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:3011';
    const { prisma } = await import('@repo/database');

    // Define type for warehouse response
    interface WarehouseFulfillmentResult {
      variantId: string;
      quantity: number;
      message: string;
      hasStock: boolean;
      reserved?: number;
      inventoryId?: string;
      purchaseOrder?: any;
      grosirUnitsNeeded?: number;
    }

    try {
      // Get all variant quantities from participants
      const participants = await prisma.group_participants.findMany({
        where: { group_session_id: sessionId }
      });

      // Group by variant
      const variantDemands = participants.reduce((acc, p) => {
        const key = p.variant_id || 'base';
        acc[key] = (acc[key] || 0) + p.quantity;
        return acc;
      }, {} as Record<string, number>);

      const grosirUnitSize = session.products.grosir_unit_size || 12;
      const results: WarehouseFulfillmentResult[] = [];

      // Call warehouse /fulfill-demand for each variant
      // Warehouse service will handle stock check and factory WhatsApp
      for (const [variantId, quantity] of Object.entries(variantDemands)) {
        const response = await axios.post(
          `${warehouseServiceUrl}/api/warehouse/fulfill-demand`,
          {
            productId: session.product_id,
            variantId: variantId === 'base' ? null : variantId,
            quantity,
            wholesaleUnit: grosirUnitSize
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );

        results.push({
          variantId,
          quantity,
          ...response.data
        });
      }

      const allInStock = results.every(r => r.hasStock);
      const totalGrosirNeeded = results
        .filter(r => !r.hasStock)
        .reduce((sum, r) => sum + (r.grosirUnitsNeeded || 0), 0);

      // Update session with warehouse check results
      await prisma.group_buying_sessions.update({
        where: { id: sessionId },
        data: {
          warehouse_check_at: new Date(),
          warehouse_has_stock: allInStock,
          grosir_units_needed: totalGrosirNeeded,
          // WhatsApp sent by warehouse service if no stock
          factory_whatsapp_sent: !allInStock,
          factory_notified_at: !allInStock ? new Date() : null
        }
      });

      logger.info('Warehouse demand fulfilled', {
        sessionId,
        allInStock,
        totalGrosirNeeded,
        results
      });

      return {
        hasStock: allInStock,
        grosirNeeded: totalGrosirNeeded,
        results
      };
    } catch (error: any) {
      logger.error('Warehouse demand fulfillment failed', {
        sessionId,
        error: error.message
      });
      throw new Error(`Failed to fulfill warehouse demand: ${error.message}`);
    }
  }

  async startProduction(sessionId: string, factoryOwnerId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.factories.owner_id !== factoryOwnerId) {
      throw new Error('Only factory owner can start production');
    }

    if (session.status !== 'moq_reached') {
      throw new Error('Can only start production for confirmed sessions');
    }

    if (session.production_started_at) {
      throw new Error('Production already started');
    }

    await this.repository.startProduction(sessionId);

      // TODO: Notify all participants
  // await notificationService.sendBulk({
  //   type: 'PRODUCTION_STARTED',
  //   recipients: session.group_participants.map(p => p.user_id),
  //   data: {
  //     sessionCode: session.session_code,
  //     productName: session.products.product_name,
  //     factoryName: session.factories.factory_name,
  //     estimatedCompletion: session.estimated_completion_date
  //   },
  //   channels: ['email', 'push']
  // });

    return { message: 'Production started successfully' };
  }

  async completeProduction(sessionId: string, factoryOwnerId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.factories.owner_id !== factoryOwnerId) {
      throw new Error('Only factory owner can complete production');
    }

    if (!session.production_started_at) {
      throw new Error('Production has not been started');
    }

    if (session.production_completed_at) {
      throw new Error('Production already completed');
    }

    await this.repository.markSuccess(sessionId);

    try {
      const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

      // MAJOR FIX: Add retry logic for escrow release
      await retryWithBackoff(
        () => axios.post(`${paymentServiceUrl}/api/payments/release-escrow`, {
          groupSessionId: sessionId
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }),
        {
          maxRetries: 3,
          initialDelay: 1000
        }
      );

      logger.info('Escrow released successfully', { sessionId });
    } catch (error: any) {
      logger.error(`Failed to release escrow for session ${sessionId}`, {
        error: error.message,
        sessionId
      });
    }
      // TODO: Notify participants - ready for shipping
  // await notificationService.sendBulk({
  //   type: 'PRODUCTION_COMPLETED',
  //   recipients: session.group_participants.map(p => p.user_id),
  //   data: {
  //     sessionCode: session.session_code,
  //     productName: session.products.product_name,
  //     nextStep: 'Preparing for shipment'
  //   },
  //   channels: ['email', 'push']
  // });
  
  // TODO: Trigger logistics - create pickup tasks
  // await logisticsService.createPickupTask({
  //   sessionId: sessionId,
  //   factoryId: session.factory_id,
  //   orderIds: session.group_participants.map(p => p.order_id)
  // });

    return { message: 'Production completed successfully' };
  }

  async cancelSession(sessionId: string, reason?: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'success' || session.status === 'moq_reached') {
      throw new Error('Cannot cancel confirmed or completed sessions');
    }

    await this.repository.updateStatus(sessionId, 'cancelled');

    return { message: 'Session cancelled successfully', reason };
  }

  async checkMoqReached(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      return;
    }

    if (session.status !== 'forming' && session.status !== 'active') {
      return;
    }

    const stats = await this.repository.getParticipantStats(sessionId);
    
    if (stats.participantCount >= session.target_moq && !session.moq_reached_at) {
      await this.repository.markMoqReached(sessionId);

          // TODO: Notify factory owner
    // await notificationService.send({
    //   type: 'MOQ_REACHED',
    //   recipientId: session.factories.owner_id,
    //   data: {
    //     sessionCode: session.session_code,
    //     productName: session.products.product_name,
    //     participantCount: stats.participantCount,
    //     totalRevenue: stats.totalRevenue,
    //     action: 'Start production in your dashboard'
    //   },
    //   channels: ['email', 'push', 'sms']
    // });
    
    // TODO: Notify all participants
    // await notificationService.sendBulk({
    //   type: 'GROUP_CONFIRMED',
    //   recipients: session.group_participants.map(p => p.user_id),
    //   data: {
    //     sessionCode: session.session_code,
    //     productName: session.products.product_name,
    //     estimatedCompletion: session.estimated_completion_date
    //   },
    //   channels: ['email', 'push']
    // });
    }
  }

  async processExpiredSessions() {
  const expiredSessions = await this.repository.findExpiredSessions();
  const results: Array<
    { sessionId: string; sessionCode: string; action: 'confirmed' | 'pending_stock'; participants: number; ordersCreated?: number; grosirNeeded?: number }
    | { sessionId: string; sessionCode: string; action: 'failed'; participants: number; targetMoq: number }
  > = [];

  for (const session of expiredSessions) {
    const stats = await this.repository.getParticipantStats(session.id);

    if (session.status === 'moq_reached' || stats.participantCount >= session.target_moq) {
      // CRITICAL FIX #5: Make processing idempotent with atomic status update
      // Try to claim this session for processing
      const claimed = await this.repository.updateStatus(session.id, 'moq_reached');

      // If we couldn't claim it (another process got it first), skip
      if (!claimed) {
        logger.info('Session already being processed by another instance', {
          sessionId: session.id,
          sessionCode: session.session_code
        });
        continue;
      }

      // Get full session data with participants
      const fullSession = await this.repository.findById(session.id);

      if (!fullSession) continue;

      // NEW GROSIR FLOW: Fulfill demand via warehouse
      // Warehouse will check stock, reserve it, and send WhatsApp to factory if needed
      try {
        logger.info('Fulfilling warehouse demand for session', {
          sessionId: session.id,
          sessionCode: session.session_code
        });

        const warehouseResult = await this.fulfillWarehouseDemand(session.id);

        // If warehouse doesn't have stock, factory has been notified via WhatsApp
        // Mark session as pending_stock and wait
        if (!warehouseResult.hasStock) {
          logger.info('Warehouse out of stock - factory notified, waiting for stock', {
            sessionId: session.id,
            grosirNeeded: warehouseResult.grosirNeeded
          });

          // Mark as pending_stock (new status)
          await this.repository.updateStatus(session.id, 'pending_stock');

          results.push({
            sessionId: session.id,
            sessionCode: session.session_code,
            action: 'pending_stock',
            participants: stats.participantCount,
            grosirNeeded: warehouseResult.grosirNeeded
          });

          continue; // Don't create orders yet - wait for stock
        }

        logger.info('Warehouse has sufficient stock - proceeding with orders', {
          sessionId: session.id
        });
      } catch (error: any) {
        logger.error('Warehouse demand fulfillment failed - proceeding without check', {
          sessionId: session.id,
          error: error.message
        });
        // Continue with order creation even if warehouse check fails
        // This is backward compatible for products that don't use warehouse
      }

      // TIERING SYSTEM: Calculate final tier and issue refunds
      const { prisma } = await import('@repo/database');

      // Get all REAL participants (exclude any existing bots)
      const realParticipants = fullSession.group_participants.filter(p => !p.is_bot_participant);
      const realQuantity = realParticipants.reduce((sum, p) => sum + p.quantity, 0);
      const realFillPercentage = (realQuantity / fullSession.target_moq) * 100;

      logger.info('Calculating final tier for session', {
        sessionId: session.id,
        realParticipants: realParticipants.length,
        realQuantity,
        targetMoq: fullSession.target_moq,
        fillPercentage: realFillPercentage
      });

      // If < 25%, create bot to fill to 25%
      let botCreated = false;
      if (realFillPercentage < 25) {
        const botQuantity = Math.ceil(fullSession.target_moq * 0.25) - realQuantity;

        if (botQuantity > 0) {
          const botUserId = process.env.BOT_USER_ID;
          if (botUserId) {
            try {
              const botParticipant = await prisma.group_participants.create({
                data: {
                  group_session_id: session.id,
                  user_id: botUserId,
                  quantity: botQuantity,
                  variant_id: null,
                  unit_price: Number(fullSession.group_price), // Base price
                  total_price: Number(fullSession.group_price) * botQuantity,
                  is_bot_participant: true,
                  joined_at: new Date()
                }
              });

              await prisma.group_buying_sessions.update({
                where: { id: session.id },
                data: { bot_participant_id: botParticipant.id }
              });

              botCreated = true;
              logger.info('Bot created to fill to 25% MOQ', {
                sessionId: session.id,
                botQuantity,
                realQuantity,
                totalNow: realQuantity + botQuantity
              });
            } catch (error: any) {
              logger.error('Failed to create bot participant', {
                sessionId: session.id,
                error: error.message
              });
            }
          }
        }
      }

      // Determine final tier based on REAL user fill percentage (not including bot)
      let finalTier = 25;
      let finalPrice = Number(fullSession.price_tier_25);

      if (realFillPercentage >= 100) {
        finalTier = 100;
        finalPrice = Number(fullSession.price_tier_100);
      } else if (realFillPercentage >= 75) {
        finalTier = 75;
        finalPrice = Number(fullSession.price_tier_75);
      } else if (realFillPercentage >= 50) {
        finalTier = 50;
        finalPrice = Number(fullSession.price_tier_50);
      }

      // Update session with final tier
      await prisma.group_buying_sessions.update({
        where: { id: session.id },
        data: {
          current_tier: finalTier,
          updated_at: new Date()
        }
      });

      logger.info('Final tier determined', {
        sessionId: session.id,
        realFillPercentage: Math.round(realFillPercentage),
        finalTier,
        finalPrice,
        basePrice: Number(fullSession.group_price)
      });

      // Calculate refund amount per unit
      const basePrice = Number(fullSession.group_price);
      const refundPerUnit = basePrice - finalPrice;

      // Issue refunds to all REAL participants (not bot)
      if (refundPerUnit > 0) {
        const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3010';

        for (const participant of realParticipants) {
          const totalRefund = refundPerUnit * participant.quantity;

          try {
            await axios.post(`${walletServiceUrl}/api/wallet/credit`, {
              userId: participant.user_id,
              amount: totalRefund,
              description: `Group buying refund - Session ${fullSession.session_code} (Tier ${finalTier}%)`,
              reference: `GROUP_REFUND_${session.id}_${participant.id}`,
              metadata: {
                sessionId: session.id,
                participantId: participant.id,
                basePricePerUnit: basePrice,
                finalPricePerUnit: finalPrice,
                refundPerUnit: refundPerUnit,
                quantity: participant.quantity
              }
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000
            });

            logger.info('Refund issued to participant', {
              sessionId: session.id,
              userId: participant.user_id,
              quantity: participant.quantity,
              refundPerUnit,
              totalRefund
            });
          } catch (error: any) {
            logger.error('Failed to issue refund to participant', {
              sessionId: session.id,
              userId: participant.user_id,
              totalRefund,
              error: error.message
            });
            // Continue processing other participants
          }
        }
      } else {
        logger.info('No refunds needed - final price equals base price', {
          sessionId: session.id,
          basePrice,
          finalPrice
        });
      }

      // Remove bot participant before creating orders (bot doesn't get real order)
      if (botCreated && fullSession.bot_participant_id) {
        try {
          await this.removeBotParticipant(fullSession.bot_participant_id);
          logger.info('Bot participant removed after refunds issued', {
            sessionId: session.id
          });
        } catch (error: any) {
          logger.error('Failed to remove bot participant', {
            sessionId: session.id,
            error: error.message
          });
        }
      }

      // Create bulk orders via order-service
      try {
        const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';

        // TIERING SYSTEM: Filter out bot participants - only create orders for real users
        const realParticipants = fullSession.group_participants.filter(
          p => !p.is_bot_participant
        );

        if (realParticipants.length === 0) {
          logger.warn('No real participants in session after filtering bots', {
            sessionId: session.id
          });
          // Mark as failed since only bot was participating
          await this.repository.markFailed(session.id);
          continue;
        }

        // MAJOR FIX: Add retry logic for order creation
        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(`${orderServiceUrl}/api/orders/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                groupSessionId: session.id,
                participants: realParticipants.map(p => ({
                  userId: p.user_id,
                  participantId: p.id,
                  productId: fullSession.product_id,
                  variantId: p.variant_id || undefined,
                  quantity: p.quantity,
                  unitPrice: Number(p.unit_price)  // Price they paid at their tier
                }))
              })
            });

            if (!res.ok) {
              const error = await res.json().catch(() => ({ message: res.statusText }));
              throw new Error(error.message || `HTTP ${res.status}`);
            }

            return res;
          },
          {
            maxRetries: 3,
            initialDelay: 2000
          }
        );

        const orderResult = await response.json();
        logger.info(`Created orders for session ${session.session_code}`, {
          sessionId: session.id,
          ordersCreated: orderResult.ordersCreated
        });

        // TODO: Calculate and charge shipping
        // await shippingService.calculateAndCharge(session.id);

        // TODO: Notify participants - session confirmed
        // TODO: Notify factory - start production

        results.push({
          sessionId: session.id,
          sessionCode: session.session_code,
          action: 'confirmed',
          participants: stats.participantCount,
          ordersCreated: fullSession.group_participants.length
        });
      } catch (error: any) {
        logger.error(`Error creating orders for session ${session.session_code}`, {
          sessionId: session.id,
          error: error.message
        });

        // Revert status on failure so it can be retried
        await this.repository.updateStatus(session.id, 'forming');

        results.push({
          sessionId: session.id,
          sessionCode: session.session_code,
          action: 'confirmed',
          participants: stats.participantCount
        });
      }
    } else {
      // Session failed - didn't reach MOQ
      await this.repository.markFailed(session.id);

      // TODO: Notify participants - refund coming
      // TODO: Notify factory - session failed
      // TODO: Trigger refunds via payment-service

      try {
        const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

        // MAJOR FIX: Add retry logic for refunds
        await retryWithBackoff(
          () => axios.post(`${paymentServiceUrl}/api/payments/refund-session`, {
            groupSessionId: session.id,
            reason: 'Group buying session failed to reach MOQ'
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }),
          {
            maxRetries: 3,
            initialDelay: 2000
          }
        );

        logger.info('Refund initiated for failed session', {
          sessionId: session.id,
          sessionCode: session.session_code
        });
      } catch (error: any) {
        logger.error(`Failed to refund session ${session.session_code}`, {
          sessionId: session.id,
          error: error.message
        });
      }

      results.push({
        sessionId: session.id,
        sessionCode: session.session_code,
        action: 'failed',
        participants: stats.participantCount,
        targetMoq: session.target_moq
      });
    }
  }

  return results;
}

  private calculateTimeRemaining(endTime: Date): {
    hours: number;
    minutes: number;
    expired: boolean;
  } {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
  }

  async deleteSession(id: string) {
    const session = await this.repository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'moq_reached' || session.status === 'success') {
      throw new Error('Cannot delete confirmed or completed sessions');
    }

    const participantCount = await this.repository.getParticipantCount(id);
    if (participantCount > 0) {
      throw new Error('Cannot delete session with participants. Cancel it instead');
    }

    return this.repository.deleteSession(id);
  }

  /**
   * TESTING: Manually expire and process a specific session
   * Sets end_time to now and immediately processes the session
   */
  async manuallyExpireAndProcess(sessionId: string) {
    const { prisma } = await import('@repo/database');

    // Set end_time to past so it's considered expired
    await prisma.group_buying_sessions.update({
      where: { id: sessionId },
      data: { end_time: new Date(Date.now() - 1000) } // 1 second ago
    });

    logger.info('Session manually expired for testing', { sessionId });

    // Process it immediately
    const results = await this.processExpiredSessions();

    return {
      sessionId,
      processResults: results.filter(r => r.sessionId === sessionId)
    };
  }

  /**
   * TIERING SYSTEM: Create bot participant to ensure 25% minimum MOQ
   * The bot participant fills up to 25% of the MOQ to ensure the session
   * always shows at least 25% filled (even with 0 real users)
   */
  private async createBotParticipant(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const botUserId = process.env.BOT_USER_ID;
    if (!botUserId) {
      logger.warn('BOT_USER_ID not configured - skipping bot participant creation');
      return;
    }

    // Calculate quantity needed for 25% MOQ
    const botQuantity = Math.ceil(session.target_moq * 0.25);
    const botPrice = Number(session.price_tier_25 || session.group_price);

    const { prisma } = await import('@repo/database');

    const botParticipant = await prisma.group_participants.create({
      data: {
        group_session_id: sessionId,
        user_id: botUserId,
        quantity: botQuantity,
        variant_id: null,  // Bot buys base product (no variant)
        unit_price: botPrice,
        total_price: botPrice * botQuantity,
        is_bot_participant: true,
        joined_at: new Date()
      }
    });

    // Update session with bot participant ID
    await prisma.group_buying_sessions.update({
      where: { id: sessionId },
      data: { bot_participant_id: botParticipant.id }
    });

    logger.info(`Bot joined session ${session.session_code}`, {
      sessionId: sessionId,
      botQuantity,
      moqPercentage: 25
    });
  }

  /**
   * TIERING SYSTEM: Update pricing tier based on real participant fill percentage
   * Bot participants don't count toward tier calculation - only real users do
   */
  private async updatePricingTier(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Skip if session doesn't use tiering system
    if (!session.price_tier_25 || !session.price_tier_50 ||
        !session.price_tier_75 || !session.price_tier_100) {
      return;
    }

    const { prisma } = await import('@repo/database');

    // Get REAL participants only (exclude bot)
    const realParticipants = await prisma.group_participants.findMany({
      where: {
        group_session_id: sessionId,
        is_bot_participant: false
      }
    });

    // Calculate total quantity ordered by real users
    const realQuantity = realParticipants.reduce((sum, p) => sum + p.quantity, 0);
    const fillPercentage = (realQuantity / session.target_moq) * 100;

    // Determine new tier based on real user fill percentage
    let newTier = 25;
    let newPrice = Number(session.price_tier_25);

    if (fillPercentage >= 100) {
      newTier = 100;
      newPrice = Number(session.price_tier_100);
    } else if (fillPercentage >= 75) {
      newTier = 75;
      newPrice = Number(session.price_tier_75);
    } else if (fillPercentage >= 50) {
      newTier = 50;
      newPrice = Number(session.price_tier_50);
    }

    // Update session if tier changed
    if (newTier !== session.current_tier) {
      await prisma.group_buying_sessions.update({
        where: { id: sessionId },
        data: {
          current_tier: newTier,
          group_price: newPrice,
          updated_at: new Date()
        }
      });

      logger.info(`Session ${session.session_code} upgraded to tier ${newTier}%`, {
        sessionId,
        oldTier: session.current_tier,
        newTier,
        oldPrice: Number(session.group_price),
        newPrice,
        fillPercentage: Math.round(fillPercentage)
      });

      // TODO: Notify all participants of price drop
      // For now, all participants benefit from tier upgrade (retroactive discount)
      // Early joiners automatically get the better price when tier improves
    }
  }

  /**
   * TIERING SYSTEM: Remove bot participant when MOQ is reached
   * Bot is removed so no order is created for it (no real payment needed)
   */
  private async removeBotParticipant(botParticipantId: string) {
    const { prisma } = await import('@repo/database');

    // Bot participant is removed - no order created, no payment needed
    await prisma.group_participants.delete({
      where: { id: botParticipantId }
    });

    logger.info(`Removed bot participant`, {
      botParticipantId
    });
  }

}