# Group Buying - Grosir Allocation System Implementation

## 🎯 Business Requirements

### **Grosir (Wholesale) System**

**Problem:** Factory produces in wholesale units with specific variant distributions
- **Example:** Shirt MOQ = 12 (1 grosir)
  - Distribution: 4 Small + 4 Medium + 4 Large + 4 XL = 12 total
  - Each variant has an allocation (e.g., M = 4 per grosir)

**Variant Limit Rule:** Max order = 2× allocation
- If M allocation = 4, max buyers can order = 8 M
- Once 8 M sold, M is locked until other sizes catch up
- Prevents inventory imbalance

### **Current Flow vs Required Flow**

**Current (Wrong):**
```
User → Join Session → Direct Payment → MOQ Check → Create Orders
```

**Required (Correct):**
```
User → Laku Ecommerce → Check Laku Warehouse Stock
                              ↓
                     If insufficient:
                              ↓
               Send WhatsApp to Factory (automated)
                              ↓
               Factory sends grosir to warehouse
                              ↓
               Warehouse packages → Ship to buyers
```

---

## 🗄️ Database Changes Needed

### **1. New Table: `grosir_variant_allocations`**

Stores how many of each variant in a grosir unit.

```prisma
model grosir_variant_allocations {
  id                    String   @id @default(uuid())
  product_id            String   @db.Uuid
  variant_id            String?  @db.Uuid  // null = base product
  allocation_quantity   Int      // How many of this variant per grosir
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  products              products             @relation(fields: [product_id], references: [id])
  product_variants      product_variants?    @relation(fields: [variant_id], references: [id])

  @@unique([product_id, variant_id])
  @@index([product_id])
}
```

**Example Data:**
```sql
INSERT INTO grosir_variant_allocations (product_id, variant_id, allocation_quantity) VALUES
('shirt-123', 'variant-S', 4),   -- 4 Small per grosir
('shirt-123', 'variant-M', 4),   -- 4 Medium per grosir
('shirt-123', 'variant-L', 4),   -- 4 Large per grosir
('shirt-123', 'variant-XL', 4);  -- 4 XL per grosir
```

### **2. Update `products` Table**

Add grosir unit size:

```prisma
model products {
  // ... existing fields ...
  grosir_unit_size      Int?     // Total units in 1 grosir (e.g., 12)
  grosir_allocations    grosir_variant_allocations[]
}
```

### **3. Update `group_buying_sessions` Table**

Add warehouse integration fields:

```prisma
model group_buying_sessions {
  // ... existing fields ...
  warehouse_check_at        DateTime?     // When warehouse was checked
  warehouse_has_stock       Boolean?      // Does warehouse have stock?
  factory_notified_at       DateTime?     // When factory was notified
  factory_whatsapp_sent     Boolean?      // WhatsApp sent to factory
  grosir_units_needed       Int?          // How many grosir units to order
}
```

---

## 💡 Implementation Plan

### **Phase 1: Variant Allocation Tracking** ⏱️ 2 hours

#### 1.1 Create Migration
```typescript
// packages/database/prisma/migrations/.../migration.sql
CREATE TABLE grosir_variant_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  allocation_quantity INT NOT NULL CHECK (allocation_quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, variant_id)
);

ALTER TABLE products
  ADD COLUMN grosir_unit_size INT,
  ADD COLUMN grosir_allocations JSONB; -- For backward compatibility

ALTER TABLE group_buying_sessions
  ADD COLUMN warehouse_check_at TIMESTAMPTZ,
  ADD COLUMN warehouse_has_stock BOOLEAN,
  ADD COLUMN factory_notified_at TIMESTAMPTZ,
  ADD COLUMN factory_whatsapp_sent BOOLEAN DEFAULT false,
  ADD COLUMN grosir_units_needed INT;
```

#### 1.2 Seed Data for Testing
```typescript
// Create allocations for a test product
await prisma.grosir_variant_allocations.createMany({
  data: [
    { product_id: 'test-shirt', variant_id: 'S', allocation_quantity: 4 },
    { product_id: 'test-shirt', variant_id: 'M', allocation_quantity: 4 },
    { product_id: 'test-shirt', variant_id: 'L', allocation_quantity: 4 },
    { product_id: 'test-shirt', variant_id: 'XL', allocation_quantity: 4 }
  ]
});

await prisma.products.update({
  where: { id: 'test-shirt' },
  data: { grosir_unit_size: 12 }
});
```

---

### **Phase 2: Variant Limit Enforcement** ⏱️ 3 hours

#### 2.1 New Service Method: `getVariantAvailability()`

