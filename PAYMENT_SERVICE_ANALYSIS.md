# Payment Service - Comprehensive Analysis Report

## Executive Summary
The payment-service is a TypeScript/Express-based payment processing system with Xendit integration, escrow management for group buying, and transaction ledger tracking. While the architecture is well-structured, there are several critical issues and incomplete implementations that require immediate attention.

---

## 1. PAYMENT CREATION FLOW

### Normal Payment Creation (Order-Based)
**File**: `services/payment-service/src/services/payment.service.ts:18-68`

**Flow**:
1. User initiates payment for an order
2. Service validates user exists
3. Creates Xendit Invoice with:
   - External ID: `order-${orderId}-${timestamp}`
   - Invoice duration: calculated from expiry or 24 hours default
   - Customer details from database
   - Success/failure redirect URLs
4. Creates payment record in database
5. Returns payment URL and invoice ID

**Issues Found**:
1. ✅ **invoiceDuration correctly handled as seconds** (previously marked as CRITICAL FIX)
2. ✅ Placeholder email generation for users without email
3. ⚠️ **No validation of amount > 0** in controller (validation is in route but not enforced)

### Escrow Payment Creation
**File**: `services/payment-service/src/services/payment.service.ts:140-204`

**Flow**:
1. Creates escrow payment without immediate order association
2. Phone number formatting for Xendit (adds +62 prefix if needed)
3. Stores `group_session_id` and `participant_id`
4. Sets `is_in_escrow: true`
5. Stores factory ID in metadata

**Issues Found**:
1. ✅ Phone number formatting is correct
2. ⚠️ **Metadata field is used but not all fields are properly validated**
3. ⚠️ No validation that `groupSessionId` exists in database

---

## 2. ESCROW MANAGEMENT

### Escrow Release Flow
**File**: `services/payment-service/src/services/payment.service.ts:206-238`

**Flow**:
1. Query all payments for a group session
2. Filter for `is_in_escrow && payment_status === 'paid'`
3. Wrap in Prisma transaction (GOOD)
4. Call `releaseEscrow()` on repository
5. Record escrow release in transaction ledger for each payment

**Code Quality**: Transaction wrapping is correct

**Issues Found**:
1. ✅ **Transaction wrapping is correct**
2. ⚠️ **Empty string fallback for null order_id** - Line 227
   - When escrow payment has no order yet, passing empty string
   - Could cause issues in ledger queries if order_id is used as FK
3. ✅ Ledger recording is comprehensive

### Refund Session Flow
**File**: `services/payment-service/src/services/refund.service.ts:117-152`

**Issues Found**:
1. ✅ Proper error handling with fallback results
2. ⚠️ **No atomic transaction** - If one refund fails, others continue
3. ⚠️ **No validation that session exists or is actually failed**

---

## 3. XENDIT INTEGRATION

### Webhook Verification
**File**: `services/payment-service/src/controllers/webhook.controller.ts:13-25`

**Implementation**: HMAC-SHA256 with timing-safe comparison

✅ **Webhook verification is secure and properly implemented**

### Webhook Deduplication
**File**: `services/payment-service/src/controllers/webhook.controller.ts:29-41`

**CRITICAL RACE CONDITION** - Between SELECT and INSERT:
```typescript
const existingEvent = await prisma.$queryRaw`
  SELECT * FROM webhook_events WHERE event_id = ${eventId}
`;

if (Array.isArray(existingEvent) && existingEvent.length > 0) {
  // Already exists
}

// RACE CONDITION HERE - Two concurrent requests could both pass the check

await prisma.$executeRaw`
  INSERT INTO webhook_events (...)
  VALUES (...)
`;
```

**Issues**:
1. 🔴 **CRITICAL RACE CONDITION** - SELECT + INSERT vulnerable to concurrent requests
   - Two concurrent webhooks could both find no existing event
   - Both INSERT, violating unique constraint on `event_id`
   - Should use database UPSERT (ON CONFLICT)

2. ⚠️ **Event marked as processed=false initially**
   - Only marked as processed=true after payment processing succeeds
   - If payment processing fails, event remains unprocessed
   - Allows re-processing of failed webhooks (could be intentional)

### Payment Status Callback
**File**: `services/payment-service/src/services/payment.service.ts:70-138`

**PAID Status Flow**:
```typescript
if (payment.payment_status === 'paid') {
  return { message: 'Payment already processed' };
}

// Mark as paid
await this.repository.markPaid(payment.id, gatewayFee, callbackData, isGroupBuying);

// Update order if exists
if (payment.order_id) {
  await prisma.orders.update({...});
  await this.transactionLedgerService.recordPaymentReceived(...);
}
```

**Issues Found**:
1. ✅ **Idempotency check** - Good practice
2. ⚠️ **isGroupBuying logic is unclear**
   - Payment might not have orders relation loaded
3. 🔴 **No transaction wrapping** - Multiple database operations without transaction
   - If order update fails after payment marked as paid, inconsistency occurs

---

## 4. REFUND PROCESSING - CRITICAL FINDINGS

### Admin Refund Approval - BROKEN
**File**: `services/payment-service/src/controllers/admin.controller.ts:221-269`

**CRITICAL BUG**:
```typescript
approveRefund = async (req: Request, res: Response) => {
  const updated = await prisma.refunds.update({
    where: { id },
    data: {
      refund_status: 'processing',
      approved_at: new Date(),
      admin_note: adminNote,
      updated_at: new Date()
    }
  });
  
  // TODO: Trigger actual refund processing with Xendit
  // For now, we just mark as processing
  
  res.json({
    success: true,
    message: 'Refund approved and processing',  // MISLEADING!
    data: updated
  });
};
```

