# Payment Service - Test Plan

**Service:** Payment Service (Xendit Integration)
**Port:** 3006
**Swagger URL:** http://localhost:3006/api-docs
**Created:** 2025-11-10

---

## Purpose

This test plan verifies all critical bug fixes in the Payment Service:
- ✅ Fixed webhook HMAC-SHA256 verification (was simple string comparison)
- ✅ Fixed Xendit invoice duration type (was string, now number)
- ✅ Implemented real Xendit refund API calls (was mock)
- ✅ Fixed service name in console output
- ✅ Escrow payment integration with Group Buying Service
- ✅ Transaction ledger for financial audit trail

---

## Prerequisites

### 1. Services Running
```bash
# Start Payment Service
cd services/payment-service && npm run dev

# Start Group Buying Service (for integration tests)
cd services/group-buying-service && npm run dev
```

### 2. Environment Variables
Create `.env` in `services/payment-service/`:
```bash
# Required
PORT=3006
DATABASE_URL=postgresql://...
XENDIT_SECRET_KEY=your-xendit-secret-key
XENDIT_WEBHOOK_SECRET=your-xendit-webhook-verification-token

# Optional
PAYMENT_SUCCESS_URL=http://localhost:3000/payment/success
PAYMENT_FAILURE_URL=http://localhost:3000/payment/failure
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

### 3. Get Test Data
```sql
-- Get a user UUID
SELECT id, first_name, email FROM users LIMIT 1;

-- Get an order UUID (create one via Order Service if needed)
SELECT id, order_number FROM orders LIMIT 1;

-- Get a group buying session UUID (for escrow tests)
SELECT id, session_code FROM group_buying_sessions WHERE status = 'forming' LIMIT 1;
```

### 4. Xendit Test Credentials
- Sign up for Xendit test account: https://dashboard.xendit.co/register
- Get API keys from dashboard (use TEST mode)
- Set up webhook URL in Xendit dashboard: `http://your-domain/api/webhooks/xendit`

---

## Test Execution Instructions

- Run tests **in sequential order**
- Record results for each test (PASS/FAIL)
- Save IDs from responses for later tests
- For webhook tests, use Xendit's webhook simulator in dashboard

---

## Test Cases

## SECTION 1: Service Health & Configuration

### Test 1: Health Check
**Purpose:** Verify service is running with correct name

**Endpoint:** `GET /health`

