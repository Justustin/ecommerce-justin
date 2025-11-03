# Payment Service - Complete Documentation

## 📋 Overview

The **Payment Service** handles all payment processing, escrow management, refunds, and financial transactions for your Pinduoduo-clone e-commerce platform.

**Port:** 3006 (default)
**Database Tables:** `payments`, `refunds`, `transaction_ledger`
**Payment Gateway:** Xendit (Indonesian payment gateway)

---

## 🏗️ Architecture

### **Service Structure**

```
payment-service/
├── src/
│   ├── services/
│   │   ├── payment.service.ts        # Main payment logic
│   │   ├── refund.service.ts         # Refund processing
│   │   └── transaction-ledger.service.ts  # Financial ledger
│   ├── repositories/
│   │   ├── payment.repository.ts     # Payment data access
│   │   ├── refund.repository.ts      # Refund data access
│   │   └── transaction-ledger.repository.ts
│   ├── controllers/
│   │   ├── payment.controller.ts     # Payment API endpoints
│   │   ├── webhook.controller.ts     # Xendit webhook handler
│   │   └── transaction.controller.ts # Transaction endpoints
│   ├── routes/
│   │   ├── payment.routes.ts
│   │   ├── webhook.routes.ts
│   │   └── transaction.routes.ts
│   ├── clients/
│   │   └── notification.client.ts    # Notification service integration
│   ├── config/
│   │   ├── xendit.ts                 # Xendit API configuration
│   │   └── swagger.ts                # API documentation
│   └── index.ts                      # Entry point
```

---

## 🎯 Core Features

### **1. Regular Payments**
- Create payment invoices via Xendit
- Support multiple payment methods (Bank Transfer, e-wallets)
- Automatic payment expiration
- Real-time webhook callbacks

### **2. Escrow Payments (Group Buying)**
- Hold payments until MOQ reached
- Release funds after group success
- Automatic refunds if group fails
- Transaction ledger tracking

### **3. Refund Management**
- Automatic refunds for failed group buying
- Manual refunds for customer requests
- E-wallet vs bank transfer refunds
- Refund status tracking

### **4. Transaction Ledger**
- Complete audit trail of all financial transactions
- Support for factory settlements
- Query transaction history

### **5. Automated Tasks**
- Cron job: Expire pending payments (every hour)
- Auto-process refunds for failed groups

---

## 📡 API Endpoints

### **Base URL:** `http://localhost:3006`

---

### **Payment Endpoints**

#### **1. Create Regular Payment**
```http
POST /api/payments
Content-Type: application/json

{
  "orderId": "uuid",
  "userId": "uuid",
  "amount": 100000,
  "paymentMethod": "bank_transfer", // or ewallet_ovo, ewallet_gopay, ewallet_dana
  "expiresAt": "2025-11-04T12:00:00Z"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid",
      "payment_status": "pending",
      "payment_url": "https://checkout.xendit.co/web/abc123",
      "expires_at": "2025-11-04T12:00:00Z"
    },
    "paymentUrl": "https://checkout.xendit.co/web/abc123",
    "invoiceId": "xendit-invoice-id"
  }
}
```

**Use Case:** Regular product orders (not group buying)

---

#### **2. Create Escrow Payment (Group Buying)**
```http
POST /api/payments/escrow
Content-Type: application/json

{
  "userId": "uuid",
  "groupSessionId": "uuid",
  "participantId": "uuid",
  "amount": 50000,
  "factoryId": "uuid",
  "expiresAt": "2025-11-04T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid",
      "is_in_escrow": true,
      "payment_status": "pending",
      "payment_url": "https://checkout.xendit.co/web/abc123"
    },
    "paymentUrl": "https://checkout.xendit.co/web/abc123",
    "invoiceId": "xendit-invoice-id"
  }
}
```

**Use Case:** User joining group buying session. Payment held in escrow until MOQ reached.

**Flow:**
1. User joins group → Payment created in escrow
2. MOQ reached → Escrow released (money moves to factory)
3. MOQ not reached → Refund issued

---

#### **3. Release Escrow (When Group Succeeds)**
```http
POST /api/payments/release-escrow
Content-Type: application/json

{
  "groupSessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Escrow released",
  "paymentsReleased": 15
}
```

**Use Case:** Called by group-buying service when MOQ reached and orders created.

**What It Does:**
- Finds all paid escrow payments for the session
- Marks `is_in_escrow = false`
- Records transaction in ledger
- Money now available for factory settlement

---

#### **4. Refund Group Session (When Group Fails)**
```http
POST /api/payments/refund-session
Content-Type: application/json

{
  "groupSessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "paymentId": "payment-uuid-1",
      "status": "success",
      "refundId": "refund-uuid-1"
    },
    {
      "paymentId": "payment-uuid-2",
      "status": "success",
      "refundId": "refund-uuid-2"
    }
  ]
}
```

