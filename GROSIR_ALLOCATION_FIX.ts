/**
 * GROSIR ALLOCATION FIX
 *
 * PROBLEM: Current "2x allocation ahead" rule blocks popular sizes when slowest variant lags behind
 * SOLUTION: Progressive unlock based on overall MOQ progress, not inter-variant balance
 *
 * Replace the getVariantAvailability function in:
 * services/group-buying-service/src/services/group.buying.service.ts (lines 335-422)
 */

/**
 * Get variant availability for grosir allocation system
 * MOQ-BASED PROGRESSIVE UNLOCK: Variants unlock more as total MOQ fills
 *
 * OLD LOGIC (BROKEN):
 * - Formula: min(all variants) + (2 × allocation)
 * - Problem: M=6 ordered, S/L/XL=0 → M locked until others catch up
 *
 * NEW LOGIC (FIXED):
 * - Formula: allocation × multiplier (based on MOQ progress)
 * - Multipliers:
 *   - 0-25% MOQ: 2x allocation per variant
 *   - 25-50% MOQ: 4x allocation per variant
 *   - 50-75% MOQ: 6x allocation per variant
 *   - 75-100% MOQ: 10x allocation per variant
 *
 * Example: MOQ=100, Allocation M=3
 * - 0-25% filled (0-25 total units): M can order up to 6 units (3×2)
 * - 25-50% filled (25-50 total units): M can order up to 12 units (3×4)
 * - 50-75% filled (50-75 total units): M can order up to 18 units (3×6)
 * - 75-100% filled (75-100 total units): M can order up to 30 units (3×10)
 *
 * Benefits:
 * ✅ No artificial locks on popular sizes
 * ✅ Still maintains some balance early on (2x allocation before 25%)
 * ✅ Encourages MOQ completion (more available as progress increases)
 * ✅ Factory gets reasonable mix, not all one size
 * ✅ Session reaches MOQ faster (popular sizes can sell freely)
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
      is_bot_participant: false  // Don't count bot in calculations
    }
  });

  // Calculate total ordered across ALL variants (overall progress)
  const totalOrderedAllVariants = allParticipants.reduce(
    (sum, p) => sum + p.quantity,
    0
  );

  // Calculate current orders for THIS variant
  const requestedVariantKey = variantId || 'null';
  const currentOrdered = allParticipants
    .filter(p => (p.variant_id || 'null') === requestedVariantKey)
    .reduce((sum, p) => sum + p.quantity, 0);

  // Calculate MOQ progress (0.0 to 1.0)
  const moqProgress = totalOrderedAllVariants / session.target_moq;

  // =========================================================================
  // PROGRESSIVE UNLOCK based on overall MOQ progress
  // =========================================================================
  let multiplier: number;

  if (moqProgress < 0.25) {
    // 0-25% filled: Conservative - 2x allocation per variant
    // Ensures early orders maintain some variant balance
    multiplier = 2;
  } else if (moqProgress < 0.50) {
    // 25-50% filled: Moderate - 4x allocation per variant
    // Session is gaining traction, allow more flexibility
    multiplier = 4;
  } else if (moqProgress < 0.75) {
    // 50-75% filled: Liberal - 6x allocation per variant
    // Session is healthy, focus on reaching MOQ
    multiplier = 6;
  } else {
    // 75-100% filled: Very liberal - 10x allocation per variant
    // Almost at MOQ, let popular sizes push it over the finish line
    multiplier = 10;
  }

  // Calculate how many units this variant can order
  const allowedForVariant = requestedAllocation.allocation_quantity * multiplier;

  // Calculate available units for this variant
  const available = Math.max(0, allowedForVariant - currentOrdered);

  // Detailed logging for debugging
  logger.info('Variant availability calculated (MOQ-based progressive)', {
    sessionId,
    variantId,
    // Overall progress
    totalOrdered: totalOrderedAllVariants,
    targetMoq: session.target_moq,
    moqProgress: `${Math.round(moqProgress * 100)}%`,
    // Variant-specific
    allocation: requestedAllocation.allocation_quantity,
    multiplier: multiplier,
    allowedForVariant: allowedForVariant,
    currentOrdered: currentOrdered,
    available: available,
    isLocked: available <= 0
  });

  return {
    variantId,
    allocation: requestedAllocation.allocation_quantity,
    maxAllowed: allowedForVariant,  // This is now dynamic based on MOQ progress!
    totalOrdered: currentOrdered,
    available,
    isLocked: available <= 0,

    // Additional context for frontend/debugging
    moqProgress: Math.round(moqProgress * 100), // Percentage (0-100)
    totalOrderedAllVariants,
    multiplier,
    progressBracket: moqProgress < 0.25 ? '0-25%' :
                     moqProgress < 0.50 ? '25-50%' :
                     moqProgress < 0.75 ? '50-75%' : '75-100%'
  };
}

/**
 * TESTING SCENARIOS
 *
 * Setup:
 * - Product: T-Shirt
 * - MOQ: 100 units
 * - Allocation: S=3, M=3, L=3, XL=3 per grosir unit
 *
 * Scenario 1: Early Stage (0-25% MOQ)
 * =====================================
 * Current State:
 * - Total ordered: 0 (0% progress)
 * - M ordered: 0
 *
 * Action: Customer wants 6 M-size
 * Expected:
 * - Multiplier: 2x (because 0-25%)
 * - M allowed: 3 × 2 = 6
 * - Available: 6 - 0 = 6 ✅
 * - Result: Can buy 6 M-size
 *
 * Scenario 2: After First Order (still 0-25%)
 * ============================================
 * Current State:
 * - Total ordered: 6 (6% progress)
 * - M ordered: 6
 *
 * Action: Customer wants 1 more M-size
 * Expected:
 * - Multiplier: 2x (still < 25%)
 * - M allowed: 3 × 2 = 6
 * - Available: 6 - 6 = 0 ❌
 * - Result: M is locked until total reaches 25 units
 *
 * Scenario 3: Mid Stage (25-50% MOQ)
 * ===================================
 * Current State:
 * - Total ordered: 30 (30% progress)
 *   - M: 6, L: 12, S: 8, XL: 4
 * - M ordered: 6
 *
 * Action: Customer wants 6 more M-size
 * Expected:
 * - Multiplier: 4x (because 25-50%)
 * - M allowed: 3 × 4 = 12
 * - Available: 12 - 6 = 6 ✅
 * - Result: Can buy 6 more M (total 12)
 *
 * Scenario 4: Late Stage (75-100% MOQ)
 * =====================================
 * Current State:
 * - Total ordered: 80 (80% progress)
 *   - M: 12, L: 25, S: 20, XL: 23
 * - M ordered: 12
 *
 * Action: Customer wants 15 more M-size
 * Expected:
 * - Multiplier: 10x (because 75-100%)
 * - M allowed: 3 × 10 = 30
 * - Available: 30 - 12 = 18 ✅
 * - Result: Can buy 15 more M (total 27)
 * - MOQ reached: 95 total → Session succeeds!
 *
 * Final Distribution:
 * - M: 27 (popular size sold the most)
 * - L: 25
 * - XL: 23
 * - S: 20
 * - Total: 95 units (MOQ met!)
 *
 * OLD SYSTEM RESULT (for comparison):
 * - M would be locked at 6 units (because S=20, min=20, cap=20+(2×3)=26)
 * - Session would FAIL to reach MOQ because popular sizes blocked
 *
 * NEW SYSTEM RESULT:
 * - M can sell freely as session progresses
 * - Session SUCCEEDS with reasonable variant mix
 * - Factory gets 95 units with natural demand distribution
 */

/**
 * ALTERNATIVE SOLUTIONS (not implemented, for future consideration)
 *
 * Solution 2: Soft Caps with Warnings
 * ====================================
 * - Don't block any purchases
 * - Just warn users when ordering "too much" of one variant
 * - Let factory handle imbalance
 *
 * Pros: No artificial restrictions, better UX
 * Cons: Factory might get very imbalanced orders (e.g., 80 M-size, 20 total others)
 *
 * Solution 3: Remove Grosir Allocation Entirely
 * ==============================================
 * - Just track total MOQ
 * - Let factory produce whatever sells
 *
 * Pros: Simplest, no blocks
 * Cons: Could result in 100 M-size orders
 *
 * Solution 4: Factory-Flexible Allocation
 * ========================================
 * - Track demand freely during session
 * - When session ends, factory decides:
 *   1. Produce exactly what was ordered
 *   2. Offer substitutions (L instead of M)
 *   3. Produce extra grosir units
 *
 * Pros: Maximum flexibility, real demand-driven
 * Cons: More complex fulfillment, some customers might get refunds/substitutions
 */

export {};