**Expected Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "docs": "/api-docs"
}
```

**What This Tests:**
- ✅ Service starts successfully
- ✅ Service name is correct (not "product-service")
- ✅ Health endpoint responds

**Result:** [ ] PASS [ ] FAIL

---

### Test 2: Swagger Documentation
**Purpose:** Verify API documentation is accessible

**Endpoint:** `GET /api-docs`

**Expected:** Swagger UI loads with all endpoints documented

**What This Tests:**
- ✅ Swagger UI configured correctly
- ✅ All 20 endpoints visible

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 2: Payment Creation (Invoice Duration Fix)

### Test 3: Create Regular Payment - Invoice Duration Fix
**Purpose:** Test invoice duration is sent as number (not string)

**Endpoint:** `POST /api/payments/create`

**Request Body:**
```json
{
  "userId": "YOUR_USER_UUID",
  "orderId": "YOUR_ORDER_UUID",
  "amount": 100000,
  "paymentMethod": "bank_transfer",
  "expiresAt": "2025-11-11T23:59:59Z"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "user_id": "user-uuid",
      "order_id": "order-uuid",
      "payment_status": "pending",
      "order_amount": "100000",
      "total_amount": "100000",
      "payment_url": "https://checkout.xendit.co/...",
      "gateway_transaction_id": "xendit-invoice-id",
      "expires_at": "2025-11-11T23:59:59.000Z"
    },
    "paymentUrl": "https://checkout.xendit.co/...",
    "invoiceId": "xendit-invoice-id"
  }
}
```

**What This Tests:**
- ✅ Xendit API accepts the request (invoiceDuration as number)
- ✅ Payment record created in database
- ✅ Invoice URL returned
- ✅ No type errors

**CRITICAL:** If you get Xendit error "invoiceDuration must be a number", the fix failed!

**Save:** `payment.id` and `paymentUrl` for later tests

**Result:** [ ] PASS [ ] FAIL

**If Failed:**
```
Error message:
```

---

### Test 4: Create Escrow Payment (Group Buying Integration)
**Purpose:** Test escrow payment for group buying

**Endpoint:** `POST /api/payments/escrow`

**Request Body:**
```json
{
  "userId": "YOUR_USER_UUID",
  "groupSessionId": "YOUR_SESSION_UUID",
  "participantId": "uuid-will-be-created",
  "amount": 500000,
  "expiresAt": "2025-11-11T23:59:59Z",
  "isEscrow": true,
  "factoryId": "YOUR_FACTORY_UUID"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "user_id": "user-uuid",
      "group_session_id": "session-uuid",
      "participant_id": "participant-uuid",
      "payment_status": "pending",
      "is_in_escrow": true,
      "order_amount": "500000",
      "payment_url": "https://checkout.xendit.co/..."
    },
    "paymentUrl": "https://checkout.xendit.co/...",
    "invoiceId": "xendit-invoice-id"
  }
}
```

**What This Tests:**
- ✅ Escrow flag set correctly
- ✅ Group session linked
- ✅ Invoice duration as number (not string)
- ✅ No order_id (escrow payment)

**Save:** `payment.id` and `gateway_transaction_id` for webhook tests

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 3: Webhook Verification (HMAC Security Fix)

### Test 5: Webhook with Invalid Signature
**Purpose:** Test HMAC verification rejects invalid signatures

**Endpoint:** `POST /api/webhooks/xendit`

**Headers:**
```
Content-Type: application/json
x-callback-token: invalid-signature-12345
```

**Request Body:**
```json
{
  "id": "test-transaction-id",
  "external_id": "order-123-456",
  "status": "PAID",
  "amount": 100000
}
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "Invalid webhook signature"
}
```

**What This Tests:**
- ✅ HMAC verification working (not simple string comparison)
- ✅ Invalid signatures rejected
- ✅ Security vulnerability fixed

**CRITICAL:** If webhook processes with invalid signature, the security fix failed!

**Result:** [ ] PASS [ ] FAIL

---

### Test 6: Webhook with Valid HMAC Signature
**Purpose:** Test webhook processes with valid signature

**How to Test:**
1. Use Xendit Dashboard > Webhooks > Send Test Webhook
2. Or calculate HMAC manually:
   ```javascript
   const crypto = require('crypto');
   const payload = JSON.stringify(webhookData);
   const signature = crypto
     .createHmac('sha256', process.env.XENDIT_WEBHOOK_SECRET)
     .update(payload)
     .digest('hex');
   ```

**Endpoint:** `POST /api/webhooks/xendit`

**Headers:**
```
Content-Type: application/json
x-callback-token: <calculated-hmac-signature>
```

**Request Body:**
```json
{
  "id": "GATEWAY_TRANSACTION_ID_FROM_TEST_3",
  "external_id": "order-uuid-123",
  "status": "PAID",
  "amount": 100000,
  "fees_paid_amount": 2500,
  "paid_at": "2025-11-10T10:30:00Z"
}
```

**Expected Response:** `200 OK`
```json
{
  "received": true
}
```

**Then check database:**
```sql
SELECT payment_status, paid_at, payment_gateway_fee
FROM payments
WHERE gateway_transaction_id = 'GATEWAY_TRANSACTION_ID_FROM_TEST_3';
```

**Expected:**
- `payment_status` = 'paid'
- `paid_at` = timestamp
- `payment_gateway_fee` = 2500

**What This Tests:**
- ✅ Valid HMAC signature accepted
- ✅ Payment marked as paid
- ✅ Gateway fee recorded
- ✅ Webhook event stored (no duplicates)

**Result:** [ ] PASS [ ] FAIL

---

### Test 7: Webhook Idempotency (Duplicate Prevention)
**Purpose:** Test duplicate webhook rejection

**Endpoint:** `POST /api/webhooks/xendit`

**Send the same webhook from Test 6 again**

**Expected Response:** `200 OK`
```json
{
  "received": true,
  "message": "Already processed"
}
```

**What This Tests:**
- ✅ Duplicate webhook detection working
- ✅ Payment not double-processed
- ✅ `webhook_events` table working

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 4: Refund Processing (Real Xendit API Fix)

### Test 8: Create Refund Request
**Purpose:** Test refund creation

**Endpoint:** `POST /api/refunds`

**Request Body:**
```json
{
  "paymentId": "PAYMENT_ID_FROM_TEST_3",
  "orderId": "YOUR_ORDER_UUID",
  "userId": "YOUR_USER_UUID",
  "reason": "REQUESTED_BY_CUSTOMER",
  "description": "Customer requested refund",
  "amount": 100000
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "payment_id": "payment-uuid",
    "order_id": "order-uuid",
    "user_id": "user-uuid",
    "refund_code": "REF-20251110-XXXXXX",
    "refund_status": "pending",
    "refund_amount": "100000",
    "refund_reason": "REQUESTED_BY_CUSTOMER",
    "reason_description": "Customer requested refund"
  }
}
```

**What This Tests:**
- ✅ Refund record created
- ✅ Payment must be 'paid' status
- ✅ Refund code generated

**Save:** `refund.id` for next test

**Result:** [ ] PASS [ ] FAIL

---

### Test 9: Process Refund - Real Xendit API Call
**Purpose:** Test refund processing uses real Xendit API

**Endpoint:** `POST /api/admin/refunds/{refundId}/process`

**Parameters:**
- Use `refund.id` from Test 8

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "id": "refund-uuid",
    "refund_status": "completed",
    "refund_amount": "100000",
    "processed_at": "2025-11-10T11:00:00Z",
    "gateway_refund_id": "xendit-refund-id-xxx",
    "gateway_response": {
      "id": "xendit-refund-id",
      "status": "PENDING",
      "amount": 100000,
      "created": "2025-11-10T11:00:00Z"
    }
  }
}
```