**Use Case:** Called by group-buying service when session expires without reaching MOQ.

**What It Does:**
- Finds all paid payments for the session
- Creates refund record for each
- Auto-processes refunds
- Sends notifications to users

---

#### **5. Get Payment by Order**
```http
GET /api/payments/order/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "order_id": "order-uuid",
    "user_id": "user-uuid",
    "payment_status": "paid",
    "order_amount": 100000,
    "total_amount": 103000,
    "payment_gateway_fee": 3000,
    "payment_method": "bank_transfer",
    "is_in_escrow": false,
    "paid_at": "2025-11-03T10:30:00Z"
  }
}
```

---

#### **6. Get Payments Eligible for Settlement**
```http
POST /api/payments/eligible-for-settlement
Content-Type: application/json

{
  "periodStart": "2025-11-01T00:00:00Z",
  "periodEnd": "2025-11-07T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-uuid",
      "order_id": "order-uuid",
      "order_amount": 100000,
      "payment_gateway_fee": 3000,
      "paid_at": "2025-11-03T10:30:00Z",
      "is_in_escrow": false,
      "escrow_released_at": "2025-11-03T15:00:00Z"
    }
  ]
}
```

**Use Case:** Factory settlement service uses this to calculate payouts.

**Criteria:**
- Status: `paid`
- Escrow released (if applicable)
- Not yet included in settlement
- Within specified period

---

### **Webhook Endpoints**

#### **Xendit Payment Callback**
```http
POST /api/webhooks/xendit
X-Callback-Token: your-xendit-callback-token
Content-Type: application/json

{
  "id": "xendit-invoice-id",
  "status": "PAID",
  "amount": 100000,
  "paid_amount": 100000,
  "fees_paid_amount": 3000,
  "payment_method": "BANK_TRANSFER",
  "paid_at": "2025-11-03T10:30:00Z"
}
```

**What It Does:**
1. Finds payment by `gateway_transaction_id`
2. Marks payment as `paid`
3. Updates order status to `paid`
4. Records transaction in ledger
5. Sends success notification to user

**Security:** Validates `X-Callback-Token` against env var

---

### **Transaction Ledger Endpoints**

#### **Get Order Transaction History**
```http
GET /api/transactions/order/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ledger-uuid",
      "transaction_type": "payment_received",
      "amount": 100000,
      "description": "Payment received for order ORD-2025-001",
      "transaction_time": "2025-11-03T10:30:00Z",
      "metadata": {
        "gatewayFee": 3000,
        "isEscrow": false
      }
    },
    {
      "transaction_type": "commission_earned",
      "amount": 10000,
      "description": "Platform commission",
      "transaction_time": "2025-11-03T10:30:01Z"
    }
  ]
}
```

---

## 💰 Payment Flow Diagrams

### **Regular Order Payment Flow**

```
1. User creates order
   ↓
2. Order service calls Payment service → POST /api/payments
   ↓
3. Payment service creates Xendit invoice
   ↓
4. User redirected to Xendit checkout page
   ↓
5. User pays via bank transfer/e-wallet
   ↓
6. Xendit sends webhook → POST /api/webhooks/xendit
   ↓
7. Payment service marks payment as PAID
   ↓
8. Order status updated to PAID
   ↓
9. Transaction recorded in ledger
   ↓
10. Notification sent to user
```

---

### **Group Buying Escrow Flow**

```
1. User joins group buying session
   ↓
2. Group service calls Payment service → POST /api/payments/escrow
   ↓
3. Payment held in escrow (is_in_escrow = true)
   ↓
4. User pays via Xendit
   ↓
5. Payment marked PAID but still in escrow
   ↓
┌─────────────┬─────────────┐
│ MOQ Reached │ MOQ Failed  │
├─────────────┼─────────────┤
│ POST        │ POST        │
│ /release-   │ /refund-    │
│ escrow      │ session     │
│             │             │
│ Escrow      │ Refund      │
│ released    │ issued      │
│             │             │
│ Orders      │ Payment     │
│ created     │ refunded    │
└─────────────┴─────────────┘
```

---

## 🔧 Payment Methods Supported

| Method | Code | Provider | Type |
|--------|------|----------|------|
| Bank Transfer | `bank_transfer` | Xendit | Virtual Account |
| OVO | `ewallet_ovo` | Xendit | E-Wallet |
| GoPay | `ewallet_gopay` | Xendit | E-Wallet |
| DANA | `ewallet_dana` | Xendit | E-Wallet |

**Note:** More methods can be added by extending Xendit integration.

---

