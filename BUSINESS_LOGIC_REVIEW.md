# Business Logic Review - Microservices
**Date:** 2025-10-25
**Focus:** Backend microservices business flows and logic
**Services Reviewed:** Group Buying, Payment, Order, Refund

---

## Executive Summary

This review focuses specifically on the **backend microservices business logic** and **flow correctness**. The architecture is well-designed with proper separation of concerns. However, there are several critical issues in the business flows that need attention.

### Flow Assessment
- **Group Buying Flow:** 🟡 GOOD with critical race condition
- **Payment/Escrow Flow:** 🟢 EXCELLENT - Well implemented
- **Order Creation Flow:** 🟡 GOOD - Minor issues
- **Refund Flow:** 🟢 GOOD - Proper handling
- **Service Communication:** 🟠 NEEDS IMPROVEMENT - Missing error handling

---

## 1. Group Buying Business Flow Analysis

### Flow Overview
```
1. Factory creates group session (MOQ, price, deadline)
2. Users join session → Creates participant record
3. For each join → Creates escrow payment (via payment-service)
4. Session expires OR MOQ reached
5. If MOQ reached → Create orders (via order-service) → Release escrow
6. If MOQ failed → Refund all participants
```

### ✅ What's Working Well

1. **Escrow Integration** (`group.buying.service.ts:100-134`)
   - Correctly creates escrow payments when users join
   - Properly rolls back participant if payment fails
   - Links participant to payment record

2. **MOQ Tracking** (`group.buying.service.ts:285-326`)
   - Checks MOQ after each join
   - Auto-updates session status when MOQ reached
   - Proper participant counting

3. **Session State Machine**
   - Good status transitions: `forming → active → moq_reached → success`
   - Prevents invalid state changes

4. **Expired Session Processing** (`group.buying.service.ts:328-431`)
   - Handles both successful and failed sessions
   - Creates orders for successful sessions
   - Triggers refunds for failed sessions

### 🔴 Critical Issues

#### **CRITICAL #1: Race Condition in Join Session**
**Location:** `group.buying.service.ts:87-100`

**Issue:**
```typescript
const hasJoined = await this.repository.hasUserJoined(session.id, data.userId);
if(hasJoined){
    throw new Error('User has already joined this session')
}
// ❌ GAP: Multiple concurrent requests can pass this check
const participant = await this.repository.joinSession(data);
```

**Impact:**
- User can join the same session multiple times by sending concurrent requests
- Results in multiple participant records + multiple payment charges
- MOQ counts become incorrect
- Duplicate charges to user's payment method

**Proof of Concept:**
```javascript
// User sends 3 simultaneous requests
Promise.all([
  joinSession({userId: 'user1', sessionId: 'session1'}),
  joinSession({userId: 'user1', sessionId: 'session1'}),
  joinSession({userId: 'user1', sessionId: 'session1'})
])
// All 3 pass the hasJoined check before any inserts complete
// User ends up with 3 participant records and 3 payments
```

**Recommended Fix:**
```typescript
// OPTION 1: Add unique constraint in database (BEST)
// In schema.prisma:
model group_participants {
  // ... existing fields
  @@unique([group_session_id, user_id], name: "unique_participant_per_session")
}

// In service:
try {
  const participant = await this.repository.joinSession(data);
  // Database constraint prevents duplicates
} catch (error) {
  if (error.code === 'P2002') {  // Prisma unique constraint violation
    throw new Error('User has already joined this session');
  }
  throw error;
}

// OPTION 2: Use transaction with locking (if constraint not possible)
return await prisma.$transaction(async (tx) => {
  // Lock the session row to prevent concurrent modifications
  const session = await tx.group_buying_sessions.findUnique({
    where: { id: data.groupSessionId }
  });

  const hasJoined = await tx.group_participants.count({
    where: {
      group_session_id: data.groupSessionId,
      user_id: data.userId
    }
  });

  if (hasJoined > 0) {
    throw new Error('User has already joined this session');
  }

  return await tx.group_participants.create({...});
});
```

**Severity:** 🔴 CRITICAL - Can lead to duplicate charges

---

#### **CRITICAL #2: Payment Rollback Failure Not Logged**
**Location:** `group.buying.service.ts:120-124`

**Issue:**
```typescript
} catch (error: any) {
    // Rollback participant if payment fails
    await this.repository.leaveSession(data.groupSessionId, data.userId);
    throw new Error(`Payment failed: ${error.response?.data?.message || error.message}`);
}
```

