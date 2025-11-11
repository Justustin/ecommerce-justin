# Logistics Service Documentation

## Overview

The Logistics Service manages shipping rate calculations, shipment creation, and tracking through integration with the **Biteship API**. It supports both post-order fulfillment and pre-order shipping cost estimation for group buying scenarios.

**Port:** `3008`
**Base URL:** `http://localhost:3008/api`
**Documentation:** `http://localhost:3008/api-docs`
**External API:** Biteship (https://biteship.com)

---

## Core Capabilities

### 1. Shipping Rate Calculation
- Get real-time shipping rates from multiple couriers
- Support for JNE, J&T, SiCepat, Anteraja, and more
- Two operational modes: Post-Order and Pre-Order
- Automatic address resolution from database

### 2. Shipment Management
- Create shipment orders with selected courier
- Generate shipping labels and waybill IDs
- Track shipment status in real-time
- Receive automatic webhook updates

### 3. Tracking & Monitoring
- Real-time tracking via tracking number
- Shipment status history
- Event logging for all status changes
- Order-to-shipment relationship management

---

## Operational Modes

The service operates in two distinct modes depending on the business flow:

### Mode 1: Post-Order (Traditional E-commerce)

**When to use:** After order is placed and payment is complete

**Scenario:**
```
User places order → Payment confirmed → Calculate shipping → Create shipment
```

**Data Source:**
- Order data from database
- Shipping address from order record
- Product dimensions from order items
- Origin address from product's factory

**Example Request:**
```json
POST /api/rates
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "couriers": "jne,jnt,sicepat"
}
```

**Use Cases:**
- Standard e-commerce checkout
- Admin creating shipments for paid orders
- Bulk order fulfillment

---

### Mode 2: Pre-Order (Group Buying / Cart Checkout)

**When to use:** Before order exists, need shipping cost for payment calculation

**Scenario:**
```
User views product → Calculate shipping → Show total price → User pays → Order created
```

**Data Source:**
- Product data from database
- User's default shipping address
- Factory address as origin
- Dynamic quantity input

**Example Request:**
```json
POST /api/rates
{
  "productId": "650e8400-e29b-41d4-a716-446655440000",
  "variantId": "750e8400-e29b-41d4-a716-446655440000",
  "quantity": 10,
  "userId": "450e8400-e29b-41d4-a716-446655440000",
  "couriers": "jne,jnt,sicepat"
}
```

**Use Cases:**
- Group buying shipping options
- Shopping cart checkout preview
- Price estimation tools

**Critical Requirements:**
- User MUST have a default shipping address (`is_default = true`)
- Product MUST be linked to a factory with postal code
- Quantity must be specified

---

## API Endpoints

### Shipping Rates

#### `POST /api/rates`
Get shipping rates from multiple courier services.

**Supports Two Modes:**

##### **Mode 1: Post-Order**
```json
{
  "orderId": "uuid",
  "couriers": "jne,jnt,sicepat,anteraja"
}
```

##### **Mode 2: Pre-Order (Group Buying)**
```json
{
  "productId": "uuid",
  "variantId": "uuid",        // Optional
  "quantity": 10,
  "userId": "uuid",
  "originPostalCode": 12345,  // Optional, auto-fetched from factory
  "destinationPostalCode": 54321,  // Optional, auto-fetched from user
  "couriers": "jne,jnt,sicepat,anteraja"
}
```

**Parameters:**

| Parameter | Type | Mode | Description |
|-----------|------|------|-------------|
| `orderId` | UUID | Post-Order | Existing order ID |
| `productId` | UUID | Pre-Order | Product to ship |
| `variantId` | UUID | Pre-Order | Product variant (optional) |
| `quantity` | Integer | Pre-Order | Number of items |
| `userId` | UUID | Pre-Order | User ID (for address lookup) |
| `originPostalCode` | Integer | Both | Origin postal code (auto-fetched if not provided) |
| `destinationPostalCode` | Integer | Both | Destination postal code (auto-fetched if not provided) |
| `originLatitude` | Float | Both | Origin GPS coordinates (optional) |
| `originLongitude` | Float | Both | Origin GPS coordinates (optional) |
| `destinationLatitude` | Float | Both | Destination GPS coordinates (optional) |
| `destinationLongitude` | Float | Both | Destination GPS coordinates (optional) |
| `couriers` | String | Both | Comma-separated courier codes (default: "jne,jnt,sicepat,anteraja") |

**Address Resolution Logic:**

```javascript
// Origin Address Resolution
if (orderId) {
  // Get from order's factory
  origin = order.factory.postal_code
} else if (productId) {
  // Get from product's factory
  origin = product.factory.postal_code
} else if (originPostalCode) {
  // Use provided postal code
  origin = originPostalCode
} else {
  ERROR: "Origin postal code is required"
}

// Destination Address Resolution
if (orderId) {
  // Get from order's shipping address
  destination = order.shipping_address.postal_code
} else if (userId) {
  // Get user's default address
  destination = user_addresses.where(user_id=userId, is_default=true).postal_code
} else if (destinationPostalCode) {
  // Use provided postal code
  destination = destinationPostalCode
} else {
  ERROR: "Destination postal code is required"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "object": "courier_pricing",
    "message": "Success",
    "code": 200,
    "origin": {
      "postal_code": 12345,
      "location_name": "Jakarta Pusat",
      "country_code": "ID"
    },
    "destination": {
      "postal_code": 54321,
      "location_name": "Surabaya",
      "country_code": "ID"
    },
    "pricing": [
      {
        "courier_name": "JNE",
        "courier_code": "jne",
        "courier_service_name": "REG",
        "courier_service_code": "reg",
        "description": "Layanan reguler",
        "duration": "2-3 days",
        "shipment_duration_range": "2 - 3",
        "shipment_duration_unit": "days",
        "service_type": "standard",
        "shipping_type": "parcel",
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
        "description": "Layanan ekonomis",
        "duration": "3-5 days",
        "price": 12000,
        ...
      }
    ]
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Destination postal code is required. Provide either orderId, userId with default address, or destinationPostalCode directly."
}
```

```json
{
  "success": false,
  "error": "No default address found for userId: xxx. User must set a default address."
}
```

---

### Shipment Management

#### `POST /api/shipments`
Create a new shipment order with Biteship.

**Required:** Order must exist and have status `ready_for_pickup`, `picked_up`, `paid`, or `processing`

**Request Body:**
```json
{
  "orderId": "uuid",
  "courierCompany": "jne",      // From rates response: courier_code
  "courierType": "reg"           // From rates response: courier_service_code
}
```

**Process:**
1. Validates order exists and status allows shipment
2. Retrieves order items and shipping address
3. Calls Biteship API to create shipment order
4. Stores shipment record in database
5. Updates order status to `shipping`
6. Notifies Order Service and customer

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "tracking_number": "JNE1234567890",
    "waybill_id": "JNE1234567890",
    "courier_service": "jne",
    "courier_type": "reg",
    "status": "pending",
    "shipping_cost": 15000,
    "biteship_order_id": "biteship-order-id",
    "label_url": "https://biteship.com/label/...",
    "created_at": "2025-11-11T10:00:00Z"
  }
}
```

**Status Flow:**
```
pending → picked_up → in_transit → out_for_delivery → delivered
                                                     → failed → returned
