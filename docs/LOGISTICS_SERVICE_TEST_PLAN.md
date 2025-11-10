# Logistics Service - Test Plan

**Service:** Logistics Service (Biteship Integration)
**Port:** 3008
**Swagger URL:** http://localhost:3008/api-docs
**Created:** 2025-11-10

---

## Purpose

This test plan verifies all critical bug fixes and functionality in the Logistics Service:
- ✅ Public routes now registered (were returning 404)
- ✅ CORS enabled
- ✅ Webhook signature verification implemented
- ✅ SQL injection vulnerability fixed
- ✅ Invalid Prisma relation removed
- ✅ Missing dependencies added

---

## Prerequisites

### 1. Services Running

```bash
# Start Logistics Service
cd services/logistics-service && npm run dev

# Should see:
# 🚚 Logistics Service running on http://localhost:3008
```

### 2. Environment Variables

Create `.env` in `services/logistics-service/`:

```bash
# Required
PORT=3008
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# Biteship API Configuration
BITESHIP_API_KEY=your-biteship-api-key-here
BITESHIP_BASE_URL=https://api.biteship.com/v1
BITESHIP_ENV=production

# Webhook Security (IMPORTANT!)
BITESHIP_WEBHOOK_SECRET=your-webhook-secret-here

# Optional
CORS_ORIGIN=*
```

### 3. Get Biteship API Key

**Staging/Development:**
1. Sign up at https://biteship.com
2. Go to Dashboard → Settings → API Keys
3. Copy your API key
4. Use **test mode** for testing

**Important:** Biteship provides test credentials for development. Real shipments require production API key.

### 4. Get Test Data from Database

```sql
-- Get an order UUID
SELECT id, order_number, user_id, total_amount
FROM orders
WHERE status = 'paid'
LIMIT 1;

-- Get order items for weight/dimensions calculation
SELECT
    oi.id,
    oi.order_id,
    oi.quantity,
    p.name,
    pv.weight_grams,
    pv.length_cm,
    pv.width_cm,
    pv.height_cm
FROM order_items oi
JOIN products p ON oi.product_id = p.id
LEFT JOIN product_variants pv ON oi.variant_id = pv.id
WHERE oi.order_id = 'your-order-id-here';

-- Get user and address for shipping
SELECT
    u.id as user_id,
    u.first_name,
    u.phone_number,
    ua.recipient_name,
    ua.phone_number as recipient_phone,
    ua.address_line1,
    ua.city,
    ua.postal_code,
    ua.latitude,
    ua.longitude
FROM users u
JOIN user_addresses ua ON u.id = ua.user_id
WHERE u.id = 'your-user-id-here'
AND ua.is_default = true;
```

---

## Test Execution Instructions

- Run tests **in sequential order**
- Record results for each test (PASS/FAIL)
- Save IDs from responses for later tests
- For webhook tests, use Biteship webhook simulator or create actual shipments

---

## Test Cases

## SECTION 1: Service Health & Configuration

### Test 1: Health Check

**Purpose:** Verify service is running with correct configuration

**Endpoint:** `GET /health`

**Command:**
```bash
curl http://localhost:3008/health
```