**What This Tests:**
- ✅ Real Xendit refund API called (not mock)
- ✅ `xenditRefundClient.createRefund()` executed
- ✅ Gateway response stored
- ✅ Refund status updated

**CRITICAL:** Check console logs for "Processing e-wallet refund via Xendit" or "Processing bank refund via Xendit"
- If you see "TODO: Implement actual refund", the fix failed!
- Should see actual Xendit API call logs

**Result:** [ ] PASS [ ] FAIL

**If Failed:**
```
Console output:
Gateway response:
```

---

### Test 10: Verify Payment Updated After Refund
**Purpose:** Test payment status changed to 'refunded'

**Endpoint:** `GET /api/payments/{paymentId}`

**Parameters:**
- Use `paymentId` from Test 3

**Expected Response:** `200 OK`
```json
{
  "data": {
    "id": "payment-uuid",
    "payment_status": "refunded",
    "refund_amount": "100000",
    "refunded_at": "2025-11-10T11:00:00Z",
    "is_in_escrow": false,
    "escrow_released_at": "2025-11-10T11:00:00Z"
  }
}
```

**What This Tests:**
- ✅ Payment marked as refunded
- ✅ Refund amount recorded
- ✅ Escrow released

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 5: Escrow & Group Buying Integration

### Test 11: Release Escrow for Group Session
**Purpose:** Test escrow release for successful group buying

**Setup:** Need a group session with PAID escrow payments

**Endpoint:** `POST /api/admin/escrow/{groupSessionId}/release`

