# Payment Service - Quick Reference Guide

## Key File Locations

```
services/payment-service/
├── src/
│   ├── index.ts                    # Express app setup, health check, cron job
│   ├── types/index.ts              # TypeScript interfaces
│   ├── config/
│   │   ├── xendit.ts               # Xendit client initialization
│   │   └── swagger.ts              # API documentation
│   ├── utils/
│   │   └── crypto.utils.ts         # HMAC-SHA256 verification, code generation
│   ├── clients/
│   │   └── notification.client.ts  # Notification service client
│   ├── services/
│   │   ├── payment.service.ts      # Payment creation, escrow, callbacks
│   │   ├── refund.service.ts       # Refund processing logic
│   │   └── transaction-ledger.service.ts  # Audit trail recording
│   ├── repositories/
│   │   ├── payment.repository.ts   # Payment CRUD operations
│   │   ├── refund.repository.ts    # Refund CRUD operations
│   │   └── transaction-ledger.repository.ts  # Ledger CRUD operations
│   ├── controllers/
│   │   ├── payment.controller.ts   # Payment endpoints
│   │   ├── webhook.controller.ts   # Xendit webhook handler
│   │   ├── admin.controller.ts     # Admin endpoints
│   │   └── transaction.controller.ts  # Transaction history endpoints
│   └── routes/
│       ├── payment.routes.ts       # /api/payments
│       ├── webhook.routes.ts       # /api/webhooks
│       ├── transaction.routes.ts   # /api/transactions
│       └── admin.routes.ts         # /api/admin
└── package.json
```

## Critical Issues Summary

### 🔴 CRITICAL BUGS

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Webhook Race Condition | webhook.controller.ts:29-41 | Duplicate payments | Use INSERT...ON CONFLICT |
| Admin Refund Approval Broken | admin.controller.ts:257 | No refunds processed | Call RefundService.processRefund() |
| Admin Manual Refund Broken | admin.controller.ts:373 | No refunds processed | Call RefundService.processRefund() |
| Missing Transaction in Payment Callback | payment.service.ts:70-138 | Data inconsistency | Wrap in prisma.$transaction() |

### ⚠️ HIGH PRIORITY ISSUES

| Issue | Location | Severity |
|-------|----------|----------|
| Null Order ID in Escrow Ledger | payment.service.ts:227 | High |
| No Group Session Validation | payment.service.ts, refund.service.ts | High |
| Phone Number Formatting Inconsistency | payment.service.ts:29 vs 154 | Medium |
| No Admin Authentication | admin.controller.ts | High |

## API Endpoints

### Payment Creation
```
POST /api/payments
  - Create normal order payment
  
POST /api/payments/escrow
  - Create escrow payment for group buying
  
POST /api/payments/release-escrow
  - Release paid escrow for group session
  
POST /api/payments/refund-session
  - Refund all payments in failed group session
```

### Webhook
```
POST /api/webhooks/xendit/invoice
  - Xendit payment status callback (HMAC-SHA256 verified)
```

### Admin
```
GET  /api/admin/payments
GET  /api/admin/payments/{id}
PUT  /api/admin/payments/{id}/status
POST /api/admin/payments/{id}/reconcile

GET  /api/admin/refunds
POST /api/admin/refunds/{id}/approve      ❌ BROKEN - doesn't call Xendit
POST /api/admin/refunds/{id}/reject
POST /api/admin/refunds/manual             ❌ BROKEN - doesn't call Xendit

GET  /api/admin/escrow/balance
POST /api/admin/escrow/release

GET  /api/admin/ledger
GET  /api/admin/settlements/ready
```

### Transaction History
```
GET /api/transactions/order/{orderId}
GET /api/transactions/payment/{paymentId}
GET /api/transactions/factory/{factoryId}/summary
GET /api/transactions/summary
GET /api/transactions/recent
GET /api/transactions/{transactionCode}
```

## Payment Status Workflow

```
PENDING (created)
  ↓
  [Xendit webhook received]
  ↓
PAID (payment successful)
  ├─ Update order.status = 'paid'
  └─ Record in transaction_ledger
  
OR
  ↓
EXPIRED (payment expired)
  └─ Cancel order if exists
```

## Refund Status Workflow

```
Group Failed:
PENDING (auto-created) → PROCESSING (auto-triggered) → COMPLETED (Xendit refund created)

Admin Approved (BROKEN):
PENDING → PROCESSING ❌ (Xendit refund NOT created) → COMPLETED ❌ (false)

Admin Rejected:
PENDING → REJECTED ✅
```

## Which Refunds Actually Work?