**Expected Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "logistics-service",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "version": "1.0.0"
}
```

**What This Tests:**
- ✅ Service starts successfully
- ✅ Service name is "logistics-service" (not "product-service")
- ✅ Health endpoint responds

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 2: Shipping Rates API (Critical - Was 404)

### Test 2: Get Shipping Rates - Minimal Request

**Purpose:** Verify POST /api/rates works (was returning 404 before fix)

**Endpoint:** `POST /api/rates`

**Command:**
```bash
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-uuid-here",
    "originPostalCode": 12345,
    "destinationPostalCode": 54321,
    "couriers": "jne,jnt,sicepat"
  }'
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "object": "courier_pricing",
  "message": "Success",
  "code": 200,
  "origin": {
    "postal_code": 12345,
    "location_name": "Jakarta Pusat"
  },
  "destination": {
    "postal_code": 54321,
    "location_name": "Surabaya"
  },
  "pricing": [
    {
      "courier_name": "JNE",
      "courier_code": "jne",
      "courier_service_name": "REG",
      "courier_service_code": "reg",
      "description": "Regular Service",
      "duration": "2-3 days",
      "price": 15000,
      "available_for_cash_on_delivery": false,
      "available_for_proof_of_delivery": true,
      "available_for_instant_waybill_id": true,
      "available_for_insurance": true,
      "company": "jne",
      "type": "reg"
    },
    {
      "courier_name": "J&T Express",
      "courier_code": "jnt",
      "courier_service_name": "EZ",
      "courier_service_code": "ez",
      "description": "Economy Service",
      "duration": "3-5 days",
      "price": 12000,
      "type": "reg"
    }
  ]
}
```

**What This Tests:**
- ✅ Public routes are now registered (critical fix!)
- ✅ Biteship API integration works
- ✅ Rate comparison from multiple couriers
- ✅ Correct response structure

**Notes:**
- If you get 404: Public routes not registered (should be fixed)
- If you get 401/403 from Biteship: Check BITESHIP_API_KEY
- If you get empty pricing: Check postal codes are valid Indonesia codes

**Status:** [ ] PASS [ ] FAIL

---

### Test 3: Get Shipping Rates - With Coordinates

**Purpose:** Test rate calculation using GPS coordinates

**Endpoint:** `POST /api/rates`

**Command:**
```bash
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-uuid",
    "originLatitude": -6.2088,
    "originLongitude": 106.8456,
    "destinationLatitude": -7.2575,
    "destinationLongitude": 112.7521,
    "couriers": "jne,jnt,sicepat,anteraja"
  }'
```

**Expected Response:** `200 OK` with pricing array

**What This Tests:**
- ✅ GPS coordinate-based rate calculation
- ✅ Multiple courier comparison

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 3: Shipment Creation

### Test 4: Create Shipment

**Purpose:** Create actual shipment via Biteship

**Endpoint:** `POST /api/shipments`

**Prerequisites:**
- Have a paid order with valid shipping address
- Know the exact weight and dimensions of items
- Selected courier from rates API (Test 2)

**Command:**
```bash
curl -X POST http://localhost:3008/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-uuid",
    "courierCompany": "jne",
    "courierType": "reg",
    "shipperContactName": "Factory Name",
    "shipperContactPhone": "+6281234567890",
    "shipperContactEmail": "factory@example.com",
    "originContactName": "Warehouse Manager",
    "originContactPhone": "+6281234567890",
    "originAddress": "Jl. Factory No. 123",
    "originPostalCode": 12345,
    "destinationContactName": "Customer Name",
    "destinationContactPhone": "+6289876543210",
    "destinationContactEmail": "customer@example.com",
    "destinationAddress": "Jl. Customer Street No. 456",
    "destinationPostalCode": 54321,
    "deliveryType": "now",
    "items": [
      {
        "name": "Product Name",
        "description": "Product Description",
        "value": 100000,
        "length": 30,
        "width": 20,
        "height": 10,
        "weight": 1000,
        "quantity": 2
      }
    ]
  }'
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": "shipment-uuid",
      "order_id": "order-uuid",
      "tracking_number": "JNE1234567890",
      "status": "pending",
      "courier_service": "jne",
      "service_type": "reg",
      "shipping_cost": 15000,
      "created_at": "2025-11-10T10:00:00.000Z"
    },
    "biteshipOrder": {
      "id": "biteship-order-id",
      "waybill_id": "JNE1234567890",
      "status": "confirmed",
      "price": 15000
    }
  }
}
```

**What This Tests:**
- ✅ Shipment creation via Biteship
- ✅ Database record creation
- ✅ Order tracking number assignment
- ✅ No Prisma relation crash (pickup_tasks removed)

**Common Errors:**
- 400 "Order already has shipment": Order was already shipped
- 401 "Unauthorized": Invalid Biteship API key
- 422 "Invalid postal code": Use real Indonesia postal codes

**Status:** [ ] PASS [ ] FAIL

**Save for later:** `tracking_number`, `shipment_id`

---

## SECTION 4: Shipment Tracking

### Test 5: Track by Tracking Number

**Purpose:** Track shipment status using waybill/tracking number

**Endpoint:** `GET /api/shipments/track/:trackingNumber`

**Command:**
```bash
# Replace with tracking number from Test 4
curl http://localhost:3008/api/shipments/track/JNE1234567890
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": "shipment-uuid",
      "tracking_number": "JNE1234567890",
      "status": "picked_up",
      "courier_service": "jne",
      "created_at": "2025-11-10T10:00:00.000Z"
    },
    "trackingInfo": {
      "success": true,
      "waybill_id": "JNE1234567890",
      "status": "picked_up",
      "history": [
        {
          "note": "Package picked up from origin",
          "updated_at": "2025-11-10T11:00:00Z",
          "status": "picked_up"
        },
        {
          "note": "Package created",
          "updated_at": "2025-11-10T10:00:00Z",
          "status": "pending"
        }
      ]
    }
  }
}
```

**What This Tests:**
- ✅ Tracking number lookup
- ✅ Biteship tracking API integration
- ✅ Status history retrieval

**Status:** [ ] PASS [ ] FAIL

---

### Test 6: Get Shipments by Order ID

**Purpose:** Retrieve shipment for specific order

**Endpoint:** `GET /api/shipments/order/:orderId`

**Command:**
```bash
curl http://localhost:3008/api/shipments/order/your-order-uuid
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid",
    "order_id": "order-uuid",
    "tracking_number": "JNE1234567890",
    "status": "picked_up",
    "courier_service": "jne",
    "shipping_cost": 15000
  }
}
```

**What This Tests:**
- ✅ Order-to-shipment relationship
- ✅ Shipment retrieval by order

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 5: Webhook Security (Critical Fix)

### Test 7: Biteship Webhook - With Valid Signature

**Purpose:** Verify webhook signature validation works

**Endpoint:** `POST /api/webhooks/biteship`

**Setup:**
1. Configure `BITESHIP_WEBHOOK_SECRET` in .env
2. Generate HMAC-SHA256 signature

**Command:**
```bash
# Generate signature (use the exact JSON payload)
PAYLOAD='{"order_id":"biteship-order-id","status":"delivered","updated_at":"2025-11-10T10:00:00Z"}'
SECRET="your-webhook-secret"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send webhook with signature
curl -X POST http://localhost:3008/api/webhooks/biteship \
  -H "Content-Type: application/json" \
  -H "x-biteship-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**What This Tests:**
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Security fix implemented
- ✅ Valid webhooks accepted