```

---

#### `GET /api/shipments`
List all shipments with filters and pagination.

**Query Parameters:**
- `orderId`: Filter by order UUID
- `pickupTaskId`: Filter by pickup task UUID
- `courierService`: Filter by courier code (e.g., `jne`, `jnt`)
- `status`: Filter by status (`pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned`)
- `trackingNumber`: Search by tracking number
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "tracking_number": "JNE1234567890",
      "status": "in_transit",
      "courier_service": "jne",
      "shipping_cost": 15000,
      "created_at": "2025-11-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### `GET /api/shipments/order/:orderId`
Get shipment for a specific order.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "tracking_number": "JNE1234567890",
    "status": "delivered",
    "courier_service": "jne",
    "shipping_cost": 15000,
    "delivered_at": "2025-11-13T14:30:00Z",
    "tracking_events": [...]
  }
}
```

---

#### `POST /api/shipments/status`
Manually update shipment status (admin use).

**Request Body:**
```json
{
  "shipmentId": "uuid",
  "status": "picked_up",
  "note": "Package picked up by courier"
}
```

**Valid Statuses:**
- `pending`: Awaiting courier pickup
- `picked_up`: Picked up by courier
- `in_transit`: In transit to destination
- `out_for_delivery`: Out for delivery
- `delivered`: Successfully delivered
- `failed`: Delivery failed
- `returned`: Returned to sender

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "picked_up",
    "updated_at": "2025-11-11T11:00:00Z"
  },
  "message": "Shipment status updated"
}
```

**Effects:**
- Creates tracking event record
- Notifies Order Service to update order status
- Sends email notification to customer (if configured)

---

### Tracking

#### `GET /api/shipments/track/:trackingNumber`
Get real-time tracking information from Biteship.

**Example:** `GET /api/shipments/track/JNE1234567890`

**Response:**
```json
{
  "success": true,
  "data": {
    "tracking_number": "JNE1234567890",
    "courier": "jne",
    "status": "in_transit",
    "current_status": {
      "status": "in_transit",
      "note": "Package is in transit to destination",
      "updated_at": "2025-11-12T08:30:00Z",
      "location": "Surabaya Hub"
    },
    "history": [
      {
        "status": "picked_up",
        "note": "Package picked up by courier",
        "updated_at": "2025-11-11T15:00:00Z",
        "location": "Jakarta Hub"
      },
      {
        "status": "pending",
        "note": "Shipment order created",
        "updated_at": "2025-11-11T10:00:00Z",
        "location": "Jakarta"
      }
    ],
    "origin": {
      "name": "Factory A",
      "address": "Jl. Industri No. 123",
      "postal_code": 12345
    },
    "destination": {
      "name": "John Doe",
      "address": "Jl. Pelanggan No. 456",
      "postal_code": 54321
    }
  }
}
```

**Sources:**
1. Database shipment record
2. Biteship API live tracking
3. Cached tracking events

---

### Webhooks

#### `POST /api/webhooks/biteship`
Receive tracking updates from Biteship courier service.

**Security:** IP whitelist verification (Biteship IPs only)

**Biteship Webhook Payload:**
```json
{
  "event": "order.status",
  "courier_tracking_id": "JNE1234567890",
  "courier_waybill_id": "JNE1234567890",
  "status": "delivered",
  "note": "Package delivered to recipient",
  "updated_at": "2025-11-13T14:30:00Z",
  "pod": {
    "recipient_name": "John Doe",
    "signature_url": "https://biteship.com/pod/...",
    "photo_url": "https://biteship.com/photo/..."
  }
}
```

**Processing:**
1. Verify webhook authenticity (IP whitelist, signature)
2. Find shipment by tracking number
3. Update shipment status
4. Create tracking event record
5. Notify Order Service
6. Send customer notification (if status = `delivered`)
7. Return success response to Biteship

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Status Mapping:**

| Biteship Status | Our Status | Notify Customer |
|----------------|------------|-----------------|
| `allocated` | `pending` | No |
| `picking_up` | `pending` | No |
| `picked` | `picked_up` | Yes |
| `dropping_off` | `in_transit` | No |
| `on_hold` | `in_transit` | No |
| `on_the_way` | `out_for_delivery` | Yes |
| `delivered` | `delivered` | Yes |
| `rejected` | `failed` | Yes |
| `cancelled` | `failed` | Yes |
| `returning` | `returned` | Yes |
| `returned` | `returned` | Yes |

---

## Integration with Other Services

### 1. Order Service
**Direction:** Logistics → Order Service

**Endpoints Called:**
- `POST /api/orders/:orderId/status` - Update order status

**Events Triggered:**
- Shipment created → Order status: `shipping`
- Delivered → Order status: `delivered`
- Failed → Order status: `delivery_failed`

---

### 2. Group Buying Service
**Direction:** Group Buying → Logistics

**Endpoints Called:**
- `POST /api/rates` (Pre-Order Mode)

**Use Case:**
- Calculate Leg 2 shipping (Warehouse → Customer)
- Origin: Warehouse postal code
- Destination: User's default address

**Example Request from Group Buying:**
```json
POST /api/rates
{
  "originPostalCode": 11111,      // Warehouse postal code
  "userId": "user-uuid",           // For address lookup
  "productId": "product-uuid",
  "quantity": 10,
  "couriers": "jne,jnt,sicepat,anteraja"
}
```

---

### 3. Notification Service
**Direction:** Logistics → Notification Service

**Endpoints Called:**
- `POST /api/notifications/email` - Send email notifications

**Events:**
- Shipment created
- Shipment picked up
- Out for delivery
- Delivered
- Delivery failed

---

### 4. Payment Service
**Direction:** Logistics → Payment Service (indirect)

**Use Case:**
- Shipping cost included in payment invoice
- Refunds if shipment fails

---

## Biteship API Integration

### Authentication

```javascript
const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY;