**Parameters:**
- Use group session UUID from Test 4

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Escrow released",
  "paymentsReleased": 1
}
```

**What This Tests:**
- ✅ Escrow release transaction wrapping
- ✅ Only PAID escrow payments released
- ✅ Transaction ledger updated

**Result:** [ ] PASS [ ] FAIL

---

### Test 12: Refund Failed Group Session
**Purpose:** Test automatic refund for failed MOQ

**Endpoint:** `POST /api/admin/refunds/session/{groupSessionId}`

**Request Body:**
```json
{
  "reason": "group_failed_moq",
  "description": "Session failed to reach minimum order quantity"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session refunds processed",
  "results": [
    {
      "paymentId": "payment-uuid-1",
      "status": "success",
      "refundId": "refund-uuid-1"
    }
  ]
}
```

**What This Tests:**
- ✅ Bulk refund processing
- ✅ Only PAID payments refunded
- ✅ Each refund uses real Xendit API

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 6: Payment Queries & Analytics

### Test 13: Get User Payments
**Purpose:** Test payment history for user

**Endpoint:** `GET /api/payments/user/{userId}`

**Query Parameters:**
- `page=1`
- `limit=10`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "order_id": "order-uuid",
      "payment_status": "refunded",
      "order_amount": "100000",
      "payment_method": "bank_transfer",
      "created_at": "2025-11-10T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Result:** [ ] PASS [ ] FAIL

---

### Test 14: Verify Payment Status
**Purpose:** Test payment verification endpoint

**Endpoint:** `POST /api/payments/verify`

**Request Body:**
```json
{
  "paymentId": "PAYMENT_ID_FROM_TEST_3"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payment_status": "refunded",
    "paid_at": "2025-11-10T10:30:00Z",
    "refunded_at": "2025-11-10T11:00:00Z",
    "is_in_escrow": false
  }
}
```

**Result:** [ ] PASS [ ] FAIL

---

## SECTION 7: Admin Endpoints

### Test 15: Get All Payments (Admin)
**Purpose:** Test admin payment listing

**Endpoint:** `GET /api/admin/payments`

**Query Parameters:**
- `status=paid`
- `page=1`
- `limit=20`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "payment_status": "paid",
      "order_amount": "100000",
      "created_at": "2025-11-10T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Result:** [ ] PASS [ ] FAIL

---

### Test 16: Get Payment Statistics (Admin)
**Purpose:** Test payment analytics

**Endpoint:** `GET /api/admin/payments/stats`

**Query Parameters:**
- `startDate=2025-11-01`
- `endDate=2025-11-30`

**Expected Response:** `200 OK`
```json
{
  "data": {
    "totalPayments": 100,
    "totalAmount": "50000000",
    "paidCount": 80,
    "pendingCount": 15,
    "refundedCount": 5,
    "averageAmount": "500000",
    "gatewayFees": "1250000"
  }
}
```

**Result:** [ ] PASS [ ] FAIL

---

### Test 17: Get Transaction Ledger (Admin)
**Purpose:** Test financial audit trail

**Endpoint:** `GET /api/admin/ledger`

**Query Parameters:**
- `startDate=2025-11-01`
- `endDate=2025-11-30`
- `page=1`
- `limit=20`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "transaction_type": "payment_received",
      "payment_id": "payment-uuid",
      "amount": "100000",
      "created_at": "2025-11-10T10:30:00Z",
      "metadata": {
        "gatewayFee": 2500,
        "isEscrow": false
      }
    },
    {
      "id": "uuid",
      "transaction_type": "refund_issued",
      "payment_id": "payment-uuid",
      "amount": "-100000",
      "created_at": "2025-11-10T11:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

**What This Tests:**
- ✅ All financial transactions logged
- ✅ Debits and credits tracked
- ✅ Audit trail complete

**Result:** [ ] PASS [ ] FAIL

---

### Test 18: Force Update Payment Status (Admin)
**Purpose:** Test admin override capability

**Endpoint:** `POST /api/admin/payments/{paymentId}/update`

**Request Body:**
```json
{
  "status": "paid",
  "reason": "Manual verification - bank transfer confirmed"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment status updated",
  "data": {
    "id": "payment-uuid",
    "payment_status": "paid",
    "updated_at": "2025-11-10T12:00:00Z"
  }
}
```

**What This Tests:**
- ✅ Admin can manually update status
- ✅ Reason logged for audit

**Result:** [ ] PASS [ ] FAIL

---

### Test 19: Cancel Payment (Admin)
**Purpose:** Test admin payment cancellation

**Endpoint:** `POST /api/admin/payments/{paymentId}/cancel`

**Request Body:**
```json
{
  "reason": "Duplicate payment detected"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment cancelled"
}
```

**Result:** [ ] PASS [ ] FAIL

---

### Test 20: Payment Expiration Cron Job
**Purpose:** Test automatic payment expiration

**Setup:** Wait for cron job to run (hourly) or trigger manually

**Check Database:**
```sql
SELECT id, payment_status, expires_at
FROM payments
WHERE expires_at < NOW() AND payment_status = 'pending';
```

**Expected:** All expired pending payments should be marked as 'expired'

**What This Tests:**
- ✅ Cron job running
- ✅ Expired payments detected
- ✅ Status updated automatically

**Result:** [ ] PASS [ ] FAIL

---

## Test Summary

| Test # | Test Name | Result | Notes |
|--------|-----------|--------|-------|
| 1 | Health Check | [ ] | |
| 2 | Swagger Docs | [ ] | |
| 3 | Create Payment (Duration Fix) | [ ] | CRITICAL |
| 4 | Create Escrow Payment | [ ] | |
| 5 | Invalid Webhook Signature | [ ] | CRITICAL |
| 6 | Valid Webhook HMAC | [ ] | CRITICAL |
| 7 | Webhook Idempotency | [ ] | |
| 8 | Create Refund | [ ] | |
| 9 | Process Refund (Real API) | [ ] | CRITICAL |
| 10 | Verify Refunded Payment | [ ] | |
| 11 | Release Escrow | [ ] | |
| 12 | Refund Failed Session | [ ] | |
| 13 | Get User Payments | [ ] | |
| 14 | Verify Payment | [ ] | |
| 15 | Admin List Payments | [ ] | |
| 16 | Payment Statistics | [ ] | |
| 17 | Transaction Ledger | [ ] | |
| 18 | Force Update Status | [ ] | |
| 19 | Cancel Payment | [ ] | |
| 20 | Expiration Cron Job | [ ] | |

**Total Tests:** 20
**Passed:** ___
**Failed:** ___

---

## Critical Tests (Must Pass)

These tests verify the critical bug fixes:

- **Test 3** - Invoice duration as number (was string, caused Xendit errors)
- **Test 5 & 6** - HMAC webhook verification (was simple string comparison, security vulnerability)
- **Test 9** - Real Xendit refund API (was mock implementation)

**If any of these fail, the critical fixes are not working!**

---

## Common Issues to Watch For

### Issue 1: Xendit API Rejection
**Symptom:** Error "invoiceDuration must be a number"
**Means:** Still sending string instead of number
**Report:** Exact error from Xendit

### Issue 2: Webhook Accepts Invalid Signature
**Symptom:** Test 5 returns 200 OK instead of 403
**Means:** HMAC verification not working, still using simple comparison
**Report:** Response from Test 5

### Issue 3: Refund Shows Mock Response
**Symptom:** Console shows "TODO: Implement actual refund"
**Means:** Still using mock, not calling Xendit API
**Report:** Console logs from Test 9

### Issue 4: Service Name Wrong
**Symptom:** Console shows "product-service running"
**Means:** Service name not fixed
**Report:** Console output on startup

---

## Integration Test Flow

**Complete Group Buying + Payment Flow:**

1. Create group buying session (Group Buying Service)
2. User joins session → Creates escrow payment (Test 4)
3. User pays via Xendit → Webhook received (Test 6)
4. Session expires with MOQ reached
5. Escrow released to factory (Test 11)
6. OR session fails → Refunds issued (Test 12)

**This tests:**
- ✅ End-to-end payment flow
- ✅ Escrow management
- ✅ Webhook handling
- ✅ Refund processing

---

## After Testing

Report results in this format:
```
Test 3: PASS
Invoice created successfully, invoiceDuration sent as number
Payment URL: https://checkout.xendit.co/xyz

Test 5: PASS
Invalid signature rejected with 403

Test 6: PASS
Valid HMAC signature accepted, payment marked as paid

Test 9: PASS
Real Xendit refund API called
Gateway response: {"id": "xendit-refund-123", "status": "PENDING"}

All critical tests: PASS
```

If any test fails, provide:
- Test number
- Error message
- Console logs
- Expected vs actual behavior

---

**Ready to test! 🧪**