**Status:** [ ] PASS [ ] FAIL

---

### Test 8: Biteship Webhook - Invalid Signature (Security Test)

**Purpose:** Verify invalid signatures are rejected

**Endpoint:** `POST /api/webhooks/biteship`

**Command:**
```bash
curl -X POST http://localhost:3008/api/webhooks/biteship \
  -H "Content-Type: application/json" \
  -H "x-biteship-signature: invalid-signature-12345" \
  -d '{
    "order_id": "biteship-order-id",
    "status": "delivered"
  }'
```

**Expected Response:** `403 Forbidden`
```json
{
  "success": false,
  "error": "Invalid webhook signature"
}
```

**What This Tests:**
- ✅ Webhook spoofing protection
- ✅ Invalid signatures rejected
- ✅ Security vulnerability fixed

**Status:** [ ] PASS [ ] FAIL

---

### Test 9: Biteship Webhook - Missing Signature

**Purpose:** Test behavior when signature header is missing

**Endpoint:** `POST /api/webhooks/biteship`

**Command:**
```bash
curl -X POST http://localhost:3008/api/webhooks/biteship \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "biteship-order-id",
    "status": "in_transit"
  }'
```

**Expected Response:**
- If `BITESHIP_WEBHOOK_SECRET` is set: May warn but process (soft validation)
- Should log warning about missing signature

**What This Tests:**
- ✅ Handling of missing signature
- ✅ Configurable security enforcement

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 6: Admin Endpoints

### Test 10: Get All Shipments (Admin)

**Purpose:** List all shipments with filtering

**Endpoint:** `GET /api/admin/shipments`

