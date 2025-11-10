# Logistics Service - Test Plan (Swagger UI)

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
- ✅ **Pre-order shipping rate calculation for GROUP BUYING**

---

## Prerequisites

### 1. Services Running

```bash
# Start Logistics Service
cd services/logistics-service && npm run dev

# Should see:
# 🚚 Logistics Service running on http://localhost:3008
# 📚 API Documentation: http://localhost:3008/api-docs
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

### 3. Open Swagger UI

**URL:** http://localhost:3008/api-docs

You should see a beautiful Swagger interface with all endpoints organized by tags:
- Health
- Rates
- Shipments
- Tracking
- Webhooks
- Admin

### 4. Get Test Data from Database

```sql
-- Get a user UUID
SELECT id, first_name, email FROM users LIMIT 1;

-- Get a product UUID
SELECT id, name, factory_id FROM products LIMIT 1;

-- Get a variant UUID (optional)
SELECT id, product_id, name FROM product_variants LIMIT 1;

-- Get an order UUID (for post-order tests)
SELECT id, order_number, user_id FROM orders WHERE status = 'paid' LIMIT 1;
```

---

## How to Use Swagger UI

### Step 1: Navigate to Swagger
Open **http://localhost:3008/api-docs** in your browser

### Step 2: Find the Endpoint
Endpoints are organized by tags. Click on a tag to expand it.

### Step 3: Test an Endpoint
1. Click on the endpoint (e.g., `POST /api/rates`)
2. Click **"Try it out"** button (top right)
3. Fill in the request body using the examples provided
4. Click **"Execute"** button
5. View the response below

### Step 4: View Response
Swagger shows:
- **Response Code** (200, 400, 500, etc.)
- **Response Body** (JSON data)
- **Response Headers**

---

## Test Cases

## SECTION 1: Service Health & Configuration

### Test 1: Health Check

**Tag:** Health
**Endpoint:** `GET /health`

**Steps:**
1. Open Swagger UI at http://localhost:3008/api-docs
2. Find **Health** tag
3. Click on `GET /health`
4. Click **"Try it out"**
5. Click **"Execute"**

**Expected Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "logistics-service",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "version": "1.0.0",
  "port": 3008,
  "docs": "/api-docs"
}
```

**What This Tests:**
- ✅ Service starts successfully
- ✅ Service name is "logistics-service" (not "product-service")
- ✅ Health endpoint responds
- ✅ Swagger docs link included

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 2: Shipping Rates API (Critical - Was 404)

### Test 2: Get Shipping Rates - Pre-Order Mode (GROUP BUYING)

**Tag:** Rates
**Endpoint:** `POST /api/rates`

**Purpose:** Verify pre-order shipping calculation works (for group buying BEFORE order exists)

**Steps:**
1. Open Swagger UI
2. Find **Rates** tag
3. Click on `POST /api/rates`
4. Click **"Try it out"**
5. In the **"Select example"** dropdown, choose: **"Pre-Order Mode (GROUP BUYING - no order yet)"**
6. Replace the UUIDs with real data from your database:
   ```json
   {
     "productId": "your-product-uuid",
     "variantId": "your-variant-uuid",
     "quantity": 10,
     "userId": "your-user-uuid",
     "couriers": "jne,jnt,sicepat"
   }
   ```
7. Click **"Execute"**

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "pricing": [
      {
        "courier_name": "JNE",
        "courier_service_name": "REG",
        "price": 15000,
        "duration": "2-3 days"
      },
      {
        "courier_name": "J&T Express",
        "courier_service_name": "EZ",
        "price": 12000,
        "duration": "3-5 days"
      }
    ]
  }
}
```

**What This Tests:**
- ✅ **Pre-order rate calculation works (critical for group buying!)**
- ✅ Fetches product weight/dimensions from database
- ✅ Gets factory address as origin
- ✅ Gets user's default shipping address as destination
- ✅ Returns real shipping costs from Biteship
- ✅ Public routes are registered (was 404 before fix)

**Notes:**
- If you get "Product not found": Check productId is valid
- If you get "Destination postal code required": User has no default shipping address
- If you get "Origin postal code required": Product has no factory assigned
- If you get empty pricing array: Check postal codes are valid Indonesia codes

**Status:** [ ] PASS [ ] FAIL

---

### Test 3: Get Shipping Rates - Post-Order Mode

**Tag:** Rates
**Endpoint:** `POST /api/rates`

**Purpose:** Verify post-order rate calculation (for existing orders)

**Steps:**
1. In Swagger UI, find `POST /api/rates`
2. Click **"Try it out"**
3. In **"Select example"** dropdown, choose: **"Post-Order Mode (with existing orderId)"**
4. Replace with real order UUID:
   ```json
   {
     "orderId": "your-order-uuid",
     "couriers": "jne,jnt,sicepat"
   }
   ```
5. Click **"Execute"**

**Expected Response:** `200 OK` with pricing array

**What This Tests:**
- ✅ Post-order mode still works
- ✅ Backward compatibility maintained

**Status:** [ ] PASS [ ] FAIL

---

### Test 4: Get Shipping Rates - Manual Postal Codes

**Tag:** Rates
**Endpoint:** `POST /api/rates`

**Purpose:** Test with manual postal codes (no database lookups)

**Steps:**
1. In Swagger UI, find `POST /api/rates`
2. Click **"Try it out"**
3. In **"Select example"** dropdown, choose: **"Pre-Order Mode (manual postal codes)"**
4. Modify the request:
   ```json
   {
     "productId": "your-product-uuid",
     "quantity": 5,
     "originPostalCode": 12345,
     "destinationPostalCode": 54321,
     "couriers": "jne,jnt,sicepat"
   }
   ```
5. Click **"Execute"**

**Expected Response:** `200 OK` with pricing array

**What This Tests:**
- ✅ Manual postal code override works
- ✅ Flexible addressing options

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 3: Shipment Creation

### Test 5: Create Shipment

**Tag:** Shipments
**Endpoint:** `POST /api/shipments`

**Prerequisites:**
- Have a paid order with valid shipping address
- Selected courier from rates API (Test 2 or 3)

**Steps:**
1. In Swagger UI, find **Shipments** tag
2. Click on `POST /api/shipments`
3. Click **"Try it out"**
4. Fill in the request body (use data from your database):
   ```json
   {
     "orderId": "your-order-uuid",
     "courierCompany": "jne",
     "courierType": "reg"
   }
   ```
5. Click **"Execute"**

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": "shipment-uuid",
      "tracking_number": "JNE1234567890",
      "status": "pending",
      "courier_service": "jne"
    }
  }
}
```