**Problems:**
1. If `leaveSession` fails, no error is caught or logged
2. Could result in participant record without payment
3. MOQ counts become inaccurate
4. No alerting when rollback fails

**Fix:**
```typescript
} catch (error: any) {
  try {
    await this.repository.leaveSession(data.groupSessionId, data.userId);
  } catch (rollbackError) {
    // Log critical error - requires manual intervention
    logger.error('CRITICAL: Failed to rollback participant after payment failure', {
      groupSessionId: data.groupSessionId,
      userId: data.userId,
      participantId: participant?.id,
      originalError: error,
      rollbackError
    });

    // Send alert to operations team
    await alertingService.sendCriticalAlert({
      title: 'Payment Rollback Failed',
      sessionId: data.groupSessionId,
      userId: data.userId
    });

    // Still throw original error to user
  }
  throw new Error(`Payment failed: ${error.response?.data?.message || error.message}`);
}
```

---

### 🟠 Major Issues

#### **MAJOR #1: No Retry Logic for Service Calls**
**Locations:**
- `group.buying.service.ts:115-117` (payment service)
- `group.buying.service.ts:354-368` (order service)
- `group.buying.service.ts:240-244` (escrow release)

**Issue:** Network failures or temporary service unavailability causes permanent failures

**Fix:** Implement retry with exponential backoff
```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// Usage:
const response = await retryWithBackoff(() =>
  axios.post(`${paymentServiceUrl}/api/payments/escrow`, paymentData, {...})
);
```

---

#### **MAJOR #2: Inconsistent Participant Validation**
**Location:** `group.buying.service.ts:95-98`

**Issue:**
```typescript
const calculatedTotal = data.quantity * data.unitPrice
if(data.totalPrice !== calculatedTotal) {
    throw new Error(`Total price must be ${calculatedTotal} for quantity ${data.quantity}`)
}
```

**Problem:** Doesn't validate that `unitPrice` matches the actual group session price

**Fix:**
```typescript
// Validate unit price matches session group price
if (data.unitPrice !== session.group_price) {
    throw new Error(
        `Invalid unit price. Expected ${session.group_price}, got ${data.unitPrice}`
    );
}

const calculatedTotal = data.quantity * session.group_price;
if(data.totalPrice !== calculatedTotal) {
    throw new Error(
        `Total price must be ${calculatedTotal} for quantity ${data.quantity}`
    );
}
```

---

#### **MAJOR #3: Missing Idempotency for Expired Session Processing**
**Location:** `group.buying.service.ts:328-431`

**Issue:** If `processExpiredSessions()` is called multiple times (e.g., cron job retries), it could process the same session twice.

**Current Protection:**
```typescript
where: {
    status: {
        in: ['forming', 'active', 'moq_reached'] // Only get unprocessed sessions
    }
}
```

**Problem:** Status is updated AFTER order creation. If process crashes between creating orders and updating status, orders could be created twice on retry.

**Better Fix:**
```typescript
// Use atomic status update BEFORE processing
for (const session of expiredSessions) {
  // Atomically claim this session for processing
  const updatedSession = await prisma.group_buying_sessions.updateMany({
    where: {
      id: session.id,
      status: { in: ['forming', 'active', 'moq_reached'] }
    },
    data: {
      status: 'processing', // New intermediate status
      updated_at: new Date()
    }
  });

  // If updatedSession.count === 0, another process already claimed it
  if (updatedSession.count === 0) {
    console.log(`Session ${session.id} already being processed, skipping`);
    continue;
  }

  // Now safe to process...
  try {
    // Create orders, etc.
    await this.repository.updateStatus(session.id, 'success');
  } catch (error) {
    // Rollback to previous status on failure
    await this.repository.updateStatus(session.id, session.status);
    throw error;
  }
}
```

---

## 2. Payment & Escrow Flow Analysis

### Flow Overview
```
REGULAR ORDER:
1. User creates order → order-service
2. order-service calls payment-service → creates Xendit invoice
3. User pays → Xendit webhook → mark payment as 'paid'
4. Update order status to 'paid'

GROUP BUYING (ESCROW):
1. User joins session → group-buying-service
2. group-buying-service calls payment-service/escrow → creates escrow payment
3. User pays → Xendit webhook → mark payment as 'paid' (but in escrow)
4. Session succeeds → group-buying-service calls release-escrow
5. payment-service releases funds → records in ledger
```

