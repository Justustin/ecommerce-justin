# Microservices Architecture - High Level Overview

## Services Summary

| Service | Port | Database Tables | Primary Responsibility |
|---------|------|----------------|------------------------|
| **Auth Service** | 3001 | users, sessions | User authentication, session management |
| **Product Service** | 3002 | products, categories, variants | Product catalog management |
| **Factory Service** | 3003 | factories | Factory/manufacturer management |
| **Group Buying Service** | 3004 | group_buying_sessions, group_participants | Group buying sessions, MOQ tracking |
| **Order Service** | 3005 | orders, order_items | Order creation and management |
| **Payment Service** | 3006 | payments, refunds, transaction_ledger, webhook_events | Payment processing, escrow, refunds |
| **Notification Service** | 3007 | notifications | In-app notifications |
| **Logistics Service** | 3008 | shipments, tracking | Shipping and delivery tracking |
| **Address Service** | 3009 | addresses | User shipping addresses |
| **Wallet Service** | 3010 | wallets, wallet_transactions | User wallet/credits |
| **Warehouse Service** | 3011 | warehouses, inventory | Inventory management |
| **WhatsApp Service** | 3012 | - | WhatsApp messaging integration |

---

## Service-to-Service API Calls

### 🛒 Group Buying Service → Other Services

**Calls TO:**
- **Payment Service (3006)**
  - `POST /api/payments/escrow` - Create escrow payment when user joins
  - `POST /api/payments/release-escrow` - Release escrow when production completes
  - `POST /api/payments/refund-session` - Refund all participants if MOQ fails

- **Order Service (3005)**
  - `POST /api/orders/bulk` - Create orders for all participants when MOQ reached

**Receives calls FROM:**
- External (users joining sessions, factories managing production)

---

### 📦 Order Service → Other Services

**Calls TO:**
- **Payment Service (3006)**
  - `POST /api/payments` - Create payment for new order

- **Product Service (3002)**
  - `GET /api/products/id/:productId` - Get product details for order snapshot
  - Get pricing, factory info, category info

- **Address Service (3009)**
  - `GET /api/addresses/:addressId` - Validate shipping address

**Receives calls FROM:**
- Group Buying Service (bulk order creation)
- External (regular order creation)

---

### 💳 Payment Service → Other Services

**Calls TO:**
- **Notification Service (3007)**
  - `POST /api/notifications` - Send payment success/failure notifications
  - `POST /api/notifications` - Send refund completion notifications

**Receives calls FROM:**
- Order Service (create payment)
- Group Buying Service (escrow operations, refunds)
- Xendit Webhooks (payment status updates)

---

### 🔔 Notification Service → Other Services

**Calls TO:**
- None (leaf service)

**Receives calls FROM:**
- Payment Service (payment/refund notifications)
- Future: All services will call this for notifications

---

### 🔐 Auth Service → Other Services

**Calls TO:**
- **WhatsApp Service (3012)**
  - `POST /api/whatsapp/send-otp` - Send OTP for authentication

**Receives calls FROM:**
- External (user login/registration)

---

## Data Flow Diagrams

### 1. Regular Order Flow

```
User Request
    ↓
ORDER SERVICE (3005)
    ├──→ PRODUCT SERVICE (3002) - Get product details
    ├──→ ADDRESS SERVICE (3009) - Validate address
    ↓
    Create Order in DB
    ↓
    ├──→ PAYMENT SERVICE (3006) - Create payment
    │        ↓
    │        Create Xendit invoice
    │        ↓
    │    ├──→ NOTIFICATION SERVICE (3007) - Payment notification
    ↓
Return payment URL to user
```

### 2. Group Buying Flow (Happy Path - MOQ Reached)

```
Factory creates session
    ↓
GROUP BUYING SERVICE (3004)
    Session in 'forming' status
    ↓
User joins session
    ├──→ PAYMENT SERVICE (3006) - Create escrow payment
    │        ↓
    │        Create Xendit invoice (escrow=true)
    ↓
More users join...
    ↓
MOQ Reached! (via cron: /process-expired)
    ↓
    ├──→ ORDER SERVICE (3005) - Create bulk orders
    │        ↓
    │        Create orders for all participants
    │        ↓
    │    ├──→ PAYMENT SERVICE (3006) - Link orders to escrow payments
    ↓
Factory completes production
    ↓
    ├──→ PAYMENT SERVICE (3006) - Release escrow
    │        ↓
    │        Mark payments as released
    │        ↓
    │    ├──→ NOTIFICATION SERVICE (3007) - Payment released notification
    ↓
Orders ready for shipping
```

### 3. Group Buying Flow (Sad Path - MOQ Failed)

```
Session expires without reaching MOQ
    ↓
GROUP BUYING SERVICE (3004)
    /process-expired endpoint called
    ↓
    Mark session as 'failed'
    ↓
    ├──→ PAYMENT SERVICE (3006) - Refund all participants
    │        ↓
    │        Process refunds for all escrow payments
    │        ↓
    │    ├──→ NOTIFICATION SERVICE (3007) - Refund notification
    ↓
Session closed
```

