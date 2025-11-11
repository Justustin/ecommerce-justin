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

        // TWO-LEG SHIPPING: Get factory's default warehouse
        const { prisma } = await import('@repo/database');
        const factory = await prisma.factories.findUnique({
            where: { id: data.factoryId },
            select: {
                id: true,
                default_warehouse_id: true,
                factory_name: true
            }
        });

        if (!factory) {
            throw new Error('Factory not found');
        }

        // Use provided warehouseId or fall back to factory's default
        const warehouseId = data.warehouseId || factory.default_warehouse_id;

        if (!warehouseId) {
            throw new Error(
                `No warehouse assigned to factory ${factory.factory_name}. ` +
                `Please assign a warehouse to this factory or specify a warehouse for this session.`
            );
        }

        // Verify warehouse exists
        const warehouse = await prisma.warehouses.findUnique({
            where: { id: warehouseId },
            select: { id: true, name: true }
        });

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        // Calculate per-unit bulk shipping cost (Leg 1: Factory → Warehouse)
        const bulkShippingCost = data.bulkShippingCost || 0;
        const bulkShippingCostPerUnit = bulkShippingCost > 0
            ? bulkShippingCost / data.targetMoq
            : 0;

        logger.info('Creating session with two-leg shipping', {
            factoryId: data.factoryId,
            warehouseId,
            warehouseName: warehouse.name,
            bulkShippingCost,
            bulkShippingCostPerUnit,
            targetMoq: data.targetMoq
        });

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
            groupPrice: data.groupPrice,  // Store base price (NOT tier price)
            // TWO-LEG SHIPPING: Include warehouse and bulk shipping cost
            warehouseId,
            bulkShippingCost,
            bulkShippingCostPerUnit
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
     * CRITICAL: Only counts participants with PAID status to prevent MOQ inflation
     *
     * Why: Users who join but never pay should NOT be counted toward MOQ
     */
    private enrichSessionWithStats(session: any) {
        // Filter to only include participants with confirmed payment
        // Payment status must be 'paid' or participant has at least one paid payment
        const paidParticipants = session.group_participants?.filter((p: any) => {
            // Check if participant has any payment with 'paid' status
            return p.payments && p.payments.length > 0 &&
                   p.payments.some((payment: any) => payment.payment_status === 'paid');
        }) || [];

        // Calculate total quantity ONLY from paid participants
        const totalQuantity = paidParticipants.reduce(
            (sum: number, p: any) => sum + Number(p.quantity || 0),
            0
        );

        // Calculate total revenue ONLY from paid participants
        const totalRevenue = paidParticipants.reduce(
            (sum: number, p: any) => sum + Number(p.total_price || 0),
            0
        );

        // Total participant count (all)
        const totalParticipantCount = session._count?.group_participants || 0;

        // Paid participant count
        const paidParticipantCount = paidParticipants.length;

        // Pending participants (joined but not paid yet)
        const pendingParticipantCount = totalParticipantCount - paidParticipantCount;

        // Return session with enhanced stats
        return {
            ...session,
            _stats: {
                totalQuantity,              // Only from PAID participants
                totalRevenue,                // Only from PAID participants
                paidParticipantCount,        // Number of people who PAID
                pendingParticipantCount,     // Number of people who joined but NOT paid
                totalParticipantCount,       // Total people (paid + pending)
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

    /**
     * Get shipping options grouped by delivery speed
     * Called by frontend BEFORE user joins session to show shipping choices
     * TWO-LEG SHIPPING: Returns Leg 1 (Factory→Warehouse) + Leg 2 (Warehouse→User)
     */
    async getShippingOptions(sessionId: string, userId: string, quantity: number, variantId?: string) {
        const session = await this.repository.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // TWO-LEG SHIPPING: Calculate Leg 1 (Factory → Warehouse) cost
        const leg1PerUnit = Number(session.bulk_shipping_cost_per_unit) || 0;
        const leg1Total = leg1PerUnit * quantity;

        // Get warehouse for Leg 2 calculation
        if (!session.warehouse_id || !session.warehouses) {
            throw new Error('No warehouse assigned to this session');
        }

        const warehouse = session.warehouses;

        try {
            const logisticsServiceUrl = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';

            logger.info('Fetching shipping options for group buying (two-leg)', {
                sessionId,
                productId: session.product_id,
                variantId,
                quantity,
                userId,
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                leg1PerUnit,
                leg1Total
            });

            // TWO-LEG SHIPPING: Use warehouse postal code as origin (not factory!)
            const ratesResponse = await axios.post(`${logisticsServiceUrl}/api/rates`, {
                originPostalCode: warehouse.postal_code, // ← Warehouse, not factory!
                userId: userId, // Fixed: was destinationUserId, should be userId
                productId: session.product_id,
                variantId: variantId,
                quantity: quantity,
                couriers: 'jne,jnt,sicepat,anteraja'
            });

            if (!ratesResponse.data.success || !ratesResponse.data.data.pricing || ratesResponse.data.data.pricing.length === 0) {
                throw new Error('No shipping rates available');
            }

            const allRates = ratesResponse.data.data.pricing;

            // Group rates by delivery time
            const grouped = this.groupShippingBySpeed(allRates);

            // TWO-LEG SHIPPING: Add Leg 1 cost to each option
            const addLeg1Costs = (option: any) => {
                if (!option) return null;
                return {
                    ...option,
                    leg1Cost: leg1Total,          // Factory → Warehouse share
                    leg2Cost: option.price,        // Warehouse → User (original price)
                    totalShipping: leg1Total + option.price  // Combined shipping cost
                };
            };

            logger.info('Shipping options grouped with two-leg costs', {
                sessionId,
                leg1Total,
                sameDay: grouped.sameDay ? `${grouped.sameDay.courier_name} (${grouped.sameDay.price})` : null,
                express: grouped.express ? `${grouped.express.courier_name} (${grouped.express.price})` : null,
                regular: grouped.regular ? `${grouped.regular.courier_name} (${grouped.regular.price})` : null
            });

            return {
                sameDay: addLeg1Costs(grouped.sameDay),
                express: addLeg1Costs(grouped.express),
                regular: addLeg1Costs(grouped.regular),
                productPrice: quantity * Number(session.group_price),
                gatewayFeePercentage: 3, // 3% gateway fee
                // TWO-LEG SHIPPING: Provide breakdown for frontend
                breakdown: {
                    leg1PerUnit,
                    leg1Total,
                    warehouseName: warehouse.name,
                    warehouseCity: warehouse.city
                }
            };

        } catch (error: any) {
            logger.error('Failed to fetch shipping options', {
                sessionId,
                error: error.message
            });
            throw new Error(`Unable to fetch shipping options: ${error.message}`);
        }
    }

    /**
     * Helper: Group shipping rates by delivery speed
     * Returns cheapest option in each category
     */
    private groupShippingBySpeed(rates: any[]) {
        // Parse duration string to extract max days
        const parseDuration = (duration: string): number => {
            // Duration examples: "1-2 days", "2-3 days", "Same Day", "1 day"
            const match = duration.match(/(\d+)(?:-(\d+))?\s*(?:day|hari)/i);
            if (match) {
                // If range like "2-3", use max (3)
                return match[2] ? parseInt(match[2]) : parseInt(match[1]);
            }
            // Same day = 0
            if (/same\s*day|hari\s*ini/i.test(duration)) {
                return 0;
            }
            // Default to regular if can't parse
            return 3;
        };

        const sameDay: any[] = [];
        const express: any[] = []; // 1-2 days
        const regular: any[] = []; // 2-3+ days

        for (const rate of rates) {
            const maxDays = parseDuration(rate.duration);

            if (maxDays === 0) {
                sameDay.push(rate);
            } else if (maxDays <= 2) {
                express.push(rate);
            } else {
                regular.push(rate);
            }
        }

        // Pick cheapest in each category and add category type
        const pickCheapest = (category: any[], categoryType: string) => {
            if (category.length === 0) return null;
            const cheapest = category.reduce((min, rate) => rate.price < min.price ? rate : min);
            // Override the Biteship 'type' with our category type for validation
            return {
                ...cheapest,
                type: categoryType
            };
        };

        return {
            sameDay: pickCheapest(sameDay, 'sameDay'),
            express: pickCheapest(express, 'express'),
            regular: pickCheapest(regular, 'regular')
        };
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
        if(session.status !== 'forming') {
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
                        `Max ${variantAvail.maxCanOrder} allowed, ` +
                        `${variantAvail.currentOrdered} already ordered. ` +
                        `Other variants need to catch up before you can order more of this variant.`
                    );
                }

                if (data.quantity > variantAvail.available) {
                    throw new Error(
                        `Only ${variantAvail.available} units available for this variant. ` +
                        `Already ordered: ${variantAvail.currentOrdered}/${variantAvail.maxCanOrder}`
                    );
                }

                logger.info('Variant availability check passed', {
                    sessionId: data.groupSessionId,
                    variantId: data.variantId,
                    requested: data.quantity,
                    available: variantAvail.available,
                    currentOrdered: variantAvail.currentOrdered
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

        // SHIPPING INTEGRATION: Validate and use user's selected shipping option
        // User must have called getShippingOptions() first and selected one
        if (!data.selectedShipping) {
            throw new Error('Shipping option must be selected. Please choose a shipping method first.');
        }

        // TWO-LEG SHIPPING: Calculate Leg 1 (Factory → Warehouse) cost
        const leg1PerUnit = Number(session.bulk_shipping_cost_per_unit) || 0;
        const leg1Total = leg1PerUnit * data.quantity;

        // TWO-LEG SHIPPING: Leg 2 (Warehouse → User) from user's selection
        const leg2Cost = data.selectedShipping.price || 0;

        // Total shipping = Leg 1 + Leg 2
        const totalShipping = leg1Total + leg2Cost;

        const selectedCourier = {
            name: data.selectedShipping.courierName,
            service: data.selectedShipping.courierService,
            duration: data.selectedShipping.duration,
            type: data.selectedShipping.type // 'sameDay', 'express', or 'regular'
        };

        logger.info('Using two-leg shipping for payment', {
            sessionId: data.groupSessionId,
            quantity: data.quantity,
            leg1PerUnit,
            leg1Total,
            leg2Cost,
            totalShipping,
            courier: selectedCourier
        });

        // Calculate payment gateway fee (Xendit charges ~3% for e-wallet)
        const productPrice = data.totalPrice;
        const gatewayFeePercentage = 0.03; // 3%
        const gatewayFee = Math.ceil(productPrice * gatewayFeePercentage);

        // TWO-LEG SHIPPING: Total amount includes both legs
        const totalAmount = productPrice + leg1Total + leg2Cost + gatewayFee;

        logger.info('Payment breakdown calculated (two-leg)', {
            sessionId: data.groupSessionId,
            productPrice,
            leg1Cost: leg1Total,
            leg2Cost,
            totalShipping,
            gatewayFee,
            totalAmount
        });

        // CRITICAL FIX: Wrap participant creation and payment in a transaction-like flow
        // to ensure atomicity and prevent orphaned participant records
        let participant;
        let paymentResult;

        try {
            // Step 1: Create participant record first (optimistic approach)
            // If payment fails, we'll roll back by deleting the participant
            participant = await this.repository.joinSession({
                ...data,
                metadata: {
                    ...data.metadata,
                    // TWO-LEG SHIPPING: Store detailed breakdown
                    leg1Cost: leg1Total,
                    leg2Cost: leg2Cost,
                    shippingCost: totalShipping,  // Total of both legs
                    gatewayFee,
                    totalAmount,
                    selectedCourier,
                    warehouseName: session.warehouses?.name
                }
            });

            logger.info('Participant created, initiating payment', {
                groupSessionId: data.groupSessionId,
                participantId: participant.id,
                userId: data.userId
            });

            // Step 2: Create payment in escrow
            const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

            const paymentData = {
              userId: data.userId,
              groupSessionId: data.groupSessionId,
              participantId: participant.id,
              amount: totalAmount,  // ✅ Now includes shipping + gateway fee!
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

            logger.info('Payment created successfully', {
                groupSessionId: data.groupSessionId,
                participantId: participant.id,
                paymentId: paymentResult.id
            });

        } catch (error: any) {
            // CRITICAL FIX #4: Proper rollback error handling with logging
            // If we created a participant but payment failed, clean up the participant record
            if (participant) {
                logger.error('Payment failed, rolling back participant', {
                    groupSessionId: data.groupSessionId,
                    participantId: participant.id,
                    userId: data.userId,
                    error: error.message
                });

                try {
                    // Delete the participant record using Prisma directly for transaction safety
                    const { prisma } = await import('@repo/database');
                    await prisma.group_participants.delete({
                        where: { id: participant.id }
                    });

                    logger.info('Participant rollback successful after payment failure', {
                        groupSessionId: data.groupSessionId,
                        userId: data.userId,
                        participantId: participant.id
                    });
                } catch (rollbackError: any) {
                    // CRITICAL: Rollback failed - requires manual intervention
                    logger.error('CRITICAL: Failed to rollback participant after payment failure', {
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
          invoiceId: paymentResult.invoiceId,
          breakdown: {
            productPrice,
            // TWO-LEG SHIPPING: Detailed breakdown
            leg1Cost: leg1Total,
            leg2Cost: leg2Cost,
            totalShipping: totalShipping,
            gatewayFee,
            totalAmount,
            selectedCourier,
            warehouseName: session.warehouses?.name
          }
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

    // Use epsilon comparison for floating-point safety
    const EPSILON = 0.0001;
    const moqReached = (stats.totalQuantity + EPSILON) >= session.target_moq;

    return {
      ...stats,
      targetMoq: session.target_moq,
      progress: (stats.totalQuantity / session.target_moq) * 100,
      moqReached,
      timeRemaining: this.calculateTimeRemaining(session.end_time),
      status: session.status
    };
  }

  /**
   * NEW: Get variant availability using bundle-based warehouse tolerance
   *
   * KEY CONCEPT: Control how many bundles to buy by monitoring warehouse excess
   *
   * Algorithm:
   * 1. Calculate bundles needed for each variant (ceil(ordered / bundle_size))
   * 2. Find highest bundle need (what factory must produce)
   * 3. Calculate excess per variant if we produce that many bundles
   * 4. Check which variant would violate warehouse tolerance
   * 5. Constrain max bundles based on tolerance limits
   *
   * Example:
   * Bundle: 2S + 5M + 4L + 1XL (12 units total)
   * Orders: M=38, L=25, S=20, XL=5
   * Warehouse tolerance: XL max_excess=30
   *
   * M needs: ceil(38/5) = 8 bundles ← HIGHEST
   * If we produce 8 bundles: 16S, 40M, 32L, 8XL
   * XL excess: 8 - 5 = 3 ≤ 30 ✅ OK
   *
   * All variants can continue ordering!
   */
  async getVariantAvailability(sessionId: string, variantId: string | null) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { prisma } = await import('@repo/database');

    // Step 1: Get factory bundle configuration and warehouse tolerance
    const [bundleConfigs, warehouseTolerances] = await Promise.all([
      this.repository.getBundleConfig(session.product_id),
      this.repository.getWarehouseTolerance(session.product_id)
    ]);

    if (bundleConfigs.length === 0) {
      throw new Error(
        `Bundle configuration not set for this product. ` +
        `Please configure factory bundle composition in admin panel.`
      );
    }

    if (warehouseTolerances.length === 0) {
      throw new Error(
        `Warehouse tolerance not set for this product. ` +
        `Please configure warehouse limits in admin panel.`
      );
    }

    // Find requested variant's config
    const requestedBundle = bundleConfigs.find(
      b => (b.variant_id || null) === (variantId || null)
    );

    const requestedTolerance = warehouseTolerances.find(
      t => (t.variant_id || null) === (variantId || null)
    );

    if (!requestedBundle) {
      throw new Error(`Bundle config not found for variant ${variantId}`);
    }

    if (!requestedTolerance) {
      throw new Error(`Warehouse tolerance not found for variant ${variantId}`);
    }

    // Step 2: Get current orders for ALL variants (exclude bots)
    const allParticipants = await prisma.group_participants.findMany({
      where: {
        group_session_id: sessionId,
        is_bot_participant: false
      }
    });

    // Build map of current orders by variant
    const ordersByVariant: Record<string, number> = {};
    let totalOrderedAllVariants = 0;

    for (const bundle of bundleConfigs) {
      const variantKey = bundle.variant_id || 'null';
      const variantOrders = allParticipants.filter(
        p => (p.variant_id || 'null') === variantKey
      );
      const ordered = variantOrders.reduce((sum, p) => sum + p.quantity, 0);
      ordersByVariant[variantKey] = ordered;
      totalOrderedAllVariants += ordered;
    }

    const requestedVariantKey = variantId || 'null';
    const currentOrdered = ordersByVariant[requestedVariantKey] || 0;

    // Step 3: Calculate bundles needed for each variant
    const bundlesNeeded: Record<string, number> = {};

    for (const bundle of bundleConfigs) {
      const variantKey = bundle.variant_id || 'null';
      const ordered = ordersByVariant[variantKey] || 0;
      bundlesNeeded[variantKey] = Math.ceil(ordered / bundle.units_per_bundle);
    }

    // Step 4: Find maximum bundles needed (what factory must produce)
    const maxBundlesNeeded = Math.max(...Object.values(bundlesNeeded), 0);

    // Step 5: Calculate excess for each variant if we produce maxBundlesNeeded
    const excessByVariant: Record<string, number> = {};
    let maxBundlesAllowed = maxBundlesNeeded;
    let constrainingVariant: string | null = null;

    for (const bundle of bundleConfigs) {
      const variantKey = bundle.variant_id || 'null';
      const tolerance = warehouseTolerances.find(
        t => (t.variant_id || 'null') === (bundle.variant_id || 'null')
      );

      if (!tolerance) continue;

      const willProduce = maxBundlesNeeded * bundle.units_per_bundle;
      const ordered = ordersByVariant[variantKey] || 0;
      const excess = willProduce - ordered;

      excessByVariant[variantKey] = excess;

      // Check if this variant violates tolerance
      if (excess > tolerance.max_excess_units) {
        // Calculate max bundles allowed by this constraint
        const maxAllowedForThisVariant = ordered + tolerance.max_excess_units;
        const bundlesAllowed = Math.floor(maxAllowedForThisVariant / bundle.units_per_bundle);

        if (bundlesAllowed < maxBundlesAllowed) {
          maxBundlesAllowed = bundlesAllowed;
          constrainingVariant = variantKey;
        }
      }
    }

    // Step 6: Calculate available units for requested variant
    const maxCanProduce = maxBundlesAllowed * requestedBundle.units_per_bundle;
    const available = Math.max(0, maxCanProduce - currentOrdered);

    const moqProgress = session.target_moq > 0
      ? Math.round((totalOrderedAllVariants / session.target_moq) * 100)
      : 0;

    logger.info('Variant availability calculated (bundle-based)', {
      sessionId,
      variantId,
      algorithm: 'bundle_warehouse_tolerance',
      bundleSize: requestedBundle.units_per_bundle,
      warehouseTolerance: requestedTolerance.max_excess_units,
      currentOrdered,
      maxBundlesNeeded,
      maxBundlesAllowed,
      maxCanProduce,
      available,
      isLocked: available <= 0,
      constrainingVariant,
      ordersByVariant,
      excessByVariant,
      moqProgress: `${moqProgress}%`
    });

    return {
      variantId,
      unitsPerBundle: requestedBundle.units_per_bundle,
      maxExcessUnits: requestedTolerance.max_excess_units,
      currentOrdered,
      totalOrderedAllVariants,
      bundlesNeeded: bundlesNeeded[requestedVariantKey] || 0,
      maxBundlesAllowed,
      maxCanOrder: maxCanProduce,
      available,
      isLocked: available <= 0,
      constrainingVariant,
      excessIfOrdered: excessByVariant,
      moqProgress
    };
  }

  /**
   * NEW: Fulfill demand via warehouse service using bundle-based system
   * Warehouse will check stock, calculate bundles needed, reserve stock, and send WhatsApp to factory
   */
  async fulfillWarehouseDemand(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const warehouseServiceUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:3011';
    const { prisma } = await import('@repo/database');

    try {
      // Get all variant quantities from participants who have PAID
      const participants = await prisma.group_participants.findMany({
        where: {
          group_session_id: sessionId,
          payments: {
            some: {
              payment_status: 'paid'
            }
          }
        }
      });

      // Group by variant and prepare demands array
      const variantDemandsMap = participants.reduce((acc, p) => {
        const key = p.variant_id || 'null';
        acc[key] = (acc[key] || 0) + p.quantity;
        return acc;
      }, {} as Record<string, number>);

      // Convert to array format expected by warehouse
      const variantDemands = Object.entries(variantDemandsMap).map(([variantId, quantity]) => ({
        variantId: variantId === 'null' ? null : variantId,
        quantity
      }));

      logger.info('Calling warehouse bundle-based fulfillment', {
        sessionId,
        productId: session.product_id,
        variantDemands
      });

      // Call warehouse /fulfill-bundle-demand with ALL variants at once
      const response = await axios.post(
        `${warehouseServiceUrl}/api/warehouse/fulfill-bundle-demand`,
        {
          productId: session.product_id,
          sessionId,
          variantDemands
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // Longer timeout for bundle calculation
        }
      );

      const result = response.data;

      logger.info('Warehouse bundle fulfillment response', {
        sessionId,
        hasStock: result.hasStock,
        bundlesOrdered: result.bundlesOrdered,
        constrainingVariant: result.constrainingVariant
      });

      // Update session with warehouse check results
      await prisma.group_buying_sessions.update({
        where: { id: sessionId },
        data: {
          warehouse_check_at: new Date(),
          warehouse_has_stock: result.hasStock,
          grosir_units_needed: result.bundlesOrdered || 0,
          // WhatsApp sent by warehouse service if ordering needed
          factory_whatsapp_sent: !result.hasStock,
          factory_notified_at: !result.hasStock ? new Date() : null
        }
      });

      logger.info('Warehouse demand fulfilled', {
        sessionId,
        hasStock: result.hasStock,
        bundlesOrdered: result.bundlesOrdered,
        message: result.message
      });

      return {
        hasStock: result.hasStock,
        bundlesOrdered: result.bundlesOrdered || 0,
        totalUnitsOrdered: result.totalUnitsOrdered || 0,
        constrainingVariant: result.constrainingVariant,
        message: result.message,
        inventoryAdditions: result.inventoryAdditions,
        purchaseOrder: result.purchaseOrder
      };
    } catch (error: any) {
      logger.error('Warehouse demand fulfillment failed', {
        sessionId,
        error: error.message,
        stack: error.stack
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

    // Notify all participants about production start
    const participantUserIds = session.group_participants
      .filter(p => !p.is_bot_participant)
      .map(p => p.user_id);

    if (participantUserIds.length > 0) {
      await this.sendBulkNotifications({
        userIds: participantUserIds,
        type: 'production_started',
        title: 'Production Started!',
        message: `Production has started for ${session.products.name}. ${session.factories.factory_name} is now manufacturing your order.`,
        actionUrl: `/group-sessions/${session.session_code}`,
        relatedId: sessionId
      });
    }

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

    // Notify participants that production is complete and ready for shipping
    const participantUserIds = session.group_participants
      .filter(p => !p.is_bot_participant)
      .map(p => p.user_id);

    if (participantUserIds.length > 0) {
      await this.sendBulkNotifications({
        userIds: participantUserIds,
        type: 'production_completed',
        title: 'Production Complete!',
        message: `Your order for ${session.products.name} is complete and ready for shipping!`,
        actionUrl: `/group-sessions/${session.session_code}`,
        relatedId: sessionId
      });
    }

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

    // Update session status to cancelled
    await this.repository.updateStatus(sessionId, 'cancelled');

    // CRITICAL FIX: Release escrow and refund participants when session is cancelled
    // This ensures users get their money back when admin cancels a session
    try {
      const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

      // Get participant count for logging
      const participantCount = await this.repository.getParticipantCount(sessionId);

      if (participantCount > 0) {
        logger.info('Initiating refund for cancelled session', {
          sessionId,
          sessionCode: session.session_code,
          participantCount,
          reason
        });

        // Refund all participants via payment service with retry logic
        await retryWithBackoff(
          () => axios.post(`${paymentServiceUrl}/api/payments/refund-session`, {
            groupSessionId: sessionId,
            reason: reason || 'Session cancelled by admin'
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }),
          {
            maxRetries: 3,
            initialDelay: 2000
          }
        );

        logger.info('Refund initiated successfully for cancelled session', {
          sessionId,
          sessionCode: session.session_code,
          participantCount
        });
      } else {
        logger.info('No participants to refund for cancelled session', {
          sessionId,
          sessionCode: session.session_code
        });
      }

      // Notify participants about session cancellation and refund
      if (session.group_participants && session.group_participants.length > 0) {
        const participantUserIds = session.group_participants
          .filter(p => !p.is_bot_participant)
          .map(p => p.user_id);

        if (participantUserIds.length > 0) {
          await this.sendBulkNotifications({
            userIds: participantUserIds,
            type: 'session_cancelled',
            title: 'Group Session Cancelled',
            message: `The group buying session for ${session.products?.name || 'your product'} has been cancelled. Your payment will be refunded.`,
            actionUrl: `/group-sessions/${session.session_code}`,
            relatedId: sessionId
          });
        }
      }

      // Notify factory owner about session cancellation
      if (session.factories?.owner_id) {
        await this.sendNotification({
          userId: session.factories.owner_id,
          type: 'session_cancelled_factory',
          title: 'Session Cancelled',
          message: `Group buying session ${session.session_code} for ${session.products?.name || 'product'} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
          actionUrl: `/factory/sessions/${session.session_code}`,
          relatedId: sessionId
        });
      }

    } catch (error: any) {
      logger.error('Failed to refund cancelled session', {
        sessionId,
        sessionCode: session.session_code,
        error: error.message
      });
      // Don't throw - session is already cancelled, refund can be retried manually
    }

    return {
      message: 'Session cancelled successfully',
      reason,
      refundInitiated: true
    };
  }

  async checkMoqReached(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      return;
    }

    if (session.status !== 'forming') {
      return;
    }

    const stats = await this.repository.getParticipantStats(sessionId);

    // Use epsilon comparison for floating-point safety
    const EPSILON = 0.0001;
    if ((stats.totalQuantity + EPSILON) >= session.target_moq && !session.moq_reached_at) {
      await this.repository.markMoqReached(sessionId);

      // Notify factory owner that MOQ has been reached
      if (session.factories?.owner_id) {
        await this.sendNotification({
          userId: session.factories.owner_id,
          type: 'moq_reached',
          title: 'MOQ Reached!',
          message: `Your group buying session ${session.session_code} for ${session.products?.name || 'product'} has reached MOQ! ${stats.participantCount} participants, total quantity: ${stats.totalQuantity}. Start production in your dashboard.`,
          actionUrl: `/factory/sessions/${session.session_code}`,
          relatedId: sessionId
        });
      }

      // Notify all participants that group is confirmed
      if (session.group_participants && session.group_participants.length > 0) {
        const participantUserIds = session.group_participants
          .filter(p => !p.is_bot_participant)
          .map(p => p.user_id);

        if (participantUserIds.length > 0) {
          await this.sendBulkNotifications({
            userIds: participantUserIds,
            type: 'group_confirmed',
            title: 'Group Buying Confirmed!',
            message: `The group for ${session.products?.name || 'your product'} has been confirmed! Production will start soon.`,
            actionUrl: `/group-sessions/${session.session_code}`,
            relatedId: sessionId
          });
        }
      }
    }
  }

  /**
   * Process sessions that are 10 minutes before expiration
   * - Add bots to reach 25% MOQ if there's at least 1 real participant and current < 25%
   * - If no participants, expire session and create new one for next day
   */
  async processSessionsNearingExpiration() {
    const { prisma } = await import('@repo/database');

    // Find sessions expiring in 10 minutes
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
    const eightMinutesFromNow = new Date(Date.now() + 8 * 60 * 1000);

    const nearExpiringSessions = await prisma.group_buying_sessions.findMany({
      where: {
        status: 'forming',
        end_time: {
          gte: eightMinutesFromNow,  // At least 8 minutes away
          lte: tenMinutesFromNow      // At most 10 minutes away
        }
      },
      include: {
        products: {
          select: { id: true, name: true, slug: true }
        },
        group_participants: {
          where: {
            is_bot_participant: false  // Only count real participants
          }
        }
      }
    });

    logger.info(`Found ${nearExpiringSessions.length} sessions nearing expiration (10 min window)`);

    for (const session of nearExpiringSessions) {
      try {
        const realParticipants = session.group_participants;
        const realQuantity = realParticipants.reduce((sum, p) => sum + p.quantity, 0);
        const fillPercentage = (realQuantity / session.target_moq) * 100;

        logger.info('Processing near-expiring session', {
          sessionId: session.id,
          sessionCode: session.session_code,
          realParticipants: realParticipants.length,
          realQuantity,
          targetMoq: session.target_moq,
          fillPercentage: fillPercentage.toFixed(2) + '%'
        });

        // CASE 1: No real participants - expire and create new session for next day
        if (realParticipants.length === 0) {
          logger.info('No participants - expiring session and creating new one for next day', {
            sessionId: session.id
          });

          // Expire this session
          await prisma.group_buying_sessions.update({
            where: { id: session.id },
            data: {
              status: 'failed',
              updated_at: new Date()
            }
          });

          // Create new session for next day
          const nextDayStartTime = new Date();
          nextDayStartTime.setDate(nextDayStartTime.getDate() + 1);
          nextDayStartTime.setHours(0, 0, 0, 0);  // Start at midnight

          const nextDayEndTime = new Date(nextDayStartTime);
          nextDayEndTime.setHours(nextDayStartTime.getHours() + (session.group_duration_hours || 48));

          await this.repository.create({
            productId: session.product_id,
            factoryId: session.factory_id,
            targetMoq: session.target_moq,
            groupPrice: Number(session.group_price),
            basePrice: Number(session.base_price),
            groupDurationHours: session.group_duration_hours || 48,
            startTime: nextDayStartTime,
            endTime: nextDayEndTime,
            priceTier25: Number(session.price_tier_25),
            priceTier50: Number(session.price_tier_50),
            priceTier75: Number(session.price_tier_75),
            priceTier100: Number(session.price_tier_100),
            warehouseId: session.warehouse_id || undefined
          });

          logger.info('New session created for next day', {
            productId: session.product_id,
            startTime: nextDayStartTime.toISOString()
          });

          continue;
        }

        // CASE 2: Has participants but < 25% MOQ - add bots to reach 25%
        if (fillPercentage < 25) {
          const targetQuantity = Math.ceil(session.target_moq * 0.25);  // 25% of MOQ
          const botQuantityNeeded = targetQuantity - realQuantity;

          if (botQuantityNeeded > 0) {
            logger.info('Adding bot to reach 25% MOQ', {
              sessionId: session.id,
              currentFill: fillPercentage.toFixed(2) + '%',
              botQuantityNeeded
            });

            // Get platform bot user ID (or create if doesn't exist)
            const botUser = await prisma.users.findFirst({
              where: { role: 'customer', email: 'platform-bot@system.internal' }
            });

            let botUserId: string;
            if (!botUser) {
              // Create platform bot user
              const newBot = await prisma.users.create({
                data: {
                  phone_number: '+62000000000',
                  email: 'platform-bot@system.internal',
                  password_hash: 'SYSTEM_BOT_NO_LOGIN',
                  first_name: 'Platform',
                  last_name: 'Bot',
                  role: 'customer',
                  status: 'active'
                }
              });
              botUserId = newBot.id;
            } else {
              botUserId = botUser.id;
            }

            // Create bot participant
            await prisma.group_participants.create({
              data: {
                group_session_id: session.id,
                user_id: botUserId,
                quantity: botQuantityNeeded,
                variant_id: null,  // Base product
                unit_price: Number(session.price_tier_25),  // Bots pay 25% tier price
                total_price: Number(session.price_tier_25) * botQuantityNeeded,
                is_bot_participant: true,
                is_platform_order: true,
                joined_at: new Date()
              }
            });

            // Update session to show bot was added
            await prisma.group_buying_sessions.update({
              where: { id: session.id },
              data: {
                platform_bot_quantity: botQuantityNeeded,
                bot_participant_id: botUserId,
                updated_at: new Date()
              }
            });

            logger.info('Bot participant added successfully', {
              sessionId: session.id,
              botQuantity: botQuantityNeeded,
              newFillPercentage: ((realQuantity + botQuantityNeeded) / session.target_moq * 100).toFixed(2) + '%'
            });
          }
        } else {
          logger.info('Session already >= 25% MOQ, no bot needed', {
            sessionId: session.id,
            fillPercentage: fillPercentage.toFixed(2) + '%'
          });
        }

      } catch (error: any) {
        logger.error('Error processing near-expiring session', {
          sessionId: session.id,
          error: error.message,
          stack: error.stack
        });
      }
    }

    return { processed: nearExpiringSessions.length };
  }

  async processExpiredSessions() {
  const expiredSessions = await this.repository.findExpiredSessions();
  const results: Array<
    { sessionId: string; sessionCode: string; action: 'confirmed' | 'pending_stock'; participants: number; ordersCreated?: number; grosirNeeded?: number }
    | { sessionId: string; sessionCode: string; action: 'failed'; participants: number; targetMoq: number }
  > = [];

  for (const session of expiredSessions) {
    const stats = await this.repository.getParticipantStats(session.id);

    // Use epsilon comparison for floating-point safety
    const EPSILON = 0.0001;
    const moqMet = (stats.totalQuantity + EPSILON) >= session.target_moq;

    if (session.status === 'moq_reached' || moqMet) {
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

      // CRITICAL: Wrap bot creation and tier update in transaction for atomicity
      let botCreated = false;
      try {
        await prisma.$transaction(async (tx) => {
          // If < 25%, create bot to fill to 25%
          if (realFillPercentage < 25) {
            const botQuantity = Math.ceil(fullSession.target_moq * 0.25) - realQuantity;

            if (botQuantity > 0) {
              const botUserId = process.env.BOT_USER_ID;
              if (botUserId) {
                const botParticipant = await tx.group_participants.create({
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

                await tx.group_buying_sessions.update({
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
              }
            }
          }

          // Update session with final tier (in same transaction)
          await tx.group_buying_sessions.update({
            where: { id: session.id },
            data: {
              current_tier: finalTier,
              updated_at: new Date()
            }
          });
        });
      } catch (error: any) {
        logger.error('Failed to process bot creation and tier update', {
          sessionId: session.id,
          error: error.message
        });
        // Continue processing even if bot creation fails
      }

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
                  unitPrice: Number(p.unit_price)  // Price they actually paid when joining (base price) - refund handled separately
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

        // Notify participants that session is confirmed and orders created
        const participantUserIds = fullSession.group_participants
          .filter(p => !p.is_bot_participant)
          .map(p => p.user_id);

        if (participantUserIds.length > 0) {
          await this.sendBulkNotifications({
            userIds: participantUserIds,
            type: 'session_confirmed',
            title: 'Session Confirmed!',
            message: `Your group buying session for ${fullSession.products?.name || 'product'} has been confirmed! Orders have been created and production will start soon.`,
            actionUrl: `/group-sessions/${session.session_code}`,
            relatedId: session.id
          });
        }

        // Notify factory to start production
        if (fullSession.factories?.owner_id) {
          await this.sendNotification({
            userId: fullSession.factories.owner_id,
            type: 'start_production',
            title: 'Start Production',
            message: `Group buying session ${session.session_code} for ${fullSession.products?.name || 'product'} is confirmed. ${orderResult.ordersCreated || 0} orders created. Please start production.`,
            actionUrl: `/factory/sessions/${session.session_code}`,
            relatedId: session.id
          });
        }

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

      // Get full session details for notifications
      const fullSession = await this.repository.findById(session.id);

      // Trigger refunds via payment-service
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

        // Notify participants that session failed and refund is coming
        if (fullSession?.group_participants && fullSession.group_participants.length > 0) {
          const participantUserIds = fullSession.group_participants
            .filter(p => !p.is_bot_participant)
            .map(p => p.user_id);

          if (participantUserIds.length > 0) {
            await this.sendBulkNotifications({
              userIds: participantUserIds,
              type: 'session_failed',
              title: 'Group Session Not Confirmed',
              message: `The group buying session for ${fullSession.products?.name || 'product'} didn't reach minimum order quantity. Your payment will be refunded.`,
              actionUrl: `/group-sessions/${session.session_code}`,
              relatedId: session.id
            });
          }
        }

        // Notify factory that session failed
        if (fullSession?.factories?.owner_id) {
          await this.sendNotification({
            userId: fullSession.factories.owner_id,
            type: 'session_failed_factory',
            title: 'Session Not Confirmed',
            message: `Group buying session ${session.session_code} for ${fullSession.products?.name || 'product'} failed to reach MOQ. Current: ${stats.totalQuantity}, Target: ${session.target_moq}.`,
            actionUrl: `/factory/sessions/${session.session_code}`,
            relatedId: session.id
          });
        }

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

  /**
   * Send notification to a single user via notification-service
   */
  private async sendNotification(params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
  }) {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

      await axios.post(`${notificationServiceUrl}/api/notifications`, {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl || null,
        relatedId: params.relatedId || null
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      logger.info('Notification sent', {
        userId: params.userId,
        type: params.type
      });
    } catch (error: any) {
      logger.error('Failed to send notification', {
        userId: params.userId,
        type: params.type,
        error: error.message
      });
      // Don't throw - notification failure shouldn't block core operations
    }
  }

  /**
   * Send notifications to multiple users in parallel
   */
  private async sendBulkNotifications(params: {
    userIds: string[];
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
  }) {
    const notifications = params.userIds.map(userId =>
      this.sendNotification({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        relatedId: params.relatedId
      })
    );

    await Promise.allSettled(notifications);

    logger.info('Bulk notifications sent', {
      recipientCount: params.userIds.length,
      type: params.type
    });
  }

}