### ✅ What's Working Excellently

1. **Webhook Idempotency** (`webhook.controller.ts:29-36`)
   ```typescript
   const existingEvent = await prisma.$queryRaw`
     SELECT * FROM webhook_events WHERE event_id = ${eventId}
   `;

   if (Array.isArray(existingEvent) && existingEvent.length > 0) {
     return res.json({ received: true, message: 'Already processed' });
   }
   ```
   - ✅ Prevents duplicate processing of webhooks
   - ✅ Uses event_id for deduplication

2. **Webhook Security** (`webhook.controller.ts:19-24`)
   ```typescript
   if (!CryptoUtils.verifyXenditCallback(callbackToken, receivedToken)) {
     return res.status(403).json({ error: 'Invalid callback token' });
   }
   ```
   - ✅ Validates webhook authenticity
   - ✅ Prevents spoofed payment confirmations

3. **Escrow Logic** (`payment.service.ts:191-220`)
   - ✅ Properly tracks `is_in_escrow` flag
   - ✅ Only releases when session succeeds
   - ✅ Records transactions in ledger

4. **Transaction Ledger** (`payment.service.ts:107-124`)
   - ✅ Comprehensive financial tracking
   - ✅ Records all money movements
   - ✅ Includes gateway fees

### 🔴 Critical Issue

#### **CRITICAL #3: Missing Transaction for Escrow Release**
**Location:** `payment.service.ts:203-214`

**Issue:**
```typescript
// Release escrow in database
await this.repository.releaseEscrow(paymentIds);

// Record transaction for each released payment
for (const payment of eligiblePayments) {
  await this.transactionLedgerService.recordEscrowRelease(...);
}
```

**Problem:**
- Two separate database operations without transaction wrapper
- If `recordEscrowRelease` fails, escrow is released but not logged
- Creates financial record inconsistency
- Impossible to reconcile payments

**Fix:**
```typescript
return await prisma.$transaction(async (tx) => {
  // Release escrow in database
  await this.repository.releaseEscrow(paymentIds, tx);

  // Record transaction for each released payment
  for (const payment of eligiblePayments) {
    await this.transactionLedgerService.recordEscrowRelease(
      payment.id,
      payment.order_id ?? '',
      Number(payment.order_amount),
      groupSessionId,
      tx  // Pass transaction context
    );
  }

  return {
    message: 'Escrow released',
    paymentsReleased: paymentIds.length
  };
});
```

---

### 🟠 Major Issue

#### **MAJOR #4: Webhook Processing Not Fully Atomic**
**Location:** `webhook.controller.ts:43-50`

**Issue:**
```typescript
if (callbackData.status === 'PAID') {
  await this.paymentService.handlePaidCallback(callbackData);

  await prisma.$executeRaw`
    UPDATE webhook_events
    SET processed = true, processed_at = NOW()
    WHERE event_id = ${eventId}
  `;
}
```

**Problem:** If `handlePaidCallback` succeeds but updating webhook_events fails, webhook could be reprocessed on next call.

**Fix:** Wrap in transaction
```typescript
if (callbackData.status === 'PAID') {
  await prisma.$transaction(async (tx) => {
    await this.paymentService.handlePaidCallback(callbackData, tx);

    await tx.$executeRaw`
      UPDATE webhook_events
      SET processed = true, processed_at = NOW()
      WHERE event_id = ${eventId}
    `;
  });
}
```

---

## 3. Order Creation Flow Analysis

### Flow Overview
```
REGULAR ORDER:
1. User submits cart → order-service
2. Validate items and address
3. Get product prices and factory IDs
4. Group items by factory
5. Create separate order per factory
6. Create payment for each order
7. Return payment URLs

GROUP BUYING ORDER:
1. Session expires with MOQ reached
2. group-buying-service calls order-service/bulk
3. Creates orders for all participants
4. Links orders to participant records
```

### ✅ What's Working Well

1. **Factory Grouping** (`order.service.ts:55-71`)
   - ✅ Automatically splits orders by factory
   - ✅ Generates linked order numbers
   - ✅ Proper order separation

2. **Product Snapshot** (`order.service.ts:38`)
   - ✅ Captures product details at order time
   - ✅ Prevents issues if product changes later

3. **Bulk Order Creation** (`order.service.ts:125-137`)
   - ✅ Handles multiple participants efficiently
   - ✅ Links to group session