**Issues**:
1. 🔴 **INCOMPLETE IMPLEMENTATION** - Xendit refund NOT called
2. 🔴 **Misleading response** - Says "processing" but refund is NOT submitted to Xendit
3. 🔴 **Customer never gets refunded** - Xendit refund never created

### Manual Refund Processing - BROKEN
**File**: `services/payment-service/src/controllers/admin.controller.ts:323-394`

**CRITICAL BUG**:
```typescript
processManualRefund = async (req: Request, res: Response) => {
  const refund = await this.refundRepo.create({...}, payment);
  
  // Auto-approve and process
  await this.refundRepo.markProcessing(refund.id);
  
  // Record in transaction ledger
  await this.ledgerRepo.recordRefund(...);
  
  res.json({
    success: true,
    message: 'Manual refund created and processing',  // MISLEADING!
    data: refund
  });
};
```

**Issues**:
1. 🔴 **INCOMPLETE IMPLEMENTATION** - Xendit refund API never called
2. 🔴 **No actual money returned to customer**
3. ✅ Ledger recording is done (but to false data)

### How Refunds Actually Get Processed
**File**: `services/payment-service/src/services/refund.service.ts:56-115`

Only the `RefundService.processRefund()` method actually calls Xendit:
- Called from `RefundService.createRefund()` via auto-processing for `group_failed_moq`
- NOT called by admin approval endpoint
- NOT called by manual refund creation endpoint

**Refunds That Work**:
✅ Group session refunds (auto-triggered)

**Refunds That DON'T Work**:
❌ Admin approval of pending refunds
❌ Admin-initiated manual refunds

---

## 5. TRANSACTION LEDGER

### Design
**File**: `services/payment-service/src/repositories/transaction-ledger.repository.ts`

**Good Features**:
✅ Unique transaction codes with prefix (PAY-, REF-, SET-, ESC-)
✅ Comprehensive metadata storage
✅ Proper indexes on factory_id, order_id, payment_id, transaction_type
✅ Transaction summaries and aggregations

### Issue with Escrow Release
When escrow released with null order_id:
```typescript
await this.transactionLedgerService.recordEscrowRelease(
  payment.id,
  payment.order_id ?? '',  // Empty string when null
  Number(payment.order_amount),
  groupSessionId
);
```

**Problems**:
- Breaks foreign key semantics
- Makes audit trail confusing
- Prevents proper order reconciliation

---

## 6. IDENTIFIED BUGS AND CONCERNS

### Critical Bugs (🔴)

1. **Webhook Race Condition** 
   - Location: `webhook.controller.ts:29-41`
   - SELECT + INSERT vulnerable to concurrent requests
   - **Impact**: Duplicate webhook processing, inconsistent payment states

2. **Incomplete Refund Implementation**
   - Location: `admin.controller.ts:257` (approveRefund)
   - Location: `admin.controller.ts:373` (processManualRefund)
   - **Impact**: Customers never refunded via admin panel, only database updated

3. **Missing Transaction Wrapping in Payment Callback**
   - Location: `payment.service.ts:70-138`
   - **Impact**: Order status and payment status could be inconsistent

### High Priority Issues (⚠️)

1. **Null Order ID in Escrow Ledger**
   - Empty string used instead of null
   - Semantic mismatch with database design

2. **No Validation of Group Session Existence**
   - Could create orphaned payments

3. **Phone Number Formatting Inconsistency**
   - Different logic in `createPayment` vs `createEscrowPayment`

4. **Unclear isGroupBuying Logic**
   - Payment might not have orders relation loaded
   - Condition evaluation unclear

### Medium Priority Issues

1. **Notification Failures Don't Cause Payment Failure** (Good)
   - But no retry mechanism

2. **Ledger Recording Separate from Payment Operations**
   - If ledger write fails, no rollback of payment

3. **Escrow Release in Admin Controller Not Wrapped in Transaction**
   - Multiple ledger updates without transaction

---

## 7. SECURITY ANALYSIS

### Good Practices
✅ HMAC-SHA256 webhook verification with timing-safe comparison
✅ UUID for all IDs
✅ Input validation in routes (express-validator)
✅ Parameterized queries (Prisma ORM prevents SQL injection)
✅ Graceful error handling in notifications

### Concerns
⚠️ Admin endpoints lack authentication/authorization checks
⚠️ No rate limiting on payment creation
⚠️ No audit logging of admin operations

---

## 8. RECOMMENDATIONS

### Critical (Fix Immediately)

1. **Fix webhook deduplication race condition**
   ```sql
   INSERT INTO webhook_events (event_id, ...) 
   VALUES (...)
   ON CONFLICT (event_id) DO NOTHING;
   ```

2. **Implement actual refund processing in admin endpoints**
   - Call `RefundService.processRefund()` instead of just updating status

3. **Wrap payment callback in transaction**
   ```typescript
   await prisma.$transaction(async (tx) => {
     await markPaid(...)
     if (order_id) await updateOrder(...)
     await recordLedger(...)
   });
   ```

### High Priority

1. **Add authentication/authorization to admin endpoints**
   - Verify user has admin role
   - Audit log all admin actions

2. **Validate group session existence**
   - Before creating escrow payments
   - Before releasing escrow

3. **Fix escrow release ledger recording**
   - Use null instead of empty string for order_id

---

## CONCLUSION

The payment service has a solid foundation but has critical gaps:

**Working Well**:
- ✅ Xendit integration
- ✅ Webhook verification
- ✅ Comprehensive transaction ledger
- ✅ Escrow management structure

**Critical Issues**:
- 🔴 Webhook race condition
- 🔴 Incomplete refund implementations in admin endpoints
- 🔴 Missing transaction atomicity in payment callbacks

**Status**: Partially functional but has gaps that could result in duplicate payment processing, lost refunds, and data inconsistencies.

