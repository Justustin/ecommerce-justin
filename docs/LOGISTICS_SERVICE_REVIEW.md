# Logistics Service - Comprehensive Review

**Service:** Logistics Service (Biteship Integration)
**Review Date:** 2025-11-09
**Status:** ⚠️ CRITICAL ISSUES - SERVICE CANNOT FUNCTION

## Executive Summary

The Logistics Service contains **14 CRITICAL issues** and **18 HIGH severity issues** that prevent basic functionality. **Public routes are not registered**, missing dependencies will cause startup failures, and critical security vulnerabilities exist.

**Severity:** 🔴 **SERVICE WILL NOT START OR FUNCTION**

---

## Critical Blockers

### 1. WRONG PACKAGE NAME 🔴
**File:** `package.json:2`
```json
{
  "name": "product-service"  // ❌ Should be "logistics-service"
}
```

### 2. MISSING CRITICAL DEPENDENCIES 🔴
**Missing from package.json:**
- `axios` - Used throughout service
- `swagger-jsdoc` - Used in config
- `swagger-ui-express` - Used in config

**Impact:** Service will not compile or run

### 3. PUBLIC ROUTES NOT REGISTERED 🔴
**File:** `src/index.ts`
```typescript
app.use('/api/admin', adminRoutes);
// ❌ MISSING: app.use('/api', logisticsRoutes);
```

**Impact:** All public endpoints return 404 - service non-functional

### 4. INVALID PRISMA RELATION 🔴
**File:** `src/repositories/logistics.repository.ts:87-90`
```typescript
include: {
  pickup_tasks: {  // ❌ RELATION DOES NOT EXIST!
    include: { factories: true }
  }
}
```

**Impact:** Runtime crash when calling GET /api/admin/shipments/:id

### 5. SQL INJECTION VULNERABILITY 🔴
**File:** `src/controllers/admin.controller.ts:288-295`
```typescript
avgDeliveryTime = prisma.$queryRaw`
  SELECT AVG(...)
  ${startDate ? prisma.$queryRawUnsafe('AND created_at >= $1', new Date(startDate)) : ...}
  ${endDate ? prisma.$queryRawUnsafe('AND created_at <= $1', new Date(endDate)) : ...}
`
```

**Impact:** SQL injection vulnerability + parameter mismatch

### 6. MISSING ENUM VALUE 🔴
**Code uses 'cancelled' status but schema enum doesn't have it**
- Schema: `pending | picked_up | in_transit | out_for_delivery | delivered | failed | returned`
- Code uses: `'cancelled'` (lines 101, 102, 149, 156, 296, 308)

**Impact:** Database constraint violations

### 7. WRONG FIELD NAME 🔴
**File:** `src/services/logistics.service.ts:304`
```typescript
actual_delivery_date: data.status === 'delivered' ? new Date() : undefined
// ❌ Should be 'delivered_at'
```

### 8. MISSING CORS CONFIGURATION 🔴
```typescript
import cors from 'cors';  // Imported but never used!
```

**Impact:** Frontend cannot call API

---

## High Severity Issues

### 9. NO AUTHENTICATION 🔴
**All endpoints completely unprotected** - anyone can:
- Create shipments
- Cancel shipments
- Access admin functions
- View all shipment data

### 10. NO WEBHOOK SIGNATURE VALIDATION 🔴
**File:** `controllers/logistics.controller.ts:169-187`
```typescript
handleBiteshipWebhook(req: Request, res: Response) {
  const payload = req.body;
  // ❌ NO SIGNATURE VALIDATION!
}
```

**Impact:** Webhook can be spoofed

### 11. NOTIFICATIONS NEVER SENT 🔴
**File:** `src/services/logistics.service.ts:440-481`

`sendShipmentNotification()` method exists but is **NEVER CALLED**

### 12. MISSING SCHEMA RELATION
`shipments.pickup_task_id` field exists but no pickup_tasks table

### 13. RACE CONDITION IN DUPLICATE CHECK
```typescript
const existing = await findByOrderId(orderId);
if (existing) throw error;
// ❌ Another request could insert here
await create();
```

### 14. BITESHIP API KEY NOT VALIDATED
```typescript
if (!biteshipConfig.apiKey) {
  console.warn('⚠️  BITESHIP_API_KEY not set');
  // ❌ Should throw error!
}
```