### 4. Payment Webhook Flow

```
Xendit sends webhook
    ↓
PAYMENT SERVICE (3006)
    POST /api/webhooks/xendit/invoice
    ↓
    Check webhook_events table (idempotency)
    ↓
    Update payment status to 'paid'
    ↓
    If order exists:
        Update order status to 'paid'
        ↓
        ├──→ NOTIFICATION SERVICE (3007) - Payment success
    ↓
    If escrow payment:
        Mark payment as paid (keep in escrow)
```

---

## Architecture Principles

### ✅ Implemented Correctly

1. **Database Ownership**
   - Each service owns its database tables
   - No cross-database queries
   - Notification service owns `notifications` table

2. **Service Communication**
   - REST API calls for inter-service communication
   - Proper use of HTTP clients (axios, fetch)
   - Environment variables for service URLs

3. **Resilience**
   - Retry logic with exponential backoff
   - Graceful degradation (notifications don't break payment flow)
   - Timeout configuration (5-10 seconds)

4. **Idempotency**
   - Webhook event deduplication via `event_id`
   - Atomic session status claims prevent duplicate processing
   - Unique constraints prevent duplicate joins

5. **Transaction Atomicity**
   - Database transactions for critical operations
   - Escrow release wrapped in `prisma.$transaction()`
   - Rollback handling with proper logging

---

## Environment Variables

Each service needs these configured:

```bash
# Group Buying Service
PAYMENT_SERVICE_URL=http://localhost:3006
ORDER_SERVICE_URL=http://localhost:3005

# Order Service
PAYMENT_SERVICE_URL=http://localhost:3006
PRODUCT_SERVICE_URL=http://localhost:3002
ADDRESS_SERVICE_URL=http://localhost:3009

# Payment Service
NOTIFICATION_SERVICE_URL=http://localhost:3007

# Auth Service
WHATSAPP_SERVICE_URL=http://localhost:3012
```

---

## Service Dependencies (Who depends on whom?)

```
GROUP BUYING ──┬──→ PAYMENT
               └──→ ORDER ──┬──→ PAYMENT
                            ├──→ PRODUCT
                            └──→ ADDRESS

PAYMENT ──→ NOTIFICATION

AUTH ──→ WHATSAPP
```

**Dependency Levels:**
- **Level 0 (No dependencies):** Product, Address, WhatsApp, Notification
- **Level 1:** Payment (→ Notification)
- **Level 2:** Order (→ Payment, Product, Address), Auth (→ WhatsApp)
- **Level 3:** Group Buying (→ Payment, Order)

---

## Critical Business Flows

### Escrow Payment Lifecycle

1. **Creation** - User joins group session
   ```
   Group Buying → Payment Service
   Create payment with is_in_escrow=true
   ```

2. **Payment** - User pays via Xendit
   ```
   Xendit Webhook → Payment Service
   Mark as 'paid' but keep in escrow
   ```

3. **Release** - MOQ reached, production complete
   ```
   Group Buying → Payment Service
   Release escrow, funds available to factory
   ```

4. **Refund** - MOQ failed
   ```
   Group Buying → Payment Service
   Process refund for all participants
   ```

---

## API Call Summary

| From Service | To Service | Endpoint | Purpose |
|-------------|-----------|----------|---------|
| Group Buying | Payment | POST /api/payments/escrow | Create escrow payment |
| Group Buying | Payment | POST /api/payments/release-escrow | Release escrow funds |
| Group Buying | Payment | POST /api/payments/refund-session | Bulk refund participants |
| Group Buying | Order | POST /api/orders/bulk | Create orders for participants |
| Order | Payment | POST /api/payments | Create regular payment |
| Order | Product | GET /api/products/id/:id | Get product details |
| Order | Address | GET /api/addresses/:id | Validate address |
| Payment | Notification | POST /api/notifications | Send notifications |
| Auth | WhatsApp | POST /api/whatsapp/send-otp | Send OTP |

---

## Notes

- **Auth Service** is marked as outdated by user (not their responsibility)
- **Settlement Service** and **Review Service** are present but not yet analyzed
- **Logistics Service** has TODOs in group buying service (future integration)
- **Wallet Service** may be used for refunds/credits (not yet integrated)

---

## Service Startup Order (Recommended)

For development, start services in dependency order:

```bash
# Level 0 - No dependencies
cd services/product-service && pnpm run dev &
cd services/address-service && pnpm run dev &
cd services/whatsapp-service && pnpm run dev &
cd services/notification-service && pnpm run dev &

# Level 1 - Depends on Level 0
cd services/payment-service && pnpm run dev &
cd services/auth-service && pnpm run dev &

# Level 2 - Depends on Level 1
cd services/order-service && pnpm run dev &

# Level 3 - Depends on Level 2
cd services/group-buying-service && pnpm run dev &
```

Or use your existing process manager to start all services simultaneously.