headers: {
  'Authorization': BITESHIP_API_KEY,
  'Content-Type': 'application/json'
}
```

### Endpoints Used

| Biteship Endpoint | Purpose | Method |
|-------------------|---------|--------|
| `/v1/rates/couriers` | Get shipping rates | POST |
| `/v1/orders` | Create shipment order | POST |
| `/v1/trackings/:tracking_id` | Track shipment | GET |

---

### Rate Calculation Request

```javascript
POST https://api.biteship.com/v1/rates/couriers
Authorization: {API_KEY}
Content-Type: application/json

{
  "origin_postal_code": 12345,
  "destination_postal_code": 54321,
  "couriers": "jne,jnt,sicepat,anteraja",
  "items": [
    {
      "name": "Product Name",
      "description": "10 item(s)",
      "value": 500000,
      "length": 30,
      "width": 20,
      "height": 15,
      "weight": 5000,
      "quantity": 1
    }
  ]
}
```

**Item Calculation Logic:**

```javascript
// Aggregate all order items into single shipping item
totalWeight = sum(item.weight_grams * item.quantity)  // in grams
totalValue = sum(item.unit_price * item.quantity)     // in IDR
maxLength = max(item.length_cm)                       // in cm
maxWidth = max(item.width_cm)
maxHeight = max(item.height_cm)