**Command:**
```bash
# Get all shipments
curl http://localhost:3008/api/admin/shipments

# With filters
curl 'http://localhost:3008/api/admin/shipments?status=pending&courierService=jne&page=1&limit=20'
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "shipment-uuid",
      "order_id": "order-uuid",
      "tracking_number": "JNE1234567890",
      "status": "pending",
      "courier_service": "jne",
      "shipping_cost": 15000,
      "created_at": "2025-11-10T10:00:00.000Z",
      "orders": {
        "order_number": "ORD-20251110-001",
        "user_id": "user-uuid"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**What This Tests:**
- ✅ Admin shipment listing
- ✅ Filtering functionality
- ✅ Pagination
- ✅ No Prisma crash (pickup_tasks removed)

**Status:** [ ] PASS [ ] FAIL

---

### Test 11: Get Shipment Details (Admin)

**Purpose:** Get detailed shipment with tracking events

**Endpoint:** `GET /api/admin/shipments/:id`

**Command:**
```bash
curl http://localhost:3008/api/admin/shipments/your-shipment-uuid
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid",
    "tracking_number": "JNE1234567890",
    "status": "in_transit",
    "orders": {
      "order_number": "ORD-20251110-001",
      "order_items": [...]
    },
    "shipment_tracking_events": [
      {
        "id": "event-uuid",
        "status": "in_transit",
        "description": "Package in transit to destination",
        "event_time": "2025-11-10T12:00:00.000Z"
      }
    ]
  }
}
```

**What This Tests:**
- ✅ Detailed shipment retrieval
- ✅ Tracking events included
- ✅ No crash from invalid relations

**Status:** [ ] PASS [ ] FAIL

---

### Test 12: Shipments Analytics (Admin) - SQL Injection Fix

**Purpose:** Verify analytics endpoint doesn't have SQL injection vulnerability

**Endpoint:** `GET /api/admin/shipments/analytics`

**Command:**
```bash
# Normal request
curl 'http://localhost:3008/api/admin/shipments/analytics?startDate=2025-01-01&endDate=2025-12-31'

# Attempt SQL injection (should be safely handled)
curl 'http://localhost:3008/api/admin/shipments/analytics?startDate=2025-01-01%27;DROP%20TABLE%20shipments;--&endDate=2025-12-31'
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalShipments": 150,
    "shipmentsByStatus": {
      "pending": 20,
      "picked_up": 30,
      "in_transit": 40,
      "delivered": 60
    },
    "shipmentsByCourier": {
      "jne": 80,
      "jnt": 50,
      "sicepat": 20
    },
    "avgShippingCost": 18500,
    "avgDeliveryTimeDays": 3.5,
    "deliveredShipmentsCount": 60
  }
}
```

**What This Tests:**
- ✅ SQL injection vulnerability FIXED
- ✅ Safe Prisma queries used instead of raw SQL
- ✅ Analytics calculation works correctly
- ✅ No database corruption from injection attempts

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 7: CORS Testing

### Test 13: CORS Preflight Request

**Purpose:** Verify CORS is properly configured

**Command:**
```bash
curl -X OPTIONS http://localhost:3008/api/rates \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected:** Should see CORS headers in response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

**What This Tests:**
- ✅ CORS enabled (critical fix)
- ✅ Frontend can make requests

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 8: Error Handling

### Test 14: Invalid Order ID

**Purpose:** Test error handling for non-existent order

**Endpoint:** `POST /api/rates`

**Command:**
```bash
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "00000000-0000-0000-0000-000000000000",
    "originPostalCode": 12345,
    "destinationPostalCode": 54321
  }'
```

**Expected Response:** `404 Not Found` or `400 Bad Request`
```json
{
  "success": false,
  "error": "Order not found"
}
```

**What This Tests:**
- ✅ Error handling
- ✅ Graceful failure

**Status:** [ ] PASS [ ] FAIL

---

### Test 15: Invalid Biteship API Key

**Purpose:** Test behavior with wrong API credentials

**Setup:** Temporarily change `BITESHIP_API_KEY` to invalid value