✅ **Working**:
- Group session refunds (auto-triggered when MOQ fails)
  - Via: POST /api/payments/refund-session

❌ **NOT Working**:
- Admin approval of pending refunds
  - Via: POST /api/admin/refunds/{id}/approve
- Admin manual refund creation
  - Via: POST /api/admin/refunds/manual

The issue: Admin endpoints don't call `RefundService.processRefund()` which handles Xendit API calls.

## Database Tables

### payments
```
- id (UUID)
- order_id (UUID, optional)
- user_id (UUID, required)
- payment_status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded'
- order_amount (Decimal)
- payment_gateway_fee (Decimal)
- gateway_transaction_id (unique)
- is_in_escrow (Boolean)
- group_session_id (UUID, optional)
- participant_id (UUID, optional)
- metadata (JSON)
```

### refunds
```
- id (UUID)
- refund_code (unique string)
- payment_id (UUID, FK)
- order_id (UUID, optional)
- user_id (UUID)
- refund_status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'
- refund_amount (Decimal)
- gateway_refund_id (optional)
- gateway_response (JSON)
```

### transaction_ledger
```
- id (UUID)
- transaction_code (unique)
- transaction_type: 'payment_received' | 'refund_issued' | 'settlement_paid' | 'escrow_released'
- payment_id (optional)
- order_id (optional)
- refund_id (optional)
- factory_id (optional)
- amount (Decimal)
- metadata (JSON)
```

### webhook_events
```
- id (UUID)
- event_id (unique string) - from Xendit
- event_type (string)
- payload (JSON)
- processed (Boolean)
- processed_at (DateTime, optional)
```

## Environment Variables

```env
XENDIT_SECRET_KEY=xxx              # Required for Xendit API
XENDIT_WEBHOOK_SECRET=xxx          # Required for webhook verification
XENDIT_API_KEY=xxx                 # For admin reconciliation
NOTIFICATION_SERVICE_URL=xxx       # For payment notifications
PLACEHOLDER_EMAIL_DOMAIN=pinduoduo.id
PAYMENT_SUCCESS_URL=/
PAYMENT_FAILURE_URL=/
ENABLE_EXPIRATION_CRON=true
EXPIRATION_CRON_SCHEDULE="0 * * * *"
```

## Key Code Patterns

### Payment Creation Flow
```typescript
// 1. Validate user
// 2. Create Xendit invoice with invoiceDuration in seconds
// 3. Save payment to database
// 4. Return payment URL
```

### Webhook Processing
```typescript
// 1. Verify HMAC-SHA256 signature ✅
// 2. Check webhook_events for deduplication ⚠️ (HAS RACE CONDITION)
// 3. Process payment if status == PAID
// 4. Mark event as processed
```

### Refund Processing (Service Only)
```typescript
// 1. Mark refund as processing
// 2. Call Xendit refund API (works for group refunds only)
// 3. Update payment status to 'refunded'
// 4. Update order status to 'cancelled'
// 5. Record in transaction ledger
```

## Testing Recommendations

### Must Test
1. Concurrent webhook payments for same order
2. Escrow release with and without orders
3. Admin refund approval (currently broken)
4. Admin manual refund (currently broken)
5. Payment reconciliation with Xendit

### Test Data
- Multiple group buying sessions
- Payments at different statuses
- Different payment methods (bank_transfer, ewallet_*)
- Concurrent webhook deliveries

## Security Checklist

- [ ] Add authentication to admin endpoints
- [ ] Add rate limiting to payment creation
- [ ] Add audit logging to admin operations
- [ ] Validate webhook signature on every request ✅
- [ ] Use timing-safe comparison ✅
- [ ] Never expose API keys in logs
- [ ] Validate all input with express-validator ✅

## Performance Considerations

### Database Queries to Monitor
- payment lookups by gateway_transaction_id (indexed)
- payments by group_session_id (indexed)
- transaction_ledger aggregations (could be heavy)

### Potential Bottlenecks
- Ledger recording for each payment (4 separate writes)
- Notification service calls (timeout 5s, graceful fail)
- Xendit API calls (no retry logic)

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Configure Xendit webhook secret
- [ ] Test webhook verification
- [ ] Enable payment expiration cron job
- [ ] Set up admin authentication
- [ ] Fix webhook race condition
- [ ] Fix admin refund endpoints
- [ ] Implement transaction wrapping
- [ ] Set up monitoring/alerting
- [ ] Test in staging environment

## Related Services

- **Notification Service**: Sends payment/refund notifications
- **Order Service**: Updates order status based on payment
- **Group Buying Service**: Manages group sessions
- **Settlement Service**: Monthly factory payouts

