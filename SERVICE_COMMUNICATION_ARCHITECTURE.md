# Microservices Architecture - Service Communication Map

## 📊 High-Level Overview

This document maps out how all 15 microservices communicate with each other in the Laku e-commerce platform (Pinduoduo clone).

---

## 🏗️ Service Inventory

| # | Service | Port | Primary Responsibility |
|---|---------|------|------------------------|
| 1 | **Auth Service** | 3001 | User authentication & authorization |
| 2 | **Product Service** | 3002 | Product catalog management |
| 3 | **Factory Service** | 3003 | Factory/supplier management |
| 4 | **User Service** | 3004 | User profile management |
| 5 | **Order Service** | 3005 | Order creation & management |
| 6 | **Payment Service** | 3006 | Payment processing & escrow |
| 7 | **Group Buying Service** | 3007 | Group buying sessions & MOQ |
| 8 | **Logistics Service** | 3008 | Shipping & tracking |
| 9 | **Address Service** | 3009 | User addresses |
| 10 | **Review Service** | 3010 | Product reviews |
| 11 | **Warehouse Service** | 3011 | Inventory & factory orders |
| 12 | **WhatsApp Service** | 3012 | WhatsApp messaging |
| 13 | **Notification Service** | 3013 | Push notifications & emails |
| 14 | **Office Service** | 3014 | Agent office management |
| 15 | **Settlement Service** | 3015 | Factory payment settlements |
| 16 | **Wallet Service** | 3016 | User wallet & balance |

---

## 🔄 Service Communication Diagram

### **Visual Representation**

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND / API GATEWAY                   │
└────────────┬────────────┬────────────┬────────────┬─────────────┘
             │            │            │            │
             ↓            ↓            ↓            ↓
      ┌──────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐
      │   Auth   │  │ Product  │ │   User   │ │  Order   │
      │ Service  │  │ Service  │ │ Service  │ │ Service  │
      └──────────┘  └──────────┘ └──────────┘ └────┬─────┘
                                                    │
                                         ┌──────────┴───────────┐
                                         ↓                      ↓
                                  ┌──────────┐          ┌──────────┐
                                  │ Payment  │          │ Logistics│
                                  │ Service  │          │ Service  │
                                  └────┬─────┘          └────┬─────┘
                                       │                     │
                    ┌──────────────────┼─────────────────────┤
                    ↓                  ↓                     ↓
             ┌──────────┐       ┌──────────┐        ┌──────────┐
             │  Group   │       │Warehouse │        │Notification│
             │  Buying  │       │ Service  │        │ Service  │
             └────┬─────┘       └────┬─────┘        └──────────┘
                  │                  │
                  └──────────┬───────┘
                             ↓
                      ┌──────────┐
                      │ WhatsApp │
                      │ Service  │
                      └──────────┘
```

---

## 📡 Service-to-Service Communications

### **1. ORDER SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **Payment** | `POST /api/payments` | Create payment invoice | After order created |
| **Notification** | `POST /api/notifications` | Notify user of order status | Order created, updated |
| **Product** | Database direct | Get product details | Order creation |
| **Address** | Database direct | Get shipping address | Order creation |

**Key Flows:**
```
User Creates Order
  ↓
Order Service creates order
  ↓
Order Service → Payment Service (create payment)
  ↓
Order Service → Notification Service (order created notification)
```

---

### **2. PAYMENT SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **Notification** | `POST /api/notifications` | Notify payment success/failure | Payment confirmed/failed |
| **Order** | Database direct | Update order status to 'paid' | Webhook received |

**Key Flows:**
```
Xendit Webhook (payment confirmed)
  ↓
Payment Service marks payment as paid
  ↓
Payment Service → Order Service (update order.status = 'paid')
  ↓
Payment Service → Notification Service (payment success)
```

**Escrow Flow:**
```
Group buying MOQ reached
  ↓
Group Buying → Payment Service (POST /api/payments/release-escrow)
  ↓