items = [{
  name: "Order #" + orderId,
  description: `${itemCount} item(s)`,
  value: totalValue,
  length: maxLength,
  width: maxWidth,
  height: maxHeight,
  weight: totalWeight,
  quantity: 1  // Always 1 (consolidated package)
}]
```

---

### Shipment Creation Request

```javascript
POST https://api.biteship.com/v1/orders
Authorization: {API_KEY}
Content-Type: application/json

{
  "origin_contact_name": "Factory Name",
  "origin_contact_phone": "081234567890",
  "origin_address": "Jl. Pabrik No. 123",
  "origin_postal_code": 12345,
  "destination_contact_name": "John Doe",
  "destination_contact_phone": "089876543210",
  "destination_address": "Jl. Pelanggan No. 456",
  "destination_postal_code": 54321,
  "courier_company": "jne",
  "courier_type": "reg",
  "delivery_type": "now",
  "items": [...],
  "reference_id": "ORDER-UUID"
}
```

---

### Tracking Request

```javascript
GET https://api.biteship.com/v1/trackings/JNE1234567890
Authorization: {API_KEY}
```

**Response:**
```json
{
  "success": true,
  "object": "tracking",
  "id": "biteship-tracking-id",
  "waybill_id": "JNE1234567890",
  "courier": {
    "company": "jne",
    "name": "JNE"
  },
  "status": "delivered",
  "history": [...]
}
```

---

## Database Schema

### `shipments`
```sql
id                   UUID PRIMARY KEY
order_id             UUID NOT NULL UNIQUE
tracking_number      VARCHAR(100) NOT NULL
waybill_id           VARCHAR(100)
courier_service      VARCHAR(50) NOT NULL
courier_type         VARCHAR(50)
status               ENUM('pending', 'picked_up', 'in_transit',
                          'out_for_delivery', 'delivered', 'failed', 'returned')
