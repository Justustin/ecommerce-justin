# Code Review - New Services Bug Report

## 🐛 Bugs Found

### 1. **Logistics Service - Critical Bugs**

#### Bug #1: Wrong ORDER_SERVICE_URL Port
**Location:** `services/logistics-service/src/services/logistics.service.ts:15`
```typescript
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
```
**Issue:** Port 3002 is Product Service, not Order Service (should be 3005)
**Fix:**
```typescript
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';
```

#### Bug #2: Missing Return Statement
**Location:** `services/logistics-service/src/services/logistics.service.ts:390`
```typescript
async generateShippingLabel(shipmentId: string, format: 'pdf' | 'html' = 'pdf') {
    // ... builds labelData ...
}
// Function ends without returning anything!
```
**Issue:** Function creates `labelData` but never returns it or generates PDF/HTML
**Impact:** Calling this function returns `undefined`
**Fix:** Add return statement or PDF generation logic

#### Bug #3: Notification Service Endpoint Mismatch
**Location:** `services/logistics-service/src/services/logistics.service.ts:454`
```typescript
await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
```
**Issue:** Notification service endpoint is `/api/notifications` (not `/api/notifications/send`)
**Impact:** 404 errors when trying to send notifications
**Fix:**
```typescript
await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
    userId: userId,
    type: 'shipped', // or appropriate notification_type
    title: `Order ${status}`,
    message: description || `Your order is ${status}`,
    actionUrl: `/orders/${orderId}`,
    relatedId: orderId
});
```

#### Bug #4: Invalid Notification Payload
**Location:** `services/logistics-service/src/services/logistics.service.ts:454-466`
```typescript
await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
    recipientId: userId,  // ❌ Should be 'userId'
    type: status,         // ❌ status is not a valid notification_type
    data: { ... },        // ❌ notification service doesn't accept nested 'data'
    channels: ['whatsapp'] // ❌ notification service doesn't accept 'channels'
});
```
**Impact:** API will reject this payload with validation errors
**Fix:** Use correct payload structure matching notification service API

---

### 2. **Warehouse Service - Issues**

#### Issue #1: Missing Error Handling
**Location:** `services/warehouse-service/src/services/warehouse.service.ts:24-33`
```typescript
const inventory = await this.repository.findInventory(productId, variantId || null);
const currentStock = inventory?.available_quantity || 0;

if (currentStock >= quantity) {
    console.log("Sufficient stock in warehouse. No purchase order needed.");
    // ❌ No actual stock reservation or update
    return { message: "Demand fulfilled from existing stock." };
}
```
**Issue:** Claims demand is fulfilled but doesn't actually reserve/decrement inventory
**Impact:** Overselling - multiple orders can claim the same inventory
**Fix:** Add transaction to reserve inventory:
```typescript
if (currentStock >= quantity) {
    await prisma.$transaction(async (tx) => {
        await tx.warehouse_inventory.update({
            where: { id: inventory.id },
            data: { available_quantity: { decrement: quantity } }
        });
    });
    return { message: "Demand fulfilled from existing stock.", reserved: quantity };
}
```

#### Issue #2: Hardcoded Warehouse Postal Code
**Location:** `services/warehouse-service/src/services/warehouse.service.ts:8`
```typescript
const WAREHOUSE_POSTAL_CODE = '13910';
```
**Issue:** Should be configurable via environment variable
**Fix:**
```typescript
const WAREHOUSE_POSTAL_CODE = process.env.WAREHOUSE_POSTAL_CODE || '13910';
```

---

### 3. **Wallet Service - Critical Transaction Bug**

#### Bug #1: Race Condition in Withdrawal
**Location:** `services/wallet-service/src/services/wallet.service.ts:50-86`
```typescript
const wallet = await this.repository.findOrCreateWallet(data.userId, tx);

if (wallet.balance < data.amount) {
    throw new Error('Insufficient wallet balance.');
}
// ... later ...
const updatedWallet = await tx.user_wallets.update({
    where: { user_id: data.userId },
    data: {
        balance: { decrement: data.amount },
```
**Issue:** Time gap between check and update - concurrent withdrawals can overdraw
**Impact:** User can withdraw more than their balance with concurrent requests
**Fix:** Use pessimistic locking:
```typescript
const wallet = await tx.user_wallets.findUnique({
    where: { user_id: data.userId },
    // Add FOR UPDATE lock in raw query
});
// Or check balance during update:
const updatedWallet = await tx.user_wallets.updateMany({
    where: {
        user_id: data.userId,
        balance: { gte: data.amount } // Atomic check and update
    },
    data: { balance: { decrement: data.amount } }
});
if (updatedWallet.count === 0) {
    throw new Error('Insufficient balance');
}
```

---

### 4. **Notification Service - WhatsApp Integration Issues**