Payment Service releases escrow funds
```

---

### **3. GROUP BUYING SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **Warehouse** | `POST /api/warehouse/fulfill-demand` | Check stock & reserve inventory | MOQ reached |
| **Order** | `POST /api/orders/bulk` | Create orders for all participants | Stock available |
| **Payment** | `POST /api/payments/escrow` | Create escrow payment | User joins group |
| **Payment** | `POST /api/payments/release-escrow` | Release escrow | MOQ reached & orders created |
| **Payment** | `POST /api/payments/refund-session` | Refund all participants | Group failed |

**Key Flows:**

**Successful Group Buying:**
```
MOQ Reached
  ↓
Group Buying → Warehouse (fulfill-demand)
  ↓
Warehouse checks stock
  ├─ Has stock → Reserve inventory
  └─ No stock → Create PO + WhatsApp factory
  ↓
If stock available:
  ↓
Group Buying → Order Service (create bulk orders)
  ↓
Group Buying → Payment Service (release escrow)
```

**Failed Group Buying:**
```
Session Expires (MOQ not reached)
  ↓
Group Buying → Payment Service (refund-session)
  ↓
Payment Service refunds all participants
```

---

### **4. WAREHOUSE SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **WhatsApp** | `POST /api/whatsapp/send` | Notify factory to send stock | Inventory insufficient |
| **Logistics** | `POST /api/rates` | Calculate shipping cost | Creating purchase order |
| **Factory** | Database direct | Get factory details | Creating purchase order |

**Key Flows:**
```
Group Buying calls /fulfill-demand
  ↓
Warehouse checks inventory
  ↓
If insufficient:
  ↓
Warehouse → Logistics (get shipping rates)
  ↓
Warehouse creates purchase order
  ↓
Warehouse → WhatsApp Service (notify factory)
```

---

### **5. LOGISTICS SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **Order** | `PATCH /api/orders/:id/status` | Update order shipping status | Tracking update |
| **Notification** | `POST /api/notifications` | Notify shipment status | Picked up, delivered, etc. |
| **Address** | Database direct | Get shipping addresses | Creating shipment |

**Key Flows:**
```
Biteship Webhook (shipment update)
  ↓
Logistics Service updates tracking
  ↓
Logistics → Order Service (update order status)
  ↓
Logistics → Notification Service (notify user)
```

---

### **6. AUTH SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| **WhatsApp** | `POST /api/whatsapp/send` | Send OTP via WhatsApp | User login/register |
| **User** | Database direct | Create/update user | Registration |

**Key Flows:**
```
User requests OTP
  ↓
Auth Service generates OTP
  ↓
Auth Service → WhatsApp Service (send OTP)
```

---

### **7. NOTIFICATION SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| None | - | Receives calls from others | - |

**Note:** Notification Service is a **SINK** - it receives calls but doesn't call other services.

**Services that call Notification:**
- Order Service (order updates)
- Payment Service (payment status)
- Logistics Service (shipment updates)
- Group Buying Service (group status)

---

### **8. WHATSAPP SERVICE → Other Services**

| Calls Service | Endpoint | Purpose | When |
|---------------|----------|---------|------|
| None | - | Receives calls from others | - |

**Note:** WhatsApp Service is a **SINK** - it receives calls but doesn't call other services.

**Services that call WhatsApp:**
- Auth Service (OTP)
- Warehouse Service (factory notifications)

---

## 🔐 Service Dependency Matrix

| Service ↓ Calls → | Payment | Order | Warehouse | WhatsApp | Notification | Logistics | Product |
|-------------------|---------|-------|-----------|----------|--------------|-----------|---------|
| **Order** | ✅ | - | - | - | ✅ | - | 📊 |
| **Payment** | - | 📊 | - | - | ✅ | - | - |
| **Group Buying** | ✅ | ✅ | ✅ | - | - | - | 📊 |
| **Warehouse** | - | - | - | ✅ | - | ✅ | 📊 |
| **Logistics** | - | ✅ | - | - | ✅ | - | - |
| **Auth** | - | - | - | ✅ | - | - | - |

**Legend:**
- ✅ = HTTP API Call
- 📊 = Database Direct Access (shared database)

---

## 🎯 Critical Service Paths

### **Path 1: Regular Order Flow**

```
1. Frontend → Order Service
   POST /api/orders

2. Order Service → Payment Service
   POST /api/payments

3. User Pays (Xendit)

4. Xendit → Payment Service
   POST /api/webhooks/xendit

5. Payment Service → Order Service (DB)
   UPDATE orders SET status='paid'

6. Payment Service → Notification Service
   POST /api/notifications

7. Order Service → Logistics Service
   POST /api/shipments
```

---

### **Path 2: Group Buying Flow (Success)**

```
1. Frontend → Group Buying Service
   POST /api/group-sessions/:id/join

2. Group Buying → Payment Service
   POST /api/payments/escrow

3. Users Pay (Escrow held)

4. MOQ Reached (Cron job)

5. Group Buying → Warehouse Service
   POST /api/warehouse/fulfill-demand

6. Warehouse → WhatsApp Service (if no stock)
   POST /api/whatsapp/send

7. Group Buying → Order Service
   POST /api/orders/bulk

8. Group Buying → Payment Service
   POST /api/payments/release-escrow

9. Escrow Released → Factory can be paid
```

---

### **Path 3: Group Buying Flow (Failed)**

```
1. Session Expires (MOQ not reached)

2. Group Buying → Payment Service
   POST /api/payments/refund-session

3. Payment Service processes refunds

4. Payment Service → Notification Service
   POST /api/notifications (refund notifications)
```

---

### **Path 4: Shipment Tracking**

```
1. Biteship Webhook → Logistics Service
   POST /api/webhooks/biteship

2. Logistics Service → Order Service (DB)
   UPDATE orders SET tracking info

3. Logistics Service → Notification Service
   POST /api/notifications
```

---

## 📋 Environment Variables Required

### **Per Service Configuration**

#### **Order Service**
```bash
PAYMENT_SERVICE_URL=http://localhost:3006
NOTIFICATION_SERVICE_URL=http://localhost:3013
```

#### **Payment Service**
```bash
NOTIFICATION_SERVICE_URL=http://localhost:3013
```

#### **Group Buying Service**
```bash
WAREHOUSE_SERVICE_URL=http://localhost:3011
ORDER_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
```

#### **Warehouse Service**
```bash
WHATSAPP_SERVICE_URL=http://localhost:3012
LOGISTICS_SERVICE_URL=http://localhost:3008
WAREHOUSE_ADDRESS="Warehouse physical address"
```

#### **Logistics Service**
```bash
ORDER_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3013
```

#### **Auth Service**
```bash
WHATSAPP_SERVICE_URL=http://localhost:3012
```

---

## 🚨 Critical Dependencies

### **Services That Cannot Function Alone**

1. **Order Service** → Depends on Payment & Notification
2. **Group Buying Service** → Depends on Warehouse, Order, Payment
3. **Warehouse Service** → Depends on WhatsApp, Logistics
4. **Payment Service** → Depends on Notification
5. **Logistics Service** → Depends on Order, Notification

### **Services That Are Self-Contained**

1. **Product Service** - Standalone
2. **User Service** - Standalone
3. **Factory Service** - Standalone
4. **Address Service** - Standalone
5. **Review Service** - Standalone

### **Sink Services (Receive Only)**

1. **Notification Service** - Called by 5+ services
2. **WhatsApp Service** - Called by 2+ services

---

## 🔄 Circular Dependencies (NONE)

✅ **Good News:** The architecture has **NO circular dependencies**!

The call graph is acyclic:
```
Order → Payment → Notification
  ↓
Logistics → Notification

Group Buying → Warehouse → WhatsApp
             ↓
             Order → Payment

Auth → WhatsApp
```

---

## 🎯 Service Roles

### **Orchestrators** (Make multiple service calls)
- Group Buying Service (calls 4 services)
- Order Service (calls 2 services)
- Warehouse Service (calls 2 services)

### **Workers** (Do one thing well)
- Payment Service (payments only)
- Logistics Service (shipping only)
- Auth Service (authentication only)

### **Utilities** (Called by everyone)
- Notification Service (notifications)
- WhatsApp Service (messaging)

### **Data Services** (Database CRUD only)
- Product Service
- User Service
- Factory Service
- Address Service
- Review Service

---

## 🔧 Failure Modes & Resilience

### **What Happens If A Service Is Down?**

| Service Down | Impact | Mitigation |
|--------------|--------|------------|
| **Notification** | Orders work, users don't get notified | Graceful degradation (logs error, continues) |
| **WhatsApp** | OTP fails, factory notifications fail | Fallback to email/SMS for OTP |
| **Payment** | Orders can't be paid | Critical - must be up |
| **Warehouse** | Group buying can't check stock | Falls back to creating orders anyway |
| **Order** | Orders can't be created | Critical - must be up |
| **Logistics** | Shipping doesn't update | Manual intervention needed |

### **Retry Logic**

Services with retry implemented:
- ✅ Payment Service → Notification (retry on failure)
- ✅ Group Buying → Warehouse (retry on failure)
- ✅ Warehouse → WhatsApp (graceful failure)
- ✅ Logistics → Notification (graceful failure)

---

## 📊 Database Access Patterns

### **Direct Database Access** (Shared DB)

Most services access the shared PostgreSQL database directly:
- All services read from `products`, `users`, `factories`
- Order Service writes to `orders`, `order_items`
- Payment Service writes to `payments`, `refunds`
- Group Buying writes to `group_buying_sessions`, `group_participants`
- Warehouse writes to `warehouse_inventory`, `warehouse_purchase_orders`

### **Why Not All Service-to-Service Calls?**

For **read-heavy** operations (product details, user info), direct database access is faster than HTTP calls.

For **write operations** or **business logic**, services call each other via HTTP API.

---

## 🎓 Key Architectural Patterns

1. **Event-Driven (Webhooks)**
   - Xendit → Payment Service
   - Biteship → Logistics Service

2. **Request-Response (Synchronous)**
   - Order → Payment
   - Group Buying → Warehouse

3. **Fire-and-Forget (Notifications)**
   - Any Service → Notification Service
   - Any Service → WhatsApp Service

4. **Database as Integration Layer**
   - Shared PostgreSQL database
   - Services read directly, call APIs for writes

---

## 📈 Communication Frequency

**Most Called Services:**
1. Notification Service (called by 5+ services)
2. Payment Service (called by 3+ services)
3. WhatsApp Service (called by 2+ services)

**Services That Call Others Most:**
1. Group Buying Service (calls 4 services)
2. Order Service (calls 2 services)
3. Warehouse Service (calls 2 services)

---

## ✅ Summary

### **Total Service Interactions:**
- **15 Services** total
- **12 Service-to-Service HTTP Calls** (distinct call paths)
- **0 Circular Dependencies**
- **2 Sink Services** (Notification, WhatsApp)
- **3 Orchestrator Services** (Group Buying, Order, Warehouse)

### **Communication Methods:**
- ✅ HTTP REST APIs (primary)
- ✅ Shared PostgreSQL Database (for reads)
- ✅ Webhook Callbacks (Xendit, Biteship)

### **Critical Paths:**
1. Regular Order: Order → Payment → Notification
2. Group Buying Success: Group Buying → Warehouse → Order → Payment
3. Group Buying Fail: Group Buying → Payment (refund)
4. Shipping: Logistics → Order → Notification

---

**Last Updated:** 2025-11-03
**Architecture Version:** 1.0
**Total Microservices:** 15