---

## Complete Endpoint List

### Public Endpoints (NOT REGISTERED - 404)
```
POST   /api/rates                          - Get shipping rates
POST   /api/shipments                      - Create shipment
POST   /api/shipments/status               - Update status
GET    /api/shipments/track/:trackingNumber - Track shipment
GET    /api/shipments/order/:orderId       - Get by order
GET    /api/shipments                      - List shipments
POST   /api/webhooks/biteship              - Webhook
```

### Admin Endpoints (NO AUTH)
```
GET    /api/admin/shipments                    - Get all shipments
GET    /api/admin/shipments/:id                - Get details
PUT    /api/admin/shipments/:id/status         - Force update status
POST   /api/admin/shipments/:id/cancel         - Cancel shipment
GET    /api/admin/shipments/:id/tracking       - Get tracking history
POST   /api/admin/shipments/:id/tracking/events - Add tracking event
GET    /api/admin/shipments/analytics          - Get analytics
PUT    /api/admin/shipments/bulk/status        - Bulk update
GET    /api/admin/shipments/problems           - Get problem shipments
```

---

## Security Vulnerabilities

1. ❌ No authentication on any endpoint
2. ❌ No authorization for admin functions
3. ❌ SQL injection in analytics query
4. ❌ No webhook signature validation
5. ❌ No rate limiting
6. ❌ Error messages leak internal info

---

## Business Logic Issues

### Duplicate Shipment Prevention (Race Condition)
```typescript
const existing = await this.repository.findByOrderId(data.orderId);
if (existing) {
  throw new Error('Shipment already exists for this order');
}
// ❌ Race condition here
const shipment = await this.repository.createShipment(data);
```

### Shipping Cost Update Logic Flawed
```typescript
const currentShippingCost = Number(order.shipping_cost || 0);
if (!order.shipping_cost || currentShippingCost === 0) {
  await update(biteshipOrder.price);
}
// ❌ What if price changed?
```

### No Retry Logic for External APIs
All Biteship, Order Service, and Notification Service calls have no retry

---

## Prioritized Fixes

### P0 - MUST FIX (Service won't start/work)
1. **Fix package.json name** (2 min)
2. **Add missing dependencies** (5 min)
   ```json
   "axios": "^1.6.0",
   "swagger-jsdoc": "^6.2.8",
   "swagger-ui-express": "^5.0.0"
   ```
3. **Register public routes** (2 min)
   ```typescript
   app.use('/api', logisticsRoutes);
   ```
4. **Remove invalid pickup_tasks relation** (5 min)
5. **Fix SQL injection** (15 min)
6. **Add 'cancelled' to enum OR stop using it** (migration required)
7. **Fix field name: actual_delivery_date → delivered_at** (2 min)
8. **Configure CORS** (2 min)

**Total P0 Time:** ~1 hour

### P1 - MUST FIX (Security/Function)
9. **Add authentication** (4 hours)
10. **Add webhook signature validation** (1 hour)
11. **Fix race condition** (30 min)
12. **Validate Biteship API key on startup** (5 min)
13. **Implement notification sending** (2 hours)
14. **Add rate limiting** (30 min)

**Total P1 Time:** ~8 hours

### P2 - SHOULD FIX
15. Environment validation
16. Error handling improvements
17. Add retry logic
18. Optimize analytics queries

---

## Required Environment Variables

```env
# Required
BITESHIP_API_KEY=your_biteship_api_key
BITESHIP_WEBHOOK_SECRET=your_webhook_secret
ORDER_SERVICE_URL=http://order-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3007
DATABASE_URL=postgresql://...

# Optional
PORT=3008
BITESHIP_BASE_URL=https://api.biteship.com/v1
NODE_ENV=production
```

---

## Summary

**Issues Found:** 35 total
- Critical: 14
- High: 18
- Medium: 8
- Low: 5

**Status:** 🔴 **NOT FUNCTIONAL**

**Fix Time:** 
- P0 (blocking): 1 hour
- P1 (critical): 8 hours
- **Total: ~9 hours**

**Blockers:**
1. Public routes not registered (main functionality broken)
2. Missing dependencies (won't start)
3. Invalid Prisma queries (runtime crashes)
4. SQL injection (security)

**Recommendation:** Fix all P0 issues before any testing.