**Location:** `services/group-buying-service/src/services/group.buying.service.ts`

```typescript
async getVariantAvailability(sessionId: string, variantId: string) {
  const session = await this.repository.findById(sessionId);
  if (!session) throw new Error('Session not found');

  // Get variant allocation
  const allocation = await prisma.grosir_variant_allocations.findUnique({
    where: {
      product_id_variant_id: {
        product_id: session.product_id,
        variant_id: variantId
      }
    }
  });

  if (!allocation) {
    throw new Error('Variant allocation not configured');
  }

  // Count how many already ordered
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
```

#### 2.2 Update `joinSession()` - Add Variant Check

```typescript
async joinSession(data: JoinGroupDTO) {
  // ... existing code ...

  // NEW: Check variant availability
  if (data.variantId) {
    const variantAvail = await this.getVariantAvailability(
      data.groupSessionId,
      data.variantId
    );

    if (variantAvail.isLocked) {
      throw new Error(
        `Variant is currently locked. ` +
        `Max ${variantAvail.maxAllowed} allowed, ` +
        `${variantAvail.totalOrdered} already ordered. ` +
        `Other variants need to catch up.`
      );
    }

    if (data.quantity > variantAvail.available) {
      throw new Error(
        `Only ${variantAvail.available} units available for this variant`
      );
    }
  }

  // ... rest of existing code ...
}
```

---

### **Phase 3: Warehouse Integration** ⏱️ 4 hours

#### 3.1 New Method: `checkWarehouseStock()`

```typescript
async checkWarehouseStock(sessionId: string) {
  const session = await this.repository.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const warehouseServiceUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:3011';

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

    // Check warehouse for each variant
    const stockChecks = await Promise.all(
      Object.entries(variantDemands).map(async ([variantId, quantity]) => {
        const response = await axios.post(
          `${warehouseServiceUrl}/api/warehouse/check-stock`,
          {
            productId: session.product_id,
            variantId: variantId === 'base' ? null : variantId,
            quantity
          }
        );
        return { variantId, ...response.data };
      })
    );

    const allInStock = stockChecks.every(check => check.hasStock);
    const grosirNeeded = stockChecks
      .filter(check => !check.hasStock)
      .reduce((sum, check) => sum + (check.grosirUnitsNeeded || 0), 0);

    // Update session
    await prisma.group_buying_sessions.update({
      where: { id: sessionId },
      data: {
        warehouse_check_at: new Date(),
        warehouse_has_stock: allInStock,
        grosir_units_needed: grosirNeeded
      }
    });

    return {
      hasStock: allInStock,
      grosirNeeded,
      stockChecks
    };
  } catch (error: any) {
    console.error('Warehouse check failed:', error);
    throw new Error('Failed to check warehouse stock');
  }
}
```

---

### **Phase 4: WhatsApp Automation to Factory** ⏱️ 2 hours

#### 4.1 New Method: `notifyFactoryForStock()`

```typescript
async notifyFactoryForStock(sessionId: string) {
  const session = await this.repository.findById(sessionId);
  if (!session) throw new Error('Session not found');

  if (session.factory_whatsapp_sent) {
    console.log('Factory already notified');
    return;
  }

  const factory = session.factories;
  if (!factory.phone_number) {
    throw new Error('Factory phone number not configured');
  }

  const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3012';

  // Calculate total grosir needed
  const totalUnits = session.grosir_units_needed || 1;

  const message = `
🏭 *Purchase Order - ${factory.factory_name}*

*Product:* ${session.products.name}
*Session Code:* ${session.session_code}
*Grosir Units Needed:* ${totalUnits}
*Total Quantity:* ${totalUnits * (session.products.grosir_unit_size || 12)}

Please prepare and send to Laku Warehouse.

*Delivery Address:*
Laku Warehouse
[Warehouse Address]

Thank you!
  `.trim();

  try {
    await axios.post(`${whatsappServiceUrl}/api/whatsapp/send`, {
      phoneNumber: factory.phone_number,
      message
    });

    await prisma.group_buying_sessions.update({
      where: { id: sessionId },
      data: {
        factory_notified_at: new Date(),
        factory_whatsapp_sent: true
      }
    });

    console.log(`✅ Factory ${factory.factory_name} notified via WhatsApp`);
  } catch (error: any) {
    console.error('Failed to send WhatsApp to factory:', error);
    throw new Error('Failed to notify factory');
  }
}
```

---

### **Phase 5: Update Process Flow** ⏱️ 2 hours

#### 5.1 Update `processExpiredSessions()`

