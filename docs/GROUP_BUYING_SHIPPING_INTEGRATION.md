# Group Buying + Shipping Cost Integration Guide

**Problem Solved:** Chicken-and-egg problem where shipping cost is needed BEFORE payment, but API required orderId which doesn't exist until AFTER payment.

**Solution:** Pre-order shipping rate calculation using product data directly.

---

## The Problem (Before Fix)

```
❌ BROKEN FLOW:
1. User wants to join group buying session
2. System needs to show: Total = ProductPrice + ShippingCost + GatewayFee
3. To get ShippingCost → call POST /api/rates
4. But POST /api/rates requires orderId
5. But orderId doesn't exist! (created after payment)
6. DEADLOCK! ❌
```

---

## The Solution (After Fix)

```
✅ WORKING FLOW:
1. User selects product + variant + quantity
2. Call POST /api/rates with productId + variantId + quantity + userId
3. Logistics service:
   - Fetches product weight/dimensions from database
   - Gets factory address (origin) from product
   - Gets user's default shipping address (destination)
   - Calls Biteship API with real data
   - Returns actual shipping costs
4. Calculate: Total = ProductPrice + ShippingCost + GatewayFee
5. User pays total amount
6. Payment confirmed → order created
7. Shipment created using orderId
```

---

## API Usage

### Pre-Order Mode (For Group Buying)

**Endpoint:** `POST http://localhost:3008/api/rates`

**Request Body:**
```json
{
  "productId": "product-uuid",
  "variantId": "variant-uuid",     // optional if no variant
  "quantity": 10,
  "userId": "user-uuid",            // gets user's default shipping address
  "couriers": "jne,jnt,sicepat"   // optional, defaults to common couriers
}
```

**What Happens:**
1. Fetches product from `products` table
2. Gets weight/dimensions from `product_variants` or `products` table
3. Gets factory address from `factories` table (via product.factory_id)
4. Gets user address from `user_addresses` where `is_default = true`
5. Calculates shipping cost from Biteship API
6. Returns courier options with prices

**Response:**
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

---

## Integration with Group Buying Service

### Step 1: Modify Join Session Endpoint

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

**Current Code (Incomplete):**
```typescript
async joinSession(data: JoinGroupDTO) {
  // ... existing validation ...

  // ❌ Problem: Only calculates product price
  const paymentData = {
    userId: data.userId,
    groupSessionId: data.groupSessionId,
    participantId: participant.id,
    amount: data.totalPrice,  // ❌ Missing shipping + gateway fee!
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isEscrow: true,
    factoryId: session.factory_id
  };
}
```

**New Code (Complete):**
```typescript
async joinSession(data: JoinGroupDTO) {
  const session = await this.repository.findById(data.groupSessionId);
  if (!session) throw new Error('Session not found');

  // Existing validation...

  // NEW: Calculate shipping cost BEFORE creating participant
  let shippingCost = 0;
  try {
    const logisticsServiceUrl = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';

    const ratesResponse = await axios.post(`${logisticsServiceUrl}/api/rates`, {
      productId: session.product_id,
      variantId: data.variantId,
      quantity: data.quantity,
      userId: data.userId,
      couriers: 'jne,jnt,sicepat'
    });

    if (ratesResponse.data.success && ratesResponse.data.data.pricing.length > 0) {
      // Use cheapest courier option
      const rates = ratesResponse.data.data.pricing;
      const cheapestRate = rates.reduce((min, rate) =>
        rate.price < min.price ? rate : min
      );
      shippingCost = cheapestRate.price;

      console.log(`💰 Shipping cost calculated: Rp ${shippingCost} via ${cheapestRate.courier_name}`);
    }
  } catch (error: any) {
    console.error('Failed to calculate shipping cost:', error.message);
    console.warn('⚠️  Continuing without shipping cost - will need to be added later');
    // Optionally throw error here if shipping cost is mandatory
    // throw new Error('Unable to calculate shipping cost. Please try again.');
  }

  // NEW: Calculate payment gateway fee (Xendit charges ~2-3%)
  const productPrice = data.totalPrice;
  const gatewayFeePercentage = 0.03; // 3%
  const gatewayFee = Math.ceil(productPrice * gatewayFeePercentage);

  // NEW: Calculate total amount including shipping and gateway fee
  const totalAmount = productPrice + shippingCost + gatewayFee;

  console.log(`📊 Payment breakdown:
    Product: Rp ${productPrice}
    Shipping: Rp ${shippingCost}
    Gateway Fee: Rp ${gatewayFee}
    Total: Rp ${totalAmount}
  `);

  // Create participant with shipping metadata
  const participant = await this.repository.joinSession({
    ...data,
    metadata: {
      ...data.metadata,
      shippingCost,
      gatewayFee,
      totalAmount
    }
  });

  // Create escrow payment with FULL amount (product + shipping + fee)
  let paymentResult;
  try {
    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

    const paymentData = {
      userId: data.userId,
      groupSessionId: data.groupSessionId,
      participantId: participant.id,
      amount: totalAmount,  // ✅ Now includes shipping + gateway fee!
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isEscrow: true,
      factoryId: session.factory_id
    };

    const response = await axios.post(
      `${paymentServiceUrl}/api/payments/escrow`,
      paymentData
    );

    paymentResult = response.data.data;
  } catch (error: any) {
    // Rollback participant if payment fails
    await this.repository.leaveSession(data.groupSessionId, data.userId);
    throw new Error(`Payment creation failed: ${error.message}`);
  }

  return {
    participant,
    payment: paymentResult,
    breakdown: {
      productPrice,
      shippingCost,
      gatewayFee,
      totalAmount
    }
  };
}
```