#### Issue #1: Unused Twilio Dependency
**Location:** `services/notification-service/src/channels/whatsapp.channel.ts:2`
```typescript
import twilio from 'twilio';
```
**Issue:** Uses Twilio for WhatsApp, but you already have a dedicated WhatsApp service (port 3012)
**Recommendation:** Either:
1. Remove Twilio and use your existing WhatsApp service
2. Or keep Twilio and remove WhatsApp service duplication

#### Issue #2: Missing Environment Variable Checks
**Location:** `services/notification-service/src/channels/whatsapp.channel.ts:5-8`
```typescript
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,  // ❌ Non-null assertion can crash if undefined
  process.env.TWILIO_AUTH_TOKEN!
);
```
**Issue:** Will crash on startup if env vars not set
**Fix:**
```typescript
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio credentials not configured - WhatsApp notifications disabled');
}
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
```

---

### 5. **Order Service - Changes Review**

#### No Critical Bugs Found
The changes appear to be minor updates, no new bugs introduced.

---

## 📋 Recommendations

### Immediate Actions (Fix These First)

1. ✅ **Fix logistics service port** - Change ORDER_SERVICE_URL to 3005
2. ✅ **Fix generateShippingLabel** - Add return statement or remove unused function
3. ✅ **Fix notification API calls** - Use correct endpoint and payload structure
4. ✅ **Fix wallet race condition** - Add atomic balance check
5. ✅ **Fix warehouse inventory** - Actually reserve stock

### Architecture Improvements

1. **Consolidate WhatsApp Services**
   - You have 2 WhatsApp implementations (Twilio + dedicated service)
   - Choose one and remove the other

2. **Environment Variable Management**
   - Create `.env.example` files for each service
   - Document all required env vars

3. **Add Retry Logic**
   - Logistics → Order service calls need retry with backoff
   - Warehouse → Logistics service calls need retry

4. **Missing Database Migrations**
   - Ensure warehouse_inventory, user_wallets, wallet_transactions tables exist
   - Check if wallet_withdrawals table is created

---

## 🧪 Testing Recommendations

### Must Test

1. **Logistics Service**
   - Create shipment with valid order
   - Update shipment status
   - Test Biteship webhook handling

2. **Wallet Service**
   - Concurrent withdrawal attack test (send 10 simultaneous withdrawals)
   - Verify balance never goes negative

3. **Warehouse Service**
   - Test with sufficient stock
   - Test with insufficient stock (PO creation)
   - Test concurrent demand for same product

4. **Notification Service**
   - Test creating notification via API
   - Test WhatsApp sending (if Twilio configured)

---

## 📊 Service Integration Status

| Service | Status | Issues | Priority |
|---------|--------|--------|----------|
| Logistics | ⚠️ Partially Working | 4 bugs | HIGH |
| Wallet | ⚠️ Has Race Condition | 1 critical bug | HIGH |
| Warehouse | ⚠️ Missing Logic | 2 issues | MEDIUM |
| Notification (Enhanced) | ✅ Working | Minor issues | LOW |

---

## 🚀 Next Steps

### Phase 1: Bug Fixes (Today)
1. Fix logistics service bugs (30 min)
2. Fix wallet race condition (20 min)
3. Fix warehouse inventory reservation (15 min)

### Phase 2: Testing (Tomorrow)
1. Write tests for wallet concurrent operations
2. Test logistics end-to-end flow
3. Test warehouse demand fulfillment

### Phase 3: Integration (Next)
1. Integrate warehouse with group buying service
2. Connect logistics to order status updates
3. Test full flow: Group Buy → Warehouse → Logistics → Delivery

---

## 💡 Nice-to-Have Features

1. **Logistics Service**
   - Add shipping label PDF generation (currently incomplete)
   - Add rate caching to avoid repeated API calls
   - Add webhook signature verification for Biteship

2. **Wallet Service**
   - Add wallet top-up via payment gateway
   - Add transaction history export
   - Add withdrawal batch processing

3. **Warehouse Service**
   - Add low stock alerts
   - Add purchase order approval workflow
   - Add inventory forecasting

---

## ⚠️ Security Concerns

1. **WhatsApp Auth Files in Git**
   - Files: `services/whatsapp-service/auth/*.json`
   - **ACTION REQUIRED:** Add to `.gitignore` immediately
   - These contain session keys and credentials

2. **Hardcoded Fees**
   - Withdrawal fee hardcoded to 2500
   - Should be configurable or stored in database

3. **Missing Input Validation**
   - Warehouse service accepts any quantity without limits
   - Wallet service should have withdrawal limits

---

## Summary

**Total Issues Found:** 11
- 🔴 Critical: 3 (wallet race condition, logistics port, missing return)
- 🟡 Major: 5 (notification API, inventory reservation, env vars)
- 🟢 Minor: 3 (hardcoded values, documentation)

**Estimated Fix Time:** 1-2 hours for all critical and major issues

**Code Quality:** Good structure, needs bug fixes and testing
