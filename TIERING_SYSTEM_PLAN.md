# Tiering System & Bot Auto-Join - Implementation Plan

## Current Issue

You need:
1. **Dynamic pricing tiers** based on MOQ fill percentage (25%, 50%, 75%, 100%)
2. **Bot auto-join** to ensure minimum 25% MOQ is always met
3. Clarification on variant stock checking

---

## ✅ Variant Stock Checking - Already Correct!

**Two separate checks happen at different times:**

### 1. **Grosir Allocation Check** (BEFORE payment)
```
User clicks "Join Group Buying" for Medium size
  ↓
joinSession() called
  ↓
getVariantAvailability(sessionId, "medium-id")
  ├─ Checks: totalOrdered for Medium
  ├─ Calculates: available = (allocation × 2) - totalOrdered
  └─ Returns: { available: 3, isLocked: false }
  ↓
IF isLocked = true:
  → Frontend grays out button ❌
  → User cannot join

IF available < requested quantity:
  → Error: "Only 3 units available"

IF OK:
  → Create escrow payment
```

**This happens WHEN USER TRIES TO JOIN** (before payment)

### 2. **Warehouse Inventory Check** (AFTER MOQ reached)
```
MOQ Reached (cron job)
  ↓
fulfillWarehouseDemand()
  ↓
For EACH variant:
  POST /api/warehouse/fulfill-demand
  {
    variantId: "medium-id",  ← Specific variant!
    quantity: 8              ← Total Medium ordered
  }
  ↓
Warehouse checks:
  "Do I have 8 Medium in stock?"
  ├─ YES → Reserve 8 Medium units
  └─ NO  → Create PO for Medium, WhatsApp factory
```

**This happens WHEN MOQ IS REACHED** (after all payments done)

---

## 🎯 Tiering System Implementation Needed

### Business Logic

**Price Tiers:**
- 25% MOQ → Highest price (e.g., Rp 100,000)
- 50% MOQ → Medium-high price (e.g., Rp 90,000)
- 75% MOQ → Medium-low price (e.g., Rp 80,000)
- 100% MOQ → Lowest price (e.g., Rp 70,000)

**Bot Logic:**
- If 0 real users join → Bot joins to reach 25% MOQ
- Ensures session NEVER shows below 25%
- Bot "purchases" are fake (no real payment)

### Database Schema Changes

```sql
-- Add price tiers to group_buying_sessions
ALTER TABLE group_buying_sessions
  ADD COLUMN price_tier_25 DECIMAL(15,2),  -- Price at 25% MOQ
  ADD COLUMN price_tier_50 DECIMAL(15,2),  -- Price at 50% MOQ
  ADD COLUMN price_tier_75 DECIMAL(15,2),  -- Price at 75% MOQ
  ADD COLUMN price_tier_100 DECIMAL(15,2), -- Price at 100% MOQ
  ADD COLUMN current_tier INT DEFAULT 25,  -- Current tier: 25, 50, 75, or 100
  ADD COLUMN bot_participant_id STRING;    -- Bot's participant ID (if created)

-- Mark bot participants
ALTER TABLE group_participants
  ADD COLUMN is_bot_participant BOOLEAN DEFAULT false;
```

### Implementation Flow

#### When Session Created

```typescript
// GroupBuyingService.createSession()
async createSession(data) {
  const session = await this.repository.create({
    ...data,
    price_tier_25: data.basePri  ce * 1.00,  // 100%
    price_tier_50: data.basePrice * 0.90,  // 90%
    price_tier_75: data.basePrice * 0.80,  // 80%
    price_tier_100: data.basePrice * 0.70, // 70%
    current_tier: 25,
    group_price: data.basePrice  // Start at tier 25
  });

  // Immediately create bot participant to ensure 25% MOQ
  await this.createBotParticipant(session.id);

  return session;
}
```

#### Bot Participant Creation

```typescript
async createBotParticipant(sessionId: string) {
  const session = await this.repository.findById(sessionId);
  const botUserId = process.env.BOT_USER_ID; // System bot account

  // Calculate quantity needed for 25% MOQ
  const botQuantity = Math.ceil(session.target_moq * 0.25);

  const botParticipant = await prisma.group_participants.create({
    data: {
      group_session_id: sessionId,
      user_id: botUserId,
      quantity: botQuantity,
      variant_id: null,  // Bot buys base product
      unit_price: session.price_tier_25,
      total_price: session.price_tier_25 * botQuantity,
      is_bot_participant: true,
      joined_at: new Date()
    }
  });

  // Update session with bot participant ID
  await prisma.group_buying_sessions.update({
    where: { id: sessionId },
    data: { bot_participant_id: botParticipant.id }
  });

  console.log(`Bot joined session ${session.session_code} with ${botQuantity} units (25% MOQ)`);
}
```

#### When User Joins (Update Tier)