shipping_cost        DECIMAL(15,2) NOT NULL
biteship_order_id    VARCHAR(255)
label_url            TEXT
pickup_task_id       UUID
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP DEFAULT NOW()
picked_up_at         TIMESTAMP
delivered_at         TIMESTAMP
```

---

### `tracking_events`
```sql
id              UUID PRIMARY KEY
shipment_id     UUID NOT NULL REFERENCES shipments(id)
status          VARCHAR(50) NOT NULL
note            TEXT
location        VARCHAR(255)
created_at      TIMESTAMP DEFAULT NOW()
```

**Example Events:**
```json
[
  {
    "status": "pending",
    "note": "Shipment order created",
    "location": "Jakarta",
    "created_at": "2025-11-11T10:00:00Z"
  },
  {
    "status": "picked_up",
    "note": "Package picked up by courier",
    "location": "Jakarta Hub",
    "created_at": "2025-11-11T15:00:00Z"
  },
  {
    "status": "in_transit",
    "note": "Package arrived at sorting facility",
    "location": "Surabaya Hub",
    "created_at": "2025-11-12T08:00:00Z"
  },
  {
    "status": "delivered",
    "note": "Package delivered to recipient",
    "location": "Surabaya",
    "created_at": "2025-11-13T14:30:00Z"
  }
]
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Destination postal code is required" | Missing user address or manual input | User must set default address |
| "Origin postal code is required" | Missing factory address | Factory must have postal code |
| "Order not found" | Invalid orderId | Verify order exists |
| "Order status not ready for shipment" | Order status is not shippable | Order must be `paid` or `ready_for_pickup` |
| "No default address found for userId" | User has no `is_default = true` address | User must set one address as default |
| "Biteship API error: 401" | Invalid API key | Check `BITESHIP_API_KEY` environment variable |
| "Biteship API error: 400" | Invalid request data | Check postal codes and item data |

---

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

---

## Environment Variables

```env
PORT=3008
DATABASE_URL=postgresql://...
BITESHIP_API_KEY=your-biteship-api-key
BITESHIP_API_URL=https://api.biteship.com
ORDER_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3007
WEBHOOK_IP_WHITELIST=103.xx.xx.xx,103.yy.yy.yy  # Biteship IPs
```

---

## Webhook Setup

### 1. Configure Biteship Dashboard
- Go to Biteship dashboard → Settings → Webhooks
- Add webhook URL: `https://yourdomain.com/api/webhooks/biteship`
- Select events: `order.status`
- Save configuration

### 2. Verify IP Whitelist
Add Biteship webhook IPs to environment:
```env
WEBHOOK_IP_WHITELIST=103.xx.xx.xx,103.yy.yy.yy
```

### 3. Test Webhook
```bash
curl -X POST http://localhost:3008/api/webhooks/biteship \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.status",
    "courier_tracking_id": "JNE1234567890",
    "status": "delivered"
  }'
```

---

## Testing Guide

### Test Shipping Rates (Pre-Order Mode)

```bash
# 1. Ensure user has default address
SELECT * FROM user_addresses
WHERE user_id = 'user-uuid' AND is_default = true;

# 2. Get rates
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "quantity": 5,
    "userId": "user-uuid",
    "couriers": "jne,jnt,sicepat"
  }'
```

---

### Test Shipment Creation

```bash
# 1. Create order (via Order Service)

# 2. Get rates for order
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid",
    "couriers": "jne"
  }'

# 3. Create shipment
curl -X POST http://localhost:3008/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid",
    "courierCompany": "jne",
    "courierType": "reg"
  }'

# 4. Track shipment
curl http://localhost:3008/api/shipments/track/JNE1234567890
```

---

### Test Webhook (Local Development)

```bash
# Use ngrok to expose localhost
ngrok http 3008

# Configure Biteship webhook:
# https://xxxx.ngrok.io/api/webhooks/biteship

# Trigger test webhook from Biteship dashboard
```

---

## Monitoring

### Key Metrics to Track
- Rate calculation requests per minute
- Average response time for Biteship API
- Shipment creation success rate
- Webhook processing success rate
- Delivery success rate by courier
- Failed shipments count and reasons

### Logs to Monitor
- Biteship API call logs (requests and responses)
- Address resolution failures
- Webhook processing logs
- Shipment status transitions
- Failed delivery notifications

### Health Checks
```bash
# Check service health
curl http://localhost:3008/health

# Check Biteship API connectivity
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "originPostalCode": 12345,
    "destinationPostalCode": 54321,
    "productId": "test-product",
    "quantity": 1
  }'
```