```typescript
async processExpiredSessions() {
  // ... existing code to get expired sessions ...

  for (const session of expiredSessions) {
    const stats = await this.repository.getParticipantStats(session.id);

    if (stats.participantCount >= session.target_moq) {
      // MOQ REACHED - New flow with warehouse check

      // 1. Check warehouse stock
      const stockCheck = await this.checkWarehouseStock(session.id);

      // 2. If no stock, notify factory
      if (!stockCheck.hasStock) {
        await this.notifyFactoryForStock(session.id);

        // Mark as pending_stock (new status)
        await this.repository.updateStatus(session.id, 'pending_stock');

        results.push({
          sessionId: session.id,
          action: 'pending_stock',
          grosirNeeded: stockCheck.grosirNeeded,
          factoryNotified: true
        });

        continue; // Don't create orders yet
      }

      // 3. If stock available, proceed with orders
      // ... existing order creation logic ...

    } else {
      // MOQ FAILED - Refund
      // ... existing refund logic ...
    }
  }

  return results;
}
```

---

## 📊 New Database Status Values

Add to `group_status` enum:

```prisma
enum group_status {
  forming
  active
  moq_reached
  pending_stock      // NEW: Waiting for factory to send stock
  stock_received     // NEW: Warehouse received stock
  success
  failed
  cancelled
}
```

---

## 🧪 Testing Plan

### Test 1: Variant Limit Enforcement
```typescript
// Create session with grosir allocation: 4S, 4M, 4L, 4XL
// Max per variant = 8 (2x)

// Join 1: User A orders 5 M → ✅ Success (5/8 used)
// Join 2: User B orders 4 M → ✅ Error: Only 3 M available
// Join 3: User B orders 3 M → ✅ Success (8/8 used)
// Join 4: User C orders 1 M → ❌ Error: M is locked
// Join 5: User C orders 5 S → ✅ Success (S catches up)
// Join 6: User D orders 1 M → ✅ Success (M unlocked)
```

### Test 2: Warehouse Stock Check
```typescript
// Session reaches MOQ
// Warehouse has stock → Create orders immediately
// Warehouse no stock → Send WhatsApp, mark pending_stock
```

### Test 3: Factory Notification
```typescript
// Verify WhatsApp sent to factory phone
// Verify message contains: product, quantity, session code
// Verify factory_whatsapp_sent = true
```

---

## 🚀 Implementation Steps

### **Week 1: Database & Core Logic**
1. ✅ Create migration for new tables
2. ✅ Add seed data for testing
3. ✅ Implement `getVariantAvailability()`
4. ✅ Update `joinSession()` with variant checks
5. ✅ Test variant limit enforcement

### **Week 2: Warehouse Integration**
1. ✅ Implement `checkWarehouseStock()`
2. ✅ Update warehouse service API
3. ✅ Test stock check flow
4. ✅ Update `processExpiredSessions()`

### **Week 3: WhatsApp Automation**
1. ✅ Implement `notifyFactoryForStock()`
2. ✅ Configure factory phone numbers
3. ✅ Test WhatsApp delivery
4. ✅ Add retry logic for failures

### **Week 4: End-to-End Testing**
1. ✅ Full flow test: Join → MOQ → Warehouse → Factory → Orders
2. ✅ Edge case testing (variant limits, stock failures)
3. ✅ Performance testing (100+ participants)
4. ✅ Production deployment

---

## ⚠️ Current Issues with Existing Code

1. **No grosir allocation** - System doesn't know variant distribution
2. **No variant limits** - Users can order unlimited M size
3. **No warehouse check** - Orders created without stock verification
4. **No factory automation** - Manual process to request stock
5. **Wrong flow** - Creates orders before warehouse check

---

## 📝 Configuration Required

### Environment Variables

```bash
# Group Buying Service
WAREHOUSE_SERVICE_URL=http://localhost:3011
WHATSAPP_SERVICE_URL=http://localhost:3012

# Warehouse Service
WHATSAPP_SERVICE_URL=http://localhost:3012
```

### Factory Data

Ensure `factories` table has `phone_number`:

```sql
ALTER TABLE factories ADD COLUMN phone_number VARCHAR(20);
UPDATE factories SET phone_number = '+6281234567890' WHERE id = 'factory-123';
```

---

## 💰 Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Database Changes | 2 hours | Easy |
| Variant Limits | 3 hours | Medium |
| Warehouse Integration | 4 hours | Medium |
| WhatsApp Automation | 2 hours | Easy |
| Testing | 3 hours | Medium |
| **TOTAL** | **14 hours** | **~2 work days** |

---

This implementation will give you the complete grosir allocation system with warehouse integration and factory automation!