```typescript
async joinSession(data: JoinGroupDTO) {
  // ... existing validation ...

  // Create participant
  const participant = await this.repository.joinSession(data);

  // Update pricing tier based on new participant count
  await this.updatePricingTier(data.groupSessionId);

  return participant;
}

async updatePricingTier(sessionId: string) {
  const session = await this.repository.findById(sessionId);
  const stats = await this.repository.getParticipantStats(sessionId);

  // Calculate fill percentage (excluding bot quantity)
  const realParticipants = await prisma.group_participants.findMany({
    where: {
      group_session_id: sessionId,
      is_bot_participant: false
    }
  });

  const realQuantity = realParticipants.reduce((sum, p) => sum + p.quantity, 0);
  const fillPercentage = (realQuantity / session.target_moq) * 100;

  // Determine new tier
  let newTier = 25;
  let newPrice = session.price_tier_25;

  if (fillPercentage >= 100) {
    newTier = 100;
    newPrice = session.price_tier_100;
  } else if (fillPercentage >= 75) {
    newTier = 75;
    newPrice = session.price_tier_75;
  } else if (fillPercentage >= 50) {
    newTier = 50;
    newPrice = session.price_tier_50;
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

    console.log(`Session ${session.session_code} upgraded to tier ${newTier}% - New price: ${newPrice}`);

    // TODO: Notify all participants of price drop
  }
}
```

#### When MOQ Reached (Handle Bot)

```typescript
async processExpiredSessions() {
  // ... existing code ...

  for (const session of expiredSessions) {
    const stats = await this.repository.getParticipantStats(session.id);

    // Check if MOQ reached (including bot)
    if (stats.participantCount >= session.target_moq) {
      // ...existing warehouse fulfillment...

      // After creating orders, remove bot participant if exists
      if (session.bot_participant_id) {
        await this.removeBotParticipant(session.bot_participant_id);
      }

      // Create orders for real participants only
      const realParticipants = fullSession.group_participants.filter(
        p => !p.is_bot_participant
      );

      await orderService.createBulkOrders({
        groupSessionId: session.id,
        participants: realParticipants.map(p => ({
          userId: p.user_id,
          productId: session.product_id,
          variantId: p.variant_id,
          quantity: p.quantity,
          unitPrice: p.unit_price  // Price they paid at their tier
        }))
      });
    }
  }
}

async removeBotParticipant(botParticipantId: string) {
  // Bot participant is removed - no order created, no payment needed
  await prisma.group_participants.delete({
    where: { id: botParticipantId }
  });

  console.log(`Removed bot participant ${botParticipantId}`);
}
```

---

## Frontend Display

```typescript
// Example API response
{
  "session": {
    "id": "...",
    "target_moq": 100,
    "current_participants": 30,  // Including bot (25)
    "real_participants": 5,      // Real users
    "fill_percentage": 30,       // Shows 30% (includes bot)
    "current_tier": 25,
    "group_price": 100000,       // Current price
    "price_tiers": {
      "tier_25": 100000,
      "tier_50": 90000,
      "tier_75": 80000,
      "tier_100": 70000
    },
    "next_tier": {
      "tier": 50,
      "price": 90000,
      "participants_needed": 20  // Need 20 more to reach 50%
    }
  }
}
```

**Frontend UI:**
```
┌─────────────────────────────────────┐
│  🎯 GROUP BUYING - T-Shirt Blue     │
├─────────────────────────────────────┤
│  Progress: ████████░░░░░░░░ 30/100 │
│                                     │
│  Current Price: Rp 100,000          │
│  Tier: 25% MOQ                      │
│                                     │
│  💰 Price drops at:                 │
│  • 50% (50 people) → Rp 90,000      │
│  • 75% (75 people) → Rp 80,000      │
│  • 100% (100 people) → Rp 70,000    │
│                                     │
│  [JOIN NOW - Rp 100,000] 🛒         │
└─────────────────────────────────────┘
```

---

## Key Points

1. **Bot is ALWAYS there** - Ensures 25% minimum
2. **Real users determine tier** - Bot doesn't count toward tier calculation
3. **Price drops as more join** - Incentive to share
4. **Bot removed at MOQ** - No order created for bot
5. **Users pay their tier price** - Locked in when they join

---

## Questions for You

1. **Tier calculation**: Should bot count toward tier percentage or only real users?
   - Current plan: Bot shows in progress bar, but REAL users determine tier

2. **Price lock**: When user joins at 100k (25% tier), then tier hits 50% (90k), does early joiner get refund?
   - Option A: Early joiners pay less (retroactive discount)
   - Option B: Early joiners locked at their price (first come, higher price)

3. **Bot quantity**: Should bot always be exactly 25% MOQ, or adjust as real users join?
   - Current plan: Fixed at 25% MOQ, removed at end

4. **Grosir + Tiers**: Do price tiers apply to all variants equally?
   - Example: Medium at 25% tier = 100k, at 50% tier = 90k?

---

## What I Need to Implement

Once you answer the questions above, I'll implement:

1. ✅ Database schema changes (price tiers, bot flag)
2. ✅ Bot participant creation on session start
3. ✅ Tier calculation and price updates
4. ✅ Bot removal when MOQ reached
5. ✅ Frontend API response with tier info

Let me know your preferences!