---

## Business Rules Summary

### Shipping Rate Calculation
✅ User must have default address for Pre-Order mode
✅ Postal code is sufficient (GPS coordinates optional)
✅ Product weight/dimensions fetched from database
✅ Factory postal code used as origin
✅ Biteship API rate limits respected

### Shipment Creation
✅ Order status must allow shipment creation
✅ Courier selection must match available rate
✅ Waybill ID generated by Biteship
✅ Shipping label URL provided
✅ Order status updated to `shipping`

### Tracking Updates
✅ Webhook IP whitelist enforced
✅ Status transitions logged as events
✅ Customer notified on key milestones
✅ Order Service updated automatically

### Failed Deliveries
✅ Status set to `failed`
✅ Customer and admin notified
✅ Refund process may be initiated
✅ Return shipping may be arranged

---

## Swagger Documentation

Full interactive API documentation available at:
**http://localhost:3008/api-docs**

Test endpoints directly from the browser with example payloads.

---

## Biteship Courier Coverage

### Supported Couriers
- **JNE**: Nationwide coverage, reliable
- **J&T Express**: Economy and express options
- **SiCepat**: Fast delivery, competitive pricing
- **Anteraja**: Affordable rates
- **Ninja Xpress**: Wide coverage
- **ID Express**: Express delivery
- **SAP Express**: Standard delivery

### Service Types
- **REG / Regular**: 2-3 days, most affordable
- **YES / Express**: 1-2 days, fast delivery
- **OKE / Economy**: 3-5 days, cheapest
- **CTCYES / Same Day**: Same-day delivery (major cities only)

---

## Troubleshooting

### Issue: "No default address found"
**Solution:**
```sql
-- Check user addresses
SELECT * FROM user_addresses WHERE user_id = 'xxx';

-- Set default address
UPDATE user_addresses
SET is_default = true
WHERE id = 'address-uuid';

-- Ensure only one default
UPDATE user_addresses
SET is_default = false
WHERE user_id = 'xxx' AND id != 'address-uuid';
```

---

### Issue: Biteship API returns 400
**Check:**
- Postal codes are valid 5-digit numbers
- Item weight is in grams (not kg)
- Item dimensions are in cm
- Courier codes are correct

---

### Issue: Webhook not received
**Check:**
1. Webhook URL is publicly accessible
2. IP whitelist includes Biteship IPs
3. Webhook configured in Biteship dashboard
4. HTTPS required for production

**Test:**
```bash
# Check if endpoint accessible
curl -X POST https://yourdomain.com/api/webhooks/biteship \
  -H "Content-Type: application/json" \
  -d '{"event":"order.status","status":"test"}'
```

---

## Security Considerations

### API Key Protection
```javascript
// ✅ Good: Environment variable
const apiKey = process.env.BITESHIP_API_KEY;

// ❌ Bad: Hardcoded
const apiKey = "biteship_live_xxxxx";
```

### Webhook Verification
```javascript
// IP Whitelist
const allowedIPs = process.env.WEBHOOK_IP_WHITELIST.split(',');
const clientIP = getClientIP(req);

if (!allowedIPs.includes(clientIP)) {
  return res.status(403).json({ error: 'Forbidden' });
}

// Signature Verification (if provided by Biteship)
const signature = req.headers['x-biteship-signature'];
const isValid = verifySignature(req.body, signature);
```

### Data Privacy
- Shipping addresses are PII (Personal Identifiable Information)
- Log only necessary data (tracking number, status)
- Never log full addresses or customer names in public logs

---

## Migration Notes

### From Direct Courier Integration
If migrating from direct courier APIs:
1. Update all rate calculation calls to use unified `/api/rates` endpoint
2. Replace courier-specific tracking with `/api/shipments/track/:trackingNumber`
3. Update webhook endpoints to single Biteship webhook
4. Migrate existing shipment data to new schema

### Adding New Couriers
Biteship automatically supports new couriers. No code changes needed.

---

## Support & Resources

- **Biteship Documentation**: https://biteship.com/docs
- **Biteship Dashboard**: https://dashboard.biteship.com
- **Biteship Status**: https://status.biteship.com
- **Support Email**: support@biteship.com