## 💳 Payment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting for user payment |
| `processing` | Payment being verified |
| `paid` | Payment confirmed |
| `refunded` | Payment refunded to user |
| `failed` | Payment failed |
| `expired` | Payment link expired |

---

## 🔄 Refund Process

### **Automatic Refund (Group Buying Failure)**

1. Group buying session expires without MOQ
2. Group service calls `POST /api/payments/refund-session`
3. For each paid payment:
   - Refund record created with reason `group_failed_moq`
   - Refund auto-processed (async)
   - Payment status → `refunded`
   - Order status → `cancelled`
   - User notified

### **Manual Refund (Customer Request)**

1. Customer requests refund
2. Admin creates refund via API
3. Refund goes to `pending` status
4. Admin approves → status `processing`
5. Refund processed based on payment method:
   - **E-wallet:** Instant refund via Xendit API
   - **Bank:** Manual processing required
6. Status → `completed`
7. User notified

---

## 📊 Transaction Ledger

Every financial event is recorded in `transaction_ledger` table:

### **Transaction Types:**

| Type | When It's Created |
|------|-------------------|
| `payment_received` | User pays for order |
| `escrow_released` | Escrow funds released after MOQ |
| `refund_issued` | Refund processed |
| `commission_earned` | Platform commission calculated |
| `settlement_paid` | Factory receives payout |
| `adjustment` | Manual financial adjustment |
| `fee_charged` | Payment gateway fee |

### **Why Transaction Ledger?**

- ✅ Complete audit trail
- ✅ Financial reporting
- ✅ Dispute resolution
- ✅ Reconciliation with payment gateway
- ✅ Tax compliance
- ✅ Factory settlement calculations

---

## ⚙️ Configuration

### **Environment Variables**

```bash
# Server
PORT=3006
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Xendit (Payment Gateway)
XENDIT_SECRET_KEY=xnd_xxx_your_secret_key
XENDIT_PUBLIC_KEY=xnd_public_xxx
XENDIT_CALLBACK_TOKEN=your_webhook_token

# Payment URLs
PAYMENT_SUCCESS_URL=https://yourdomain.com/payment/success
PAYMENT_FAILURE_URL=https://yourdomain.com/payment/failed

# Email Placeholder (for users without email)
PLACEHOLDER_EMAIL_DOMAIN=pinduoduo.id

# Cron Jobs
ENABLE_EXPIRATION_CRON=true
EXPIRATION_CRON_SCHEDULE=0 * * * *  # Every hour

# Service URLs
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

---

## 🔒 Security

### **Webhook Verification**

```typescript
// Xendit webhook handler verifies token
const callbackToken = req.headers['x-callback-token'];

if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
  return res.status(401).json({ error: 'Invalid callback token' });
}
```

**⚠️ Important:** Never expose `XENDIT_CALLBACK_TOKEN` in frontend code.

### **Payment Security Best Practices**

1. ✅ All amounts are stored as `Decimal` (prevents rounding errors)
2. ✅ Payment verification before order fulfillment
3. ✅ Webhook token validation
4. ✅ Transaction ledger for audit trail
5. ✅ Idempotent webhook handling (checks if already processed)

---

## 🐛 Error Handling

### **Common Errors**

| Error | Cause | Solution |
|-------|-------|----------|
| `User not found` | Invalid userId | Verify user exists before payment |
| `Payment not found for transaction ID` | Webhook for unknown payment | Check Xendit dashboard vs database |
| `Payment already has a pending refund` | Duplicate refund request | Check existing refunds first |
| `Cannot refund unpaid payment` | Trying to refund pending payment | Only refund paid payments |

---

## 📈 Monitoring & Logs

### **Key Metrics to Monitor**

1. **Payment Success Rate**: `(paid_count / total_count) * 100`
2. **Average Payment Time**: Time from creation to paid
3. **Refund Rate**: `(refunded_count / paid_count) * 100`
4. **Escrow Retention**: Payments in escrow > 48 hours
5. **Expired Payments**: Count of expired unpaid invoices

### **Log Patterns**

```bash
# Payment created
"💳 Payment Service"
"Creating payment for order: order-uuid"

# Payment callback received
"Xendit callback received: PAID"
"Payment payment-uuid already marked as paid - skipping"

# Refund processing
"Processing bank refund: { paymentId, refundId, amount }"
"Refund processing failed for refund-uuid: error message"