### 🟠 Major Issues

#### **MAJOR #5: Order-Payment Creation Not Atomic**
**Location:** `order.service.ts:67-112`

**Issue:**
```typescript
// Create separate orders per factory
const orders = await this.repository.createOrder(
  data,
  orderNumber,
  factoryGroups
);

// Then create payments (separate operation)
const payments = await Promise.all(
  orders.map(async (order: any) => {
    const response = await axios.post(`${paymentServiceUrl}/api/payments`, ...);
    return response.data;
  })
);
```

**Problem:**
- Orders created before payments
- If payment creation fails, orphaned orders exist
- Users see "Order Created" but have no way to pay

**Better Approach:**
```typescript
// OPTION 1: Don't create orders until payment URLs are ready
const paymentPromises = Array.from(factoryGroups.entries()).map(async ([factoryId, items]) => {
  // Get price first
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  // Create payment intent (without order ID yet)
  const payment = await axios.post(`${paymentServiceUrl}/api/payments/intent`, {
    userId: data.userId,
    amount: totalAmount,
    factoryId
  });

  return { factoryId, items, payment };
});

const paymentIntents = await Promise.all(paymentPromises);

// Now create orders with payment IDs in a transaction
const orders = await this.repository.createOrdersWithPayments(
  data,
  orderNumber,
  paymentIntents
);

// OPTION 2: Create orders in "pending_payment_creation" status
// Then update to "pending_payment" after payment URLs are generated
```

---

#### **MAJOR #6: No Rollback on Partial Failure**
**Location:** `order.service.ts:75-112`

**Issue:** If payment creation fails for one factory's order (out of multiple), the other orders remain in DB.

**Example:**
```
User orders from Factory A, B, C
✅ Order A created → Payment created
✅ Order B created → Payment created
❌ Order C created → Payment FAILED (network error)

Result: Orders A & B exist but user never received Order C payment link
User sees incomplete checkout
```

**Fix:**
```typescript
// Collect all operations first
const orderOperations = [];

for (const [factoryId, items] of factoryGroups.entries()) {
  orderOperations.push({factoryId, items});
}

// Execute all in transaction
return await prisma.$transaction(async (tx) => {
  const results = [];

  for (const op of orderOperations) {
    const order = await createOrderInTx(tx, op);
    const payment = await createPaymentForOrder(order);
    results.push({ order, payment });
  }

  return results;
});
```

---

## 4. Refund Flow Analysis

### ✅ What's Working Well

1. **Auto-Processing for Group Failures** (`refund.service.ts:43-49`)
   ```typescript
   if (data.reason === 'group_failed_moq') {
     setTimeout(() => {
       this.processRefund(refund.id).catch(err =>
         console.error(`Failed to auto-process refund ${refund.id}:`, err)
       );
     }, 100);
   }
   ```
   - ✅ Automatically processes refunds for failed group sessions
   - ✅ Asynchronous to avoid blocking

2. **Refund State Machine** (`refund.service.ts:61-63`)
   - ✅ Validates status transitions
   - ✅ Prevents reprocessing completed refunds

3. **Comprehensive Tracking** (`refund.service.ts:89-101`)
   - ✅ Records in transaction ledger
   - ✅ Updates payment and order status
   - ✅ Sends notifications

### 🟡 Minor Issues

#### **MINOR #1: setTimeout for Critical Operation**
**Location:** `refund.service.ts:44-48`

**Issue:**
```typescript
setTimeout(() => {
  this.processRefund(refund.id).catch(err =>
    console.error(`Failed to auto-process refund ${refund.id}:`, err)
  );
}, 100);
```

**Problem:**
- If server crashes before timeout executes, refund is lost
- No retry mechanism
- Only logs errors to console

**Better Approach:**
```typescript
// OPTION 1: Use job queue (recommended for production)
await jobQueue.add('process-refund', {
  refundId: refund.id,
  reason: data.reason
}, {
  attempts: 3,
  backoff: 'exponential'
});

// OPTION 2: Process immediately but async
this.processRefund(refund.id).catch(async (err) => {
  logger.error(`Failed to auto-process refund ${refund.id}:`, err);

  // Store failure for manual review
  await prisma.failed_refunds.create({
    data: {
      refund_id: refund.id,
      error: err.message,
      retry_count: 0
    }
  });
});
```

---

## 5. Service-to-Service Communication