---

## Frontend Integration

### Join Session Request

**Before:**
```javascript
// ❌ Old - only product price
const response = await fetch('/api/group-buying/sessions/123/join', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-uuid',
    quantity: 10,
    variantId: 'variant-uuid',
    unitPrice: 50000,
    totalPrice: 500000  // quantity × unitPrice
  })
});
```

**After:**
```javascript
// ✅ New - backend calculates shipping automatically
const response = await fetch('/api/group-buying/sessions/123/join', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-uuid',
    quantity: 10,
    variantId: 'variant-uuid',
    unitPrice: 50000,
    totalPrice: 500000  // Backend will add shipping + fee
  })
});

// Response includes breakdown
const data = await response.json();
console.log(data.breakdown);
// {
//   productPrice: 500000,
//   shippingCost: 15000,
//   gatewayFee: 15450,
//   totalAmount: 530450
// }
```

---

## Database Schema Requirements

### Ensure Required Fields Exist

**1. Products table needs dimensions/weight:**
```sql
SELECT
  id,
  name,
  weight_grams,
  length_cm,
  width_cm,
  height_cm,
  factory_id
FROM products
WHERE id = 'your-product-id';
```

**2. Product variants need weight:**
```sql
SELECT
  id,
  product_id,
  name,
  weight_grams,
  price
FROM product_variants
WHERE id = 'your-variant-id';
```

**3. Factories need address:**
```sql
SELECT
  id,
  factory_name,
  city,
  postal_code,
  latitude,
  longitude
FROM factories
WHERE id = 'your-factory-id';
```

**4. Users need default shipping address:**
```sql
SELECT
  id,
  user_id,
  recipient_name,
  address_line1,
  city,
  postal_code,
  latitude,
  longitude,
  is_default
FROM user_addresses
WHERE user_id = 'your-user-id' AND is_default = true;
```

---

## Testing

### Test Pre-Order Rate Calculation

```bash
curl -X POST http://localhost:3008/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "your-product-uuid",
    "variantId": "your-variant-uuid",
    "quantity": 10,
    "userId": "your-user-uuid",
    "couriers": "jne,jnt,sicepat"
  }'
```

**Expected Response:**
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
      }
    ]
  }
}
```

### Test Complete Group Buying Flow

1. **Join session with shipping calculation:**
```bash
curl -X POST http://localhost:3004/api/group-buying/sessions/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "quantity": 10,
    "variantId": "variant-uuid",
    "unitPrice": 50000,
    "totalPrice": 500000
  }'
```

2. **Verify response includes shipping:**
```json
{
  "message": "Successfully joined the session",
  "data": {
    "participant": {...},
    "payment": {
      "paymentUrl": "https://xendit.co/..."
    },
    "breakdown": {
      "productPrice": 500000,
      "shippingCost": 15000,
      "gatewayFee": 15450,
      "totalAmount": 530450
    }
  }
}
```

---

## Payment Gateway Fee Calculation

### Xendit Fee Structure

**E-Wallet (OVO, GoPay, DANA):**
- Fee: 2% - 3% of transaction

**Bank Transfer:**
- Fee: Rp 4,000 - Rp 5,500 flat

**Credit Card:**
- Fee: 2.9% + Rp 2,000

### Recommended Implementation

```typescript
function calculateGatewayFee(amount: number, method: string = 'ewallet'): number {
  switch (method) {
    case 'bank_transfer':
      return 5000; // Flat fee
    case 'credit_card':
      return Math.ceil(amount * 0.029) + 2000;
    case 'ewallet':
    default:
      return Math.ceil(amount * 0.03); // 3%
  }
}
```

---

## Error Handling

### Scenario 1: User has no default address

**Error:**
```
Destination postal code is required. Provide either orderId, userId with default address, or destinationPostalCode directly.
```

**Solution:**
- Prompt user to add shipping address before joining
- Or allow manual postal code input in join request

### Scenario 2: Product has no weight/dimensions

**Behavior:**
- Falls back to defaults: 500g, 10×10×10 cm
- May result in inaccurate shipping cost

**Solution:**
- Ensure all products have weight/dimensions in database
- Run migration to populate missing data

### Scenario 3: Factory has no postal code

**Error:**
```
Origin postal code is required. Provide either orderId, productId with factory data, or originPostalCode directly.
```

**Solution:**
- Ensure all factories have complete address data
- Or pass `originPostalCode` manually in request

---

## Migration Checklist

Before deploying group buying with shipping:

- [ ] All products have `weight_grams`, `length_cm`, `width_cm`, `height_cm`
- [ ] All product variants have `weight_grams`
- [ ] All factories have `postal_code`, `latitude`, `longitude`
- [ ] Users are prompted to add default shipping address
- [ ] Logistics service is running on port 3008
- [ ] Biteship API key is configured
- [ ] Group buying service has `LOGISTICS_SERVICE_URL` env var
- [ ] Frontend shows shipping cost breakdown to users

---

## Summary

✅ **Problem Solved:** No more chicken-and-egg dilemma
✅ **Pre-Order Rates:** Calculate shipping BEFORE order exists
✅ **Real Data:** Uses actual product weight/dimensions and addresses
✅ **Accurate Costs:** Users see true total before payment
✅ **Backward Compatible:** Old orderId mode still works

**Ready to integrate!** 🚀