# Cron job
"[2025-11-03T10:00:00Z] Checking for expired payments..."
"Expired 5 payments"
```

---

## 🔗 Service Integration

### **Services That Call Payment Service**

1. **Order Service**: Creates payments for regular orders
2. **Group Buying Service**: Creates escrow payments, releases escrow, requests refunds
3. **Factory Settlement Service**: Queries eligible payments for payouts

### **Services Called by Payment Service**

1. **Notification Service**: Sends payment success/failure notifications
2. **Order Service**: Not directly, but updates order status via database

---

## 🧪 Testing

### **Manual Testing Checklist**

**Regular Payment:**
- [ ] Create payment → Invoice URL returned
- [ ] User pays → Webhook received → Status = paid
- [ ] Order status updated to paid
- [ ] Notification sent

**Escrow Payment:**
- [ ] Join group → Escrow payment created
- [ ] Pay → Status = paid, is_in_escrow = true
- [ ] MOQ reached → Release escrow → is_in_escrow = false
- [ ] MOQ failed → Refund issued → status = refunded

**Refunds:**
- [ ] Create refund → Status = pending
- [ ] Process refund → Status = completed
- [ ] Payment status = refunded
- [ ] Order status = cancelled

### **Test with Xendit Test Mode**

```bash
# Use Xendit test credentials
XENDIT_SECRET_KEY=xnd_development_xxx

# Xendit provides test payment numbers
# Bank Transfer: 1111111111111
# Success: Use amount ending in 00 (e.g., 100000)
# Failed: Use amount ending in 01 (e.g., 100001)
```

---

## 📚 Code Examples

### **Example: Creating a Payment (from another service)**

```typescript
import axios from 'axios';

const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

async function createOrderPayment(orderId: string, userId: string, amount: number) {
  const response = await axios.post(`${paymentServiceUrl}/api/payments`, {
    orderId,
    userId,
    amount,
    paymentMethod: 'bank_transfer',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });

  return response.data.data; // { payment, paymentUrl, invoiceId }
}
```

### **Example: Releasing Escrow**

```typescript
async function releaseGroupEscrow(groupSessionId: string) {
  const response = await axios.post(
    `${paymentServiceUrl}/api/payments/release-escrow`,
    { groupSessionId }
  );

  console.log(`Released escrow for ${response.data.paymentsReleased} payments`);
}
```

---

## 🚀 Deployment

### **Pre-deployment Checklist**

- [ ] Xendit account created (production)
- [ ] Xendit API keys configured in env
- [ ] Webhook callback URL registered in Xendit dashboard
- [ ] Database migrations applied
- [ ] Payment success/failure redirect URLs configured
- [ ] Notification service running
- [ ] Test webhook delivery

### **Xendit Dashboard Setup**

1. Go to https://dashboard.xendit.co/
2. Settings → Webhooks → Invoice Paid
3. Add webhook URL: `https://yourdomain.com/api/webhooks/xendit`
4. Set callback token (must match env var)
5. Test webhook delivery

---

## 📋 Database Schema

### **Payments Table**

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id),
  group_session_id UUID REFERENCES group_buying_sessions(id),
  participant_id UUID REFERENCES group_participants(id),

  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending',

  order_amount DECIMAL(15,2) NOT NULL,
  payment_gateway_fee DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,

  is_in_escrow BOOLEAN DEFAULT false,
  escrow_released_at TIMESTAMPTZ,

  refund_amount DECIMAL(15,2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  gateway_transaction_id VARCHAR(255) UNIQUE,
  payment_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Refunds Table**

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  refund_code VARCHAR(20) UNIQUE NOT NULL,
  payment_id UUID NOT NULL REFERENCES payments(id),
  order_id UUID REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id),

  refund_reason refund_reason NOT NULL,
  refund_status refund_status DEFAULT 'pending',

  refund_amount DECIMAL(15,2) NOT NULL,
  refund_fee DECIMAL(15,2) DEFAULT 0,

  payment_gateway VARCHAR(50),
  gateway_refund_id VARCHAR(255),
  gateway_response JSONB,

  reason_description TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎓 Key Takeaways

1. **Escrow is Critical for Group Buying**: Holds funds until MOQ reached, protects users
2. **Transaction Ledger**: Complete audit trail for all financial events
3. **Webhook Security**: Always validate Xendit callback token
4. **Idempotent Webhooks**: Check if payment already processed to avoid double-counting
5. **Automatic Expiration**: Cron job handles expired payments
6. **Refund Automation**: Group buying failures auto-trigger refunds

---

## 🔗 Related Services

- **Order Service**: Creates regular payments
- **Group Buying Service**: Manages escrow lifecycle
- **Notification Service**: Sends payment notifications
- **Factory Settlement Service**: Calculates payouts

---

## 📞 Support

**Swagger Documentation:** http://localhost:3006/api-docs
**Health Check:** http://localhost:3006/health
**Xendit Support:** https://docs.xendit.co/

---

**Service Status:** ✅ Production Ready
**Last Updated:** 2025-11-03
**Version:** 1.0.0