**What This Tests:**
- ✅ Shipment creation via Biteship
- ✅ No Prisma crash (pickup_tasks relation removed)
- ✅ Tracking number assigned

**Status:** [ ] PASS [ ] FAIL

**Save for later:** Copy the `tracking_number` for Test 6

---

## SECTION 4: Shipment Tracking

### Test 6: Track by Tracking Number

**Tag:** Tracking
**Endpoint:** `GET /api/shipments/track/{trackingNumber}`

**Steps:**
1. In Swagger UI, find **Tracking** tag
2. Click on `GET /api/shipments/track/{trackingNumber}`
3. Click **"Try it out"**
4. Enter the tracking number from Test 5 in the **trackingNumber** field
5. Click **"Execute"**

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "tracking_number": "JNE1234567890",
      "status": "picked_up"
    },
    "trackingInfo": {
      "history": [...]
    }
  }
}
```

**What This Tests:**
- ✅ Tracking number lookup
- ✅ Biteship tracking API integration

**Status:** [ ] PASS [ ] FAIL

---

### Test 7: Get Shipment by Order ID

**Tag:** Shipments
**Endpoint:** `GET /api/shipments/order/{orderId}`

**Steps:**
1. In Swagger UI, find `GET /api/shipments/order/{orderId}`
2. Click **"Try it out"**
3. Enter your order UUID in the **orderId** field
4. Click **"Execute"**

**Expected Response:** `200 OK`

**What This Tests:**
- ✅ Order-to-shipment relationship

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 5: Webhook Security (Critical Fix)

### Test 8: Biteship Webhook - Valid Signature

**Tag:** Webhooks
**Endpoint:** `POST /api/webhooks/biteship`

**Note:** Webhook testing is best done using Biteship's webhook simulator or by creating actual shipments. For manual testing in Swagger:

**Steps:**
1. Generate HMAC signature (use online tool or command line)
2. In Swagger UI, find `POST /api/webhooks/biteship`
3. Click **"Try it out"**
4. Add custom header `x-biteship-signature` with the signature
5. Enter webhook payload
6. Click **"Execute"**

**What This Tests:**
- ✅ Webhook signature verification
- ✅ Security fix implemented

**Status:** [ ] PASS [ ] FAIL [ ] SKIP (requires Biteship webhook)

---

## SECTION 6: Admin Endpoints

### Test 9: Get All Shipments (Admin)

**Tag:** Admin
**Endpoint:** `GET /api/admin/shipments`

**Steps:**
1. In Swagger UI, find **Admin** tag
2. Click on `GET /api/admin/shipments`
3. Click **"Try it out"**
4. Optionally add filters:
   - status: `pending`
   - courierService: `jne`
   - page: `1`
   - limit: `20`
5. Click **"Execute"**

**Expected Response:** `200 OK` with shipments array

**What This Tests:**
- ✅ Admin shipment listing
- ✅ Filtering works
- ✅ No Prisma crash (pickup_tasks removed)

**Status:** [ ] PASS [ ] FAIL

---

### Test 10: Get Shipment Details (Admin)

**Tag:** Admin
**Endpoint:** `GET /api/admin/shipments/{id}`

**Steps:**
1. In Swagger UI, find `GET /api/admin/shipments/{id}`
2. Click **"Try it out"**
3. Enter a shipment UUID in the **id** field
4. Click **"Execute"**

**Expected Response:** `200 OK` with detailed shipment data

**What This Tests:**
- ✅ Detailed shipment retrieval
- ✅ Tracking events included

**Status:** [ ] PASS [ ] FAIL

---

### Test 11: Shipments Analytics (SQL Injection Fix)

**Tag:** Admin
**Endpoint:** `GET /api/admin/shipments/analytics`

**Steps:**
1. In Swagger UI, find `GET /api/admin/shipments/analytics`
2. Click **"Try it out"**
3. Enter date range:
   - startDate: `2025-01-01`
   - endDate: `2025-12-31`
4. Click **"Execute"**

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalShipments": 150,
    "avgShippingCost": 18500,
    "avgDeliveryTimeDays": 3.5
  }
}
```