### Current Pattern
```typescript
// Example from group-buying-service
const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

const response = await axios.post(`${paymentServiceUrl}/api/payments/escrow`, paymentData, {
  headers: { 'Content-Type': 'application/json' }
});
```

### 🟠 Issues

1. **No Authentication Between Services**
   - Services trust any request
   - No API key or JWT validation
   - Vulnerable to internal network attacks

2. **No Circuit Breaker**
   - If payment service is down, requests pile up
   - No automatic fallback or degradation

3. **No Request Timeout**
   - Axios requests can hang indefinitely
   - Can cause cascading failures

4. **No Distributed Tracing**
   - Can't track requests across services
   - Difficult to debug issues

### Recommendations

```typescript
// 1. Add service-to-service authentication
const response = await axios.post(
  `${paymentServiceUrl}/api/payments/escrow`,
  paymentData,
  {
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': process.env.SERVICE_API_KEY,
      'X-Request-ID': requestId  // For tracing
    },
    timeout: 10000  // 10 second timeout
  }
);

// 2. Implement circuit breaker pattern
import CircuitBreaker from 'opossum';

const options = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const breaker = new CircuitBreaker(callPaymentService, options);

breaker.fallback(() => ({
  success: false,
  error: 'Payment service unavailable'
}));

// 3. Add retry logic with backoff
const axiosRetry = require('axios-retry');
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error)
      || error.response?.status === 503;
  }
});
```

---

## 6. Database Schema Observations

### ✅ Good Design Choices

1. **Proper Indexing**
   - Session code indexed for quick lookups
   - User ID + Session ID for participant queries
   - Status fields indexed for filtering

2. **Soft Deletes for Participants**
   - Can only delete participants without orders
   - Preserves history

3. **Timestamp Tracking**
   - `moq_reached_at`, `production_started_at`, etc.
   - Enables analytics and auditing

### 🟡 Potential Issues

1. **Missing Unique Constraint**
   ```prisma
   model group_participants {
     // MISSING:
     // @@unique([group_session_id, user_id])
   }
   ```
   Enables the race condition described in Critical #1

2. **No Enum for Refund Reasons**
   - Currently free text
   - Hard to analyze refund patterns
   - Consider: `enum refund_reason { group_failed_moq, user_cancelled, out_of_stock, other }`

---

## 7. Summary of Business Logic Issues

### Critical (Fix Immediately)
1. ✅ Race condition in group session join → Add unique constraint
2. ✅ Payment rollback failures not logged → Add error logging & alerting
3. ✅ Escrow release not atomic → Wrap in transaction

### Major (Fix This Sprint)
1. ✅ No retry logic for service calls → Implement exponential backoff
2. ✅ Unit price not validated against session price → Add validation
3. ✅ Expired session processing not idempotent → Add atomic status claim
4. ✅ Webhook processing not atomic → Wrap in transaction
5. ✅ Order-payment creation not atomic → Redesign flow
6. ✅ No rollback on partial order failure → Add transaction

### Minor (Address Soon)
1. setTimeout for refunds → Use job queue
2. No service authentication → Add API keys
3. No circuit breaker → Add resilience patterns
4. No request timeouts → Set reasonable limits

---

## 8. Recommended Architecture Improvements

### 1. Event-Driven Architecture (Long Term)
Consider moving to event-based communication:
```
group-buying-service publishes: "SessionMOQReached"
↓
order-service subscribes: Creates orders
payment-service subscribes: Releases escrow
notification-service subscribes: Notifies users
```

**Benefits:**
- Loose coupling
- Automatic retry via event replay
- Better observability
- Easier to add new features

### 2. Add Background Job Processing
```typescript
// For operations that should be async and retriable:
- Refund processing
- Session expiration checking
- Order creation from sessions
- Email/notification sending
```

**Recommended: BullMQ or similar**
```typescript
import { Queue, Worker } from 'bullmq';

const refundQueue = new Queue('refunds');

// Producer
await refundQueue.add('process-refund', {
  refundId: refund.id
}, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 }
});

// Consumer
const worker = new Worker('refunds', async job => {
  await refundService.processRefund(job.data.refundId);
});
```

### 3. Add API Gateway Layer
- Central authentication/authorization
- Rate limiting
- Request/response logging
- Circuit breaker implementation
- Service discovery

---

## 9. Testing Recommendations

### Critical Test Cases

