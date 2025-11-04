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
        return this.repository.createSession(data)
    }

    async getSessionById(id: string) {
        const session = await this.repository.findById(id)
        if(!session) {
            throw new Error('Session not found')
        }
        return session
    }
    async getSessionByCode(code: string) {
        const session = await this.repository.findByCode(code)
        if(!session) {
            throw new Error('Session not found')
        }
        return session
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

        // Try to create participant - database constraint will prevent duplicates
        let participant;
        try {
            participant = await this.repository.joinSession(data)
        } catch (error: any) {
            // CRITICAL FIX #2: Handle unique constraint violation
            if (error.code === 'P2002') {  // Prisma unique constraint error
                throw new Error('User has already joined this session')
            }
            throw error
        }

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
   * Checks how many units of a variant can still be ordered based on 2x allocation rule
   */
  async getVariantAvailability(sessionId: string, variantId: string | null) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get variant allocation from grosir_variant_allocations table
    const { prisma } = await import('@repo/database');

    const allocation = await prisma.grosir_variant_allocations.findUnique({
      where: {
        product_id_variant_id: {
          product_id: session.product_id,
          variant_id: variantId || null
        }
      }
    });

    if (!allocation) {
      throw new Error(
        `Variant allocation not configured for this product. ` +
        `Please contact factory to set up grosir allocations.`
      );
    }

    // Count how many already ordered for this variant
    const participants = await prisma.group_participants.findMany({
      where: {
        group_session_id: sessionId,
        variant_id: variantId
      }
    });

    const totalOrdered = participants.reduce((sum, p) => sum + p.quantity, 0);
    const maxAllowed = allocation.allocation_quantity * 2; // 2x rule
    const available = maxAllowed - totalOrdered;

    return {
      variantId,
      allocation: allocation.allocation_quantity,
      maxAllowed,
      totalOrdered,
      available,
      isLocked: available <= 0
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

      // Create bulk orders via order-service
      try {
        const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';

        // MAJOR FIX: Add retry logic for order creation
        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(`${orderServiceUrl}/api/orders/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                groupSessionId: session.id,
                participants: fullSession.group_participants.map(p => ({
                  userId: p.user_id,
                  participantId: p.id,
                  productId: fullSession.product_id,
                  variantId: p.variant_id || undefined,
                  quantity: p.quantity,
                  unitPrice: Number(p.unit_price)
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

}