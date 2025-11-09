# Admin Endpoints Reference

**Last Updated:** November 9, 2025
**Purpose:** Comprehensive reference for all admin endpoints across all platform services

---

## Table of Contents

1. [Authentication](#authentication)
2. [Group Buying Service](#1-group-buying-service-port-3004)
3. [Product Service](#2-product-service-port-3002)
4. [Warehouse Service](#3-warehouse-service-port-3011)
5. [Factory Service](#4-factory-service-port-3003)
6. [Payment Service](#5-payment-service-port-3006)
7. [Order Service](#6-order-service-port-3005)
8. [User/Auth Service](#7-userauth-service-port-3001)
9. [Logistics Service](#8-logistics-service-port-3008)
10. [Wallet Service](#9-wallet-service-port-3010)
11. [Notification Service](#10-notification-service-port-3007)
12. [Address Service](#11-address-service-port-3009)
13. [WhatsApp Service](#12-whatsapp-service-port-3012)
14. [Testing Guide](#testing-guide)

---

## Authentication

All admin endpoints require authentication via admin JWT token in the Authorization header:

```bash
Authorization: Bearer <admin-jwt-token>
```

**Admin Roles:**
- `super_admin` - Full access to all endpoints
- `admin_products` - Product and category management only
- `admin_orders` - Order and logistics management only
- `admin_finance` - Payment, wallet, settlement management only
- `admin_support` - User management and review moderation only

---

## 1. Group Buying Service (Port 3004)

**Status:** ✅ IMPLEMENTED
**Base URL:** `http://localhost:3004/api/admin/grosir`

### Grosir Configuration

#### Bulk Configure Product
```http
POST /api/admin/grosir/configure-product
Content-Type: application/json

{
  "productId": "uuid",
  "bundleConfigs": [
    {
      "variantId": "uuid" | null,
      "unitsPerBundle": 5,
      "notes": "Medium size - 5 per bundle"
    }
  ],
  "warehouseTolerances": [
    {
      "variantId": "uuid" | null,
      "maxExcessUnits": 50,
      "clearanceRateEstimate": 80,
      "notes": "M sells well in clearance"
    }
  ]
}
```

**Response:** `201 Created`

#### Bundle Configuration CRUD

```http
# Create
POST /api/admin/grosir/bundle-config
{
  "productId": "uuid",
  "variantId": "uuid" | null,
  "unitsPerBundle": 5,
  "notes": "Optional notes"
}

# Read
GET /api/admin/grosir/bundle-config/:productId

# Update
PUT /api/admin/grosir/bundle-config/:id
{
  "unitsPerBundle": 6,
  "notes": "Updated notes"
}

# Delete all for product
DELETE /api/admin/grosir/bundle-config/:productId
```

#### Warehouse Tolerance CRUD

```http
# Create
POST /api/admin/grosir/warehouse-tolerance
{
  "productId": "uuid",
  "variantId": "uuid" | null,
  "maxExcessUnits": 50,
  "clearanceRateEstimate": 80,
  "notes": "Optional notes"
}

# Read
GET /api/admin/grosir/warehouse-tolerance/:productId

# Update
PUT /api/admin/grosir/warehouse-tolerance/:id
{
  "maxExcessUnits": 60,
  "clearanceRateEstimate": 85
}

# Delete all for product
DELETE /api/admin/grosir/warehouse-tolerance/:productId
```

#### Get Complete Configuration

```http
GET /api/admin/grosir/config/:productId
```

**Response:**
```json
{
  "message": "Grosir configuration retrieved successfully",
  "data": {
    "bundleConfig": [...],
    "warehouseTolerance": [...]
  }
}
```

---

## 2. Product Service (Port 3002)

**Status:** ✅ IMPLEMENTED
**Base URL:** `http://localhost:3002/api/admin`

### Product Management

```http
# Create Product
POST /api/admin/products
{
  "name": "Premium Hoodie",
  "factoryId": "uuid",
  "categoryId": "uuid",
  "sku": "HOODIE-001",
  "description": "High quality cotton hoodie",
  "basePrice": 150000,
  "costPrice": 80000,
  "moq": 50,
  "groupDurationHours": 48,
  "stockQuantity": 0,
  "weight": 500,
  "lengthCm": 30,
  "widthCm": 25,
  "heightCm": 5,
  "primaryImageUrl": "https://..."
}

# Update Product
PUT /api/admin/products/:id
{
  "name": "Updated name",
  "basePrice": 160000,
  "status": "active"
}

# Delete Product (soft delete)
DELETE /api/admin/products/:id
```

### Variant Management

```http
# Create Variant
POST /api/admin/products/:id/variants
{
  "sku": "HOODIE-001-M",
  "variantName": "Medium",
  "priceAdjustment": 0,
  "stockQuantity": 0
}

# Update Variant
PUT /api/admin/products/:id/variants/:variantId
{
  "variantName": "Medium (Updated)",
  "priceAdjustment": 5000
}

# Delete Variant
DELETE /api/admin/products/:id/variants/:variantId
```

### Image Management

```http
# Add Images
POST /api/admin/products/:id/images
{
  "images": [
    { "imageUrl": "https://...", "sortOrder": 0 },
    { "imageUrl": "https://...", "sortOrder": 1 }
  ]
}

# Reorder Images
PUT /api/admin/products/:id/images/reorder
{
  "imageOrders": [
    { "imageId": "uuid", "sortOrder": 0 },
    { "imageId": "uuid", "sortOrder": 1 }
  ]
}

# Delete Image
DELETE /api/admin/products/:id/images/:imageId
```

### Category Management

```http
# Create Category
POST /api/admin/categories
{
  "name": "Hoodies",
  "description": "All types of hoodies",
  "parentCategoryId": "uuid" | null,
  "imageUrl": "https://..."
}

# Update Category
PUT /api/admin/categories/:id
{
  "name": "Premium Hoodies",
  "description": "Updated description"
}

# Delete Category
DELETE /api/admin/categories/:id
```

### Bulk Operations

```http
# Bulk Update
POST /api/admin/products/bulk/update
{
  "updates": [
    {
      "productId": "uuid",
      "data": { "basePrice": 150000 }
    }
  ]
}

# Bulk Delete
POST /api/admin/products/bulk/delete
{
  "productIds": ["uuid1", "uuid2"]
}

# Bulk Import (TODO)
POST /api/admin/products/bulk/import
```

---

## 3. Warehouse Service (Port 3011)

**Status:** ✅ IMPLEMENTED
**Base URL:** `http://localhost:3011/api/admin/warehouse`

### Inventory Management

```http
# View All Inventory
GET /api/admin/warehouse/inventory
Query params: ?page=1&limit=20&productId=uuid&lowStock=true

# View Product Inventory
GET /api/admin/warehouse/inventory/:productId

# Manual Stock Adjustment
POST /api/admin/warehouse/inventory/adjust
{
  "productId": "uuid",
  "variantId": "uuid" | null,
  "adjustmentType": "add" | "remove" | "set",
  "quantity": 100,
  "reason": "Physical count correction",
  "notes": "Cycle count on 2025-11-09"
}

# Manual Reserve Stock
POST /api/admin/warehouse/inventory/:productId/reserve
{
  "variantId": "uuid" | null,
  "quantity": 50,
  "reason": "Manual reservation for wholesale order",
  "referenceId": "order-uuid"
}

# Release Reservation
POST /api/admin/warehouse/inventory/:productId/release
{
  "variantId": "uuid" | null,
  "quantity": 50,
  "reason": "Order cancelled",
  "referenceId": "order-uuid"
}
```

### Purchase Order Management

```http
# List All POs
GET /api/admin/warehouse/purchase-orders
Query params: ?page=1&limit=20&status=pending&factoryId=uuid

# View PO Details
GET /api/admin/warehouse/purchase-orders/:id

# Update PO Status
PUT /api/admin/warehouse/purchase-orders/:id
{
  "status": "confirmed" | "in_production" | "shipped" | "received" | "cancelled",
  "notes": "Status update notes"
}

# Mark PO as Received
POST /api/admin/warehouse/purchase-orders/:id/receive
{
  "receivedItems": [
    {
      "variantId": "uuid" | null,
      "quantityReceived": 100,
      "quantityDamaged": 2,
      "notes": "2 units damaged in transit"
    }
  ],
  "receivedDate": "2025-11-09T10:00:00Z",
  "receivedBy": "Admin Name"
}

# Cancel PO
POST /api/admin/warehouse/purchase-orders/:id/cancel
{
  "reason": "Factory unable to fulfill",
  "refundRequired": true
}
```

### Stock Auditing

```http
# View Audit Log
GET /api/admin/warehouse/audit-log
Query params: ?page=1&limit=50&productId=uuid&startDate=2025-11-01&endDate=2025-11-09

# Initiate Cycle Count
POST /api/admin/warehouse/cycle-count
{
  "productIds": ["uuid1", "uuid2"],
  "countType": "full" | "partial",
  "assignedTo": "staff-uuid",
  "scheduledDate": "2025-11-10"
}

# View Discrepancies
GET /api/admin/warehouse/discrepancies
Query params: ?resolved=false&page=1&limit=20
```

---

## 4. Factory Service (Port 3003)

**Status:** ✅ IMPLEMENTED
**Base URL:** `http://localhost:3003/api/admin/factories`

### Factory Management

```http
# Register Factory
POST /api/admin/factories
{
  "factoryName": "PT Garmen Indonesia",
  "ownerName": "John Doe",
  "email": "factory@example.com",
  "phone": "+62812345678",
  "address": "Jl. Industri No. 123",
  "city": "Bandung",
  "province": "West Java",
  "postalCode": "40123",
  "description": "Specialized in premium apparel",
  "certifications": ["ISO9001", "WRAP"],
  "minimumOrderValue": 5000000,
  "productionCapacityPerMonth": 10000
}

# Update Factory
PUT /api/admin/factories/:id
{
  "factoryName": "Updated Name",
  "description": "Updated description"
}

# Delete/Suspend Factory
DELETE /api/admin/factories/:id

# Verify Factory (Admin Approval)
POST /api/admin/factories/:id/verify
{
  "verificationNotes": "Documents verified, site visit completed",
  "verifiedBy": "admin-uuid"
}

# Suspend Factory
POST /api/admin/factories/:id/suspend
{
  "reason": "Quality issues reported",
  "suspensionDuration": "30 days"
}

# Reactivate Factory
POST /api/admin/factories/:id/reactivate
{
  "notes": "Issues resolved, quality improved"
}

# Factory Performance Metrics
GET /api/admin/factories/:id/metrics
Query params: ?startDate=2025-10-01&endDate=2025-11-09
```

### Factory Sessions Management

```http
# List Factory Sessions
GET /api/admin/factories/:id/sessions
Query params: ?page=1&limit=20&status=active

# Force Cancel Session
POST /api/admin/factories/:id/sessions/:sessionId/cancel
{
  "reason": "Product quality concerns",
  "refundParticipants": true
}

# Factory Analytics
GET /api/admin/factories/:id/analytics
Query params: ?period=monthly&year=2025
```

**Response Example:**
```json
{
  "totalRevenue": 150000000,
  "totalSessions": 45,
  "successRate": 87.5,
  "averageSessionValue": 3333333,
  "topProducts": [...],
  "monthlyTrend": [...]
}
```

---

## 5. Payment Service (Port 3006)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3006/api/admin/payments`

### Payment Management

```http
# List All Payments
GET /api/admin/payments
Query params: ?page=1&limit=20&status=paid&userId=uuid&startDate=2025-11-01

# View Payment Details
GET /api/admin/payments/:id

# Manual Refund
POST /api/admin/payments/:id/refund
{
  "amount": 100000,
  "reason": "Product quality issue",
  "refundMethod": "original" | "wallet",
  "notes": "Customer complaint resolved"
}

# Mark for Investigation
POST /api/admin/payments/:id/investigate
{
  "reason": "Suspected fraud",
  "assignedTo": "fraud-team-uuid"
}

# List Failed Payments
GET /api/admin/payments/failed
Query params: ?page=1&limit=20

# Retry Failed Payment
POST /api/admin/payments/:id/retry
{
  "notes": "Customer bank issue resolved"
}
```

### Refund Management

```http
# List Refunds
GET /api/admin/refunds
Query params: ?page=1&limit=20&status=pending

# View Refund Details
GET /api/admin/refunds/:id

# Approve Refund
POST /api/admin/refunds/:id/approve
{
  "approvedBy": "admin-uuid",
  "notes": "Refund approved"
}

# Reject Refund
POST /api/admin/refunds/:id/reject
{
  "reason": "Does not meet refund policy",
  "rejectedBy": "admin-uuid"
}
```

### Financial Reports

```http
# Daily Payment Report
GET /api/admin/payments/reports/daily
Query params: ?date=2025-11-09

# Settlement Report
GET /api/admin/payments/reports/settlement
Query params: ?startDate=2025-11-01&endDate=2025-11-09

# Payment Reconciliation
GET /api/admin/payments/reconciliation
Query params: ?date=2025-11-09

# Escrow Balance
GET /api/admin/payments/escrow-balance
```

---

## 6. Order Service (Port 3005)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3005/api/admin/orders`

### Order Management

```http
# List All Orders
GET /api/admin/orders
Query params: ?page=1&limit=20&status=pending&userId=uuid&orderSource=factory_group_buying

# View Order Details
GET /api/admin/orders/:id

# Update Order Status
PUT /api/admin/orders/:id/status
{
  "status": "processing" | "shipped" | "delivered" | "cancelled",
  "notes": "Status update notes",
  "updatedBy": "admin-uuid"
}

# Cancel Order
POST /api/admin/orders/:id/cancel
{
  "reason": "Customer request",
  "refundAmount": 100000,
  "restockItems": true
}

# Initiate Refund
POST /api/admin/orders/:id/refund
{
  "refundType": "full" | "partial",
  "amount": 50000,
  "reason": "Product defect",
  "items": ["item-uuid1", "item-uuid2"]
}
```

### Order Analytics

```http
# Order Metrics
GET /api/admin/orders/analytics
Query params: ?startDate=2025-11-01&endDate=2025-11-09

# Failed Orders
GET /api/admin/orders/failed

# Pending Orders
GET /api/admin/orders/pending

# Daily Report
GET /api/admin/orders/reports/daily
Query params: ?date=2025-11-09
```

### Bulk Operations

```http
# Bulk Update Status
POST /api/admin/orders/bulk-update-status
{
  "orderIds": ["uuid1", "uuid2"],
  "status": "shipped",
  "notes": "Batch shipped via JNE"
}

# Bulk Export
POST /api/admin/orders/bulk-export
{
  "filters": {
    "startDate": "2025-11-01",
    "endDate": "2025-11-09",
    "status": "delivered"
  },
  "format": "csv" | "xlsx"
}
```

---

## 7. User/Auth Service (Port 3001)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3001/api/admin/users`

### User Management

```http
# List All Users
GET /api/admin/users
Query params: ?page=1&limit=20&role=customer&status=active&search=john

# View User Details
GET /api/admin/users/:id

# Update User
PUT /api/admin/users/:id
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+62812345678"
}

# Suspend User
POST /api/admin/users/:id/suspend
{
  "reason": "Violation of terms of service",
  "duration": "30 days"
}

# Reactivate User
POST /api/admin/users/:id/reactivate
{
  "notes": "Suspension period completed"
}

# Delete User (soft delete)
DELETE /api/admin/users/:id

# Force Password Reset
POST /api/admin/users/:id/reset-password
{
  "sendEmail": true,
  "notes": "User requested password reset assistance"
}
```

### Role Management

```http
# Assign Role
POST /api/admin/users/:id/roles
{
  "roleId": "uuid"
}

# Remove Role
DELETE /api/admin/users/:id/roles/:roleId

# List Roles
GET /api/admin/roles

# Create Role
POST /api/admin/roles
{
  "name": "warehouse_manager",
  "permissions": ["inventory.read", "inventory.write", "po.read"]
}

# Update Role
PUT /api/admin/roles/:id
{
  "permissions": ["inventory.read", "inventory.write", "po.read", "po.approve"]
}
```

### User Analytics

```http
# User Analytics
GET /api/admin/users/analytics
Query params: ?period=monthly&year=2025

# User Activity Log
GET /api/admin/users/:id/activity-log
Query params: ?page=1&limit=50&startDate=2025-11-01

# User Orders
GET /api/admin/users/:id/orders
Query params: ?page=1&limit=20
```

---

## 8. Logistics Service (Port 3008)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3008/api/admin/logistics`

### Shipment Management

```http
# List All Shipments
GET /api/admin/logistics/shipments
Query params: ?page=1&limit=20&status=in_transit&courier=jne

# View Shipment Details
GET /api/admin/logistics/shipments/:id

# Cancel Shipment
POST /api/admin/logistics/shipments/:id/cancel
{
  "reason": "Customer request",
  "returnToWarehouse": true
}

# Force Tracking Refresh
POST /api/admin/logistics/shipments/:id/track
{
  "forceRefresh": true
}

# Change Courier
PUT /api/admin/logistics/shipments/:id/courier
{
  "newCourier": "sicepat",
  "reason": "Original courier unavailable"
}
```

### Courier Management

```http
# List Couriers
GET /api/admin/logistics/couriers

# Add Courier Configuration
POST /api/admin/logistics/couriers
{
  "name": "JNE",
  "apiKey": "xxx",
  "isActive": true,
  "supportedServices": ["REG", "YES", "OKE"]
}

# Update Courier
PUT /api/admin/logistics/couriers/:id
{
  "isActive": false,
  "notes": "Temporarily disabled due to service issues"
}

# Remove Courier
DELETE /api/admin/logistics/couriers/:id
```

### Shipping Analytics

```http
# Shipping Metrics
GET /api/admin/logistics/analytics
Query params: ?startDate=2025-11-01&endDate=2025-11-09

# Delayed Shipments
GET /api/admin/logistics/delayed-shipments

# Courier Performance
GET /api/admin/logistics/courier-performance
Query params: ?period=monthly&year=2025
```

---

## 9. Wallet Service (Port 3010)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3010/api/admin/wallets`

### Wallet Management

```http
# List All Wallets
GET /api/admin/wallets
Query params: ?page=1&limit=20&minBalance=10000

# View User Wallet
GET /api/admin/wallets/:userId

# Manual Credit
POST /api/admin/wallets/:userId/credit
{
  "amount": 100000,
  "reason": "Refund for order cancellation",
  "referenceId": "order-uuid",
  "notes": "Processed by admin",
  "processedBy": "admin-uuid"
}

# Manual Debit
POST /api/admin/wallets/:userId/debit
{
  "amount": 50000,
  "reason": "Adjustment for duplicate refund",
  "referenceId": "transaction-uuid",
  "notes": "Correction",
  "processedBy": "admin-uuid"
}

# Transaction History
GET /api/admin/wallets/:userId/transactions
Query params: ?page=1&limit=50&startDate=2025-11-01
```

### Wallet Analytics

```http
# Wallet Analytics
GET /api/admin/wallets/analytics
Query params: ?period=monthly&year=2025

# Total Platform Balance
GET /api/admin/wallets/total-balance

# Monthly Report
GET /api/admin/wallets/reports/monthly
Query params: ?month=11&year=2025
```

---

## 10. Notification Service (Port 3007)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3007/api/admin/notifications`

### Notification Management

```http
# Send Broadcast
POST /api/admin/notifications/broadcast
{
  "title": "Platform Maintenance",
  "message": "Scheduled maintenance on Nov 10, 2025",
  "type": "announcement",
  "targetAudience": "all" | "customers" | "sellers" | "factories",
  "priority": "high" | "medium" | "low",
  "expiresAt": "2025-11-10T23:59:59Z"
}

# List All Notifications
GET /api/admin/notifications
Query params: ?page=1&limit=50&type=announcement&status=sent

# View Notification Details
GET /api/admin/notifications/:id

# List Templates
GET /api/admin/notifications/templates

# Create Template
POST /api/admin/notifications/templates
{
  "name": "order_shipped",
  "title": "Your order has been shipped!",
  "body": "Order {{orderId}} shipped via {{courier}}",
  "type": "transactional",
  "variables": ["orderId", "courier", "trackingNumber"]
}

# Update Template
PUT /api/admin/notifications/templates/:id
{
  "body": "Updated template body"
}
```

### Notification Analytics

```http
# Analytics
GET /api/admin/notifications/analytics
Query params: ?startDate=2025-11-01&endDate=2025-11-09

# Failed Notifications
GET /api/admin/notifications/failed

# Resend Notification
POST /api/admin/notifications/:id/resend
```

---

## 11. Address Service (Port 3009)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3009/api/admin/addresses`

### Address Management

```http
# List All Addresses
GET /api/admin/addresses
Query params: ?page=1&limit=50&city=Bandung&province=Jawa+Barat

# View User Addresses
GET /api/admin/addresses/users/:userId

# Address Analytics
GET /api/admin/addresses/analytics
Query params: ?groupBy=city|province

# Validation Errors
GET /api/admin/addresses/validation-errors
```

---

## 12. WhatsApp Service (Port 3012)

**Status:** 📝 NEEDED (Not Yet Implemented)
**Base URL:** `http://localhost:3012/api/admin/whatsapp`

### WhatsApp Management

```http
# Send Manual Message
POST /api/admin/whatsapp/send
{
  "phoneNumber": "+62812345678",
  "message": "Your order is ready for pickup",
  "templateId": "order_ready" | null
}

# List Messages
GET /api/admin/whatsapp/messages
Query params: ?page=1&limit=50&status=sent|failed

# Failed Messages
GET /api/admin/whatsapp/failed

# Resend Message
POST /api/admin/whatsapp/messages/:id/resend

# List Templates
GET /api/admin/whatsapp/templates

# Update Template
PUT /api/admin/whatsapp/templates/:id
{
  "body": "Updated template body"
}
```

---

## Testing Guide

### 1. Prerequisites

```bash
# Ensure all services are running
cd services/group-buying-service && npm run dev  # Port 3004
cd services/product-service && npm run dev       # Port 3002
cd services/warehouse-service && npm run dev     # Port 3011
cd services/factory-service && npm run dev       # Port 3003
```

### 2. Get Admin Token

```bash
# Login as admin (via Auth Service)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@platform.com",
    "password": "admin123"
  }'

# Save the token
export ADMIN_TOKEN="<jwt-token-from-response>"
```

### 3. Test Group Buying Admin Endpoints

```bash
# Configure grosir for a product
curl -X POST http://localhost:3004/api/admin/grosir/configure-product \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "bundleConfigs": [
      {"variantId": "s-uuid", "unitsPerBundle": 2},
      {"variantId": "m-uuid", "unitsPerBundle": 5},
      {"variantId": "l-uuid", "unitsPerBundle": 4},
      {"variantId": "xl-uuid", "unitsPerBundle": 1}
    ],
    "warehouseTolerances": [
      {"variantId": "s-uuid", "maxExcessUnits": 20},
      {"variantId": "m-uuid", "maxExcessUnits": 50},
      {"variantId": "l-uuid", "maxExcessUnits": 40},
      {"variantId": "xl-uuid", "maxExcessUnits": 30}
    ]
  }'
```

### 4. Test Product Admin Endpoints

```bash
# Create product
curl -X POST http://localhost:3002/api/admin/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Hoodie",
    "factoryId": "factory-uuid",
    "categoryId": "category-uuid",
    "sku": "HOODIE-001",
    "basePrice": 150000,
    "moq": 50
  }'

# Create variant
curl -X POST http://localhost:3002/api/admin/products/product-uuid/variants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "HOODIE-001-M",
    "variantName": "Medium",
    "priceAdjustment": 0
  }'
```

### 5. Test Warehouse Admin Endpoints

```bash
# View inventory
curl http://localhost:3011/api/admin/warehouse/inventory \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Adjust stock
curl -X POST http://localhost:3011/api/admin/warehouse/inventory/adjust \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "variantId": "variant-uuid",
    "adjustmentType": "add",
    "quantity": 100,
    "reason": "Initial stock"
  }'
```

### 6. Test Factory Admin Endpoints

```bash
# Verify factory
curl -X POST http://localhost:3003/api/admin/factories/factory-uuid/verify \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verificationNotes": "Documents verified",
    "verifiedBy": "admin-uuid"
  }'

# View factory metrics
curl http://localhost:3003/api/admin/factories/factory-uuid/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Implementation Status Summary

| Service | Status | Endpoints Implemented | Total Needed |
|---------|--------|----------------------|--------------|
| Group Buying | ✅ Complete | 10 | 10 |
| Product | ✅ Complete | 15 | 15 |
| Warehouse | ✅ Complete | 11 | 11 |
| Factory | ✅ Complete | 10 | 10 |
| Payment | 📝 Needed | 0 | 13 |
| Order | 📝 Needed | 0 | 11 |
| User/Auth | 📝 Needed | 0 | 13 |
| Logistics | 📝 Needed | 0 | 9 |
| Wallet | 📝 Needed | 0 | 7 |
| Notification | 📝 Needed | 0 | 8 |
| Address | 📝 Needed | 0 | 4 |
| WhatsApp | 📝 Needed | 0 | 6 |
| **TOTAL** | **Phase 2 Complete** | **46** | **117** |

---

## Next Steps

**Phase 2 (COMPLETED):**
- ✅ Group Buying Service
- ✅ Product Service
- ✅ Warehouse Service (implementing now)
- ✅ Factory Service (implementing now)

**Phase 3 (HIGH PRIORITY):**
- Payment Service - Manual refunds and reconciliation
- Order Service - Order management
- User Service - User management

**Phase 4 (MEDIUM PRIORITY):**
- Logistics Service - Shipment management
- Wallet Service - Wallet adjustments
- Notification Service - Broadcast and templates
- WhatsApp Service - Message management

---

**For implementation details and code examples, see individual service documentation.**