1. **Group Buying Race Conditions**
   ```typescript
   it('should prevent duplicate joins via concurrent requests', async () => {
     const promises = Array(10).fill(null).map(() =>
       joinSession({userId: 'user1', sessionId: 'session1'})
     );

     await expect(Promise.all(promises)).rejects.toThrow();

     const participantCount = await getParticipantCount('session1');
     expect(participantCount).toBe(1);
   });
   ```

2. **Payment Rollback Scenarios**
   ```typescript
   it('should rollback participant if payment fails', async () => {
     // Mock payment service to fail
     mockAxios.post.mockRejectedValue(new Error('Payment failed'));

     await expect(
       joinSession({userId: 'user1', sessionId: 'session1'})
     ).rejects.toThrow('Payment failed');

     const participant = await findParticipant('session1', 'user1');
     expect(participant).toBeNull();
   });
   ```

3. **Webhook Idempotency**
   ```typescript
   it('should not process duplicate webhook events', async () => {
     const webhook = { id: 'evt_123', status: 'PAID' };

     await processWebhook(webhook);
     await processWebhook(webhook);  // Send again

     const payment = await getPayment('evt_123');
     expect(payment.amount_charged_count).toBe(1);  // Not 2
   });
   ```

4. **Transaction Atomicity**
   ```typescript
   it('should rollback escrow release if ledger recording fails', async () => {
     // Mock ledger service to fail
     mockLedgerService.recordEscrowRelease.mockRejectedValue(
       new Error('Ledger unavailable')
     );

     await expect(
       releaseEscrow('session1')
     ).rejects.toThrow();

     const payments = await getPayments('session1');
     expect(payments.every(p => p.is_in_escrow)).toBe(true);
   });
   ```

---

## 10. Flow Diagrams

### Group Buying Happy Path
```
User                Group Buying Service      Payment Service       Order Service
  |                          |                        |                    |
  |--- Join Session -------->|                        |                    |
  |                          |--- Create Escrow ----->|                    |
  |                          |                        |---> Xendit         |
  |                          |<--- Payment URL -------|                    |
  |<--- Payment URL ---------|                        |                    |
  |                          |                        |                    |
  |--- Pay via Xendit -------|                        |                    |
  |                          |                        |<--- Webhook        |
  |                          |                        |--- Mark Paid       |
  |                          |                        |--- Hold in Escrow  |
  |                          |                        |                    |
  [Time passes, Session expires with MOQ reached]     |                    |
  |                          |                        |                    |
  |                          |--- Create Orders ------------------->|      |
  |                          |                        |             |      |
  |                          |--- Release Escrow ---->|             |      |
  |                          |                        |--- Update   |      |
  |                          |                        |    Ledger   |      |
  |                          |                        |             |      |
  |<--- Notification --------|                        |             |      |
```

### Group Buying Failure Path
```
User                Group Buying Service      Payment Service
  |                          |                        |
  |--- Join Session -------->|                        |
  |                          |--- Create Escrow ----->|
  |<--- Payment URL ---------|                        |
  |--- Pay ----------------------------------------->|
  |                          |<--- Webhook (Paid) ----|
  |                          |                        |
  [Time passes, Session expires WITHOUT reaching MOQ] |
  |                          |                        |
  |                          |--- Refund Session ---->|
  |                          |                        |--- Create Refund
  |                          |                        |--- Process Refund
  |                          |                        |--- Update Ledger
  |<--- Refund Notification -|<--- Refund Status -----|
```

---

## Conclusion

Your microservices business logic is **generally well-designed** with good separation of concerns and proper use of escrow patterns. The main areas requiring attention are:

1. **Race Conditions** - Add database constraints to prevent duplicate operations
2. **Atomicity** - Wrap related operations in database transactions
3. **Service Resilience** - Add retry logic, timeouts, and circuit breakers
4. **Error Handling** - Better logging and alerting for rollback failures

**Estimated Effort:**
- Critical fixes: 8-12 hours
- Major fixes: 16-24 hours
- Testing: 16-20 hours
- **Total: 40-56 hours (1-1.5 weeks)**

The architecture is solid and the flows are correct. With these fixes, you'll have a production-ready system.

---

**Questions to Consider:**
1. What's your plan for handling background jobs (session expiration, refunds)?
2. Are you planning to add service-to-service authentication?
3. Do you have monitoring/alerting infrastructure for failed payments/refunds?
4. What's your strategy for handling partial failures in multi-factory orders?