**Command:**
```bash
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "valid-order-uuid",
    "originPostalCode": 12345,
    "destinationPostalCode": 54321
  }'
```

**Expected Response:** `500 Internal Server Error` or `401 Unauthorized`
```json
{
  "success": false,
  "error": "Failed to get shipping rates"
}
```

**What This Tests:**
- ✅ API authentication error handling
- ✅ Proper error messages

**Status:** [ ] PASS [ ] FAIL

---

## Summary Checklist

### Critical Fixes Verification
- [ ] Test 1: Service name correct ("logistics-service", not "product-service")
- [ ] Test 2: Public routes accessible (POST /api/rates works, not 404)
- [ ] Test 4: No Prisma crash on shipment creation (pickup_tasks removed)
- [ ] Tests 7-9: Webhook signature verification working
- [ ] Test 12: SQL injection fixed in analytics
- [ ] Test 13: CORS enabled

### Functionality Verification
- [ ] Biteship API integration works (rates, shipments, tracking)
- [ ] Database operations work correctly
- [ ] Error handling is graceful
- [ ] Admin endpoints function properly

### Security Verification
- [ ] Webhook signatures validated
- [ ] SQL injection prevented
- [ ] CORS properly configured
- [ ] API key validation works

---

## Notes for Integration

After all tests pass, the logistics service is ready to integrate with group buying:

**Integration Points:**
1. **Calculate shipping cost** when user joins group buying session
2. **Add shipping to payment amount**: `totalPrice + shippingCost + gatewayFee`
3. **Create shipment** after group session succeeds and order is created
4. **Track delivery status** and notify users

**Key Data Needed for Integration:**
- Origin factory address (from factory table)
- Destination user address (from user_addresses table)
- Product weight/dimensions (from product_variants table)
- Selected courier from user (JNE, J&T, SiCepat, etc.)

---

## Troubleshooting

### Common Issues

**404 on all /api/* routes:**
- Public routes not registered → Check index.ts has `app.use('/api', logisticsRoutes)`

**401 from Biteship:**
- Invalid API key → Check BITESHIP_API_KEY in .env
- Using production key in test mode → Use test credentials

**Empty pricing array:**
- Invalid postal codes → Use real Indonesia postal codes (e.g., 12345 for Jakarta)
- No couriers available → Try different postal code combinations

**Webhook 403:**
- Invalid signature → Check BITESHIP_WEBHOOK_SECRET matches Biteship dashboard
- Wrong header name → Verify header name with Biteship docs (may be x-biteship-signature)

**Prisma crashes:**
- pickup_tasks relation error → Should be fixed, verify logistics.repository.ts line 87-91 removed

**CORS errors from frontend:**
- CORS not enabled → Check index.ts has cors() middleware
- Wrong origin → Set CORS_ORIGIN in .env

---

## Test Results Template

```
Date: _______________
Tester: _______________

SECTION 1: Health & Configuration
[ ] Test 1: Health Check

SECTION 2: Shipping Rates
[ ] Test 2: Get Rates - Minimal
[ ] Test 3: Get Rates - GPS Coordinates

SECTION 3: Shipment Creation
[ ] Test 4: Create Shipment

SECTION 4: Tracking
[ ] Test 5: Track by Number
[ ] Test 6: Get by Order ID

SECTION 5: Webhook Security
[ ] Test 7: Valid Signature
[ ] Test 8: Invalid Signature
[ ] Test 9: Missing Signature

SECTION 6: Admin Endpoints
[ ] Test 10: List All Shipments
[ ] Test 11: Get Shipment Details
[ ] Test 12: Analytics (SQL Injection Test)

SECTION 7: CORS
[ ] Test 13: CORS Preflight

SECTION 8: Error Handling
[ ] Test 14: Invalid Order ID
[ ] Test 15: Invalid API Key

Overall Status: [ ] PASS [ ] FAIL
Notes: _______________________________________________
```

---

## Next Steps After Testing

1. ✅ All tests pass → Proceed to group buying integration
2. ❌ Any test fails → Fix issues and retest
3. Document any Biteship-specific behaviors discovered during testing
4. Update webhook header names if different from documentation