**What This Tests:**
- ✅ Analytics endpoint works
- ✅ SQL injection vulnerability FIXED
- ✅ Safe Prisma queries used

**Security Test:**
Try injecting SQL in date parameters (should be safely handled):
- startDate: `2025-01-01'; DROP TABLE shipments; --`
- Should return error or ignore the injection, NOT execute it

**Status:** [ ] PASS [ ] FAIL

---

## SECTION 7: Error Handling

### Test 12: Invalid Product ID

**Tag:** Rates
**Endpoint:** `POST /api/rates`

**Steps:**
1. In Swagger UI, find `POST /api/rates`
2. Click **"Try it out"**
3. Use invalid UUID:
   ```json
   {
     "productId": "00000000-0000-0000-0000-000000000000",
     "quantity": 10,
     "userId": "your-user-uuid"
   }
   ```
4. Click **"Execute"**

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Product not found"
}
```

**What This Tests:**
- ✅ Error handling
- ✅ Graceful failure

**Status:** [ ] PASS [ ] FAIL

---

## Summary Checklist

### Critical Fixes Verification
- [ ] Test 1: Service name correct ("logistics-service")
- [ ] Test 2: **Pre-order rates work (GROUP BUYING!)**
- [ ] Test 3: Post-order rates work (backward compatible)
- [ ] Test 5: No Prisma crash on shipment creation
- [ ] Test 8: Webhook signature verification
- [ ] Test 11: SQL injection fixed in analytics

### Functionality Verification
- [ ] Biteship API integration works
- [ ] Database operations work
- [ ] Error handling is graceful
- [ ] Admin endpoints function

### Group Buying Ready
- [ ] Can get shipping cost WITHOUT order
- [ ] Fetches product/variant data correctly
- [ ] Gets factory and user addresses
- [ ] Returns real courier rates

---

## Integration Checklist for Group Buying

Before integrating shipping costs into group buying:

- [ ] Test 2 passes (pre-order rate calculation)
- [ ] Products have weight/dimensions in database
- [ ] Product variants have weight
- [ ] Factories have postal codes
- [ ] Users have default shipping addresses
- [ ] Logistics service runs on port 3008
- [ ] Biteship API key is configured

---

## Using Swagger UI Tips

### Viewing Request Examples
- Swagger shows 3 examples for POST /api/rates
- Click dropdown to switch between examples
- Modify the JSON to use your real data

### Copying Responses
- Click **"Copy"** icon next to response body
- Paste into documentation or share with team

### Testing Multiple Scenarios
- Keep Swagger tab open
- Test different combinations
- Compare responses

### Troubleshooting
- Check **"Server response"** section for actual status code
- View **"Response body"** for error messages
- Check **"Responses headers"** for CORS headers

---

## Next Steps After Testing

1. ✅ All tests pass → Proceed to group buying integration
2. ❌ Any test fails → Fix issues and retest
3. Use `GROUP_BUYING_SHIPPING_INTEGRATION.md` for integration guide

---

## Test Results Template

```
Date: _______________
Tester: _______________
Swagger URL: http://localhost:3008/api-docs

SECTION 1: Health
[ ] Test 1: Health Check

SECTION 2: Shipping Rates
[ ] Test 2: Pre-Order Mode (GROUP BUYING) ⭐
[ ] Test 3: Post-Order Mode
[ ] Test 4: Manual Postal Codes

SECTION 3: Shipments
[ ] Test 5: Create Shipment

SECTION 4: Tracking
[ ] Test 6: Track by Number
[ ] Test 7: Get by Order ID

SECTION 5: Webhooks
[ ] Test 8: Webhook Security

SECTION 6: Admin
[ ] Test 9: List Shipments
[ ] Test 10: Shipment Details
[ ] Test 11: Analytics (SQL Injection Test) ⭐

SECTION 7: Errors
[ ] Test 12: Invalid Product ID

Overall Status: [ ] PASS [ ] FAIL
Critical for Group Buying: [ ] READY [ ] NOT READY

Notes: _______________________________________________
```

---

## Most Important Tests for Group Buying

**Must Pass:**
1. ⭐ **Test 2** - Pre-order rate calculation
2. ⭐ **Test 11** - Analytics security (SQL injection fixed)

**Should Pass:**
- Test 1 - Health check
- Test 3 - Post-order mode (backward compatibility)
- Test 12 - Error handling

Once Test 2 passes, you can integrate shipping costs into group buying using the guide in `GROUP_BUYING_SHIPPING_INTEGRATION.md`! 🚀
