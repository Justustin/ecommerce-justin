# Testing Guide - Business Logic Fixes

This guide will help you test all the critical fixes we applied.

---

## Prerequisites

### 1. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Generate Prisma client
pnpm db:generate
```

### 2. Set Up Environment Variables

Create `.env` files for each service:

**`services/group-buying-service/.env`**
```env
PORT=3007
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
PAYMENT_SERVICE_URL=http://localhost:3006
ORDER_SERVICE_URL=http://localhost:3005
```

**`services/payment-service/.env`**
```env
PORT=3006
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
XENDIT_API_KEY=your_xendit_api_key
XENDIT_CALLBACK_TOKEN=your_callback_token
PAYMENT_SUCCESS_URL=http://localhost:3000/payment/success
PAYMENT_FAILURE_URL=http://localhost:3000/payment/failure
```

**`services/order-service/.env`**
```env
PORT=3005
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
PAYMENT_SERVICE_URL=http://localhost:3006
```

### 3. Set Up Database

```bash
# Make sure PostgreSQL is running
# Then run migrations (if you have them)
cd packages/database
pnpm prisma migrate dev

# Or push schema directly
pnpm prisma db push
```

---

## Starting the Services

### Option 1: Start All Services (Recommended)

```bash
# From root directory
pnpm dev
```

### Option 2: Start Individual Services

```bash
# Terminal 1 - Payment Service
cd services/payment-service
pnpm dev

# Terminal 2 - Order Service
cd services/order-service
pnpm dev

# Terminal 3 - Group Buying Service
cd services/group-buying-service
pnpm dev
```

---

## Testing Critical Fixes

### Test #1: Race Condition Protection (CRITICAL)

**What we're testing:** Users cannot join the same session multiple times

**Setup:**
```bash
# Create a test script
cat > test-race-condition.js << 'EOF'
const axios = require('axios');

async function testRaceCondition() {
  const sessionId = 'your-session-id'; // Replace with actual session ID
  const userId = 'test-user-123';

  const joinData = {
    groupSessionId: sessionId,
    userId: userId,
    quantity: 1,
    variantId: null,
    unitPrice: 100000,
    totalPrice: 100000
  };

  // Send 5 concurrent requests
  const promises = Array(5).fill(null).map(() =>
    axios.post('http://localhost:3007/api/group-buying/join', joinData)
      .then(res => ({ success: true, data: res.data }))
      .catch(err => ({ success: false, error: err.response?.data }))
  );

  const results = await Promise.all(promises);

  console.log('Results:', results);

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`\n✅ Successes: ${successCount}`);
  console.log(`❌ Failures: ${failureCount}`);

  if (successCount === 1 && failureCount === 4) {
    console.log('\n🎉 PASS: Race condition protection working! Only 1 join succeeded.');
  } else {
    console.log('\n❌ FAIL: Multiple joins succeeded! Race condition exists.');
  }
}

testRaceCondition();
EOF

node test-race-condition.js
```

**Expected Result:** ✅ Only 1 request succeeds, the other 4 fail with "User has already joined this session"

---

### Test #2: Unit Price Validation (CRITICAL)

**What we're testing:** Users cannot submit fake prices

**Test:**
```bash
curl -X POST http://localhost:3007/api/group-buying/join \
  -H "Content-Type: application/json" \
  -d '{
    "groupSessionId": "session-123",
    "userId": "user-123",
    "quantity": 1,
    "unitPrice": 1,
    "totalPrice": 1
  }'
```

**Expected Result:** ❌ Error: "Invalid unit price. Expected 100000, got 1"

**Valid Test:**
```bash
curl -X POST http://localhost:3007/api/group-buying/join \
  -H "Content-Type: application/json" \
  -d '{
    "groupSessionId": "session-123",
    "userId": "user-456",
    "quantity": 1,
    "unitPrice": 100000,
    "totalPrice": 100000
  }'
```

**Expected Result:** ✅ Success: Payment created with correct price

---

### Test #3: Payment Rollback Logging (CRITICAL)

**What we're testing:** If payment fails and rollback also fails, we get critical alerts

**Test:** Stop the payment service and try to join a session

```bash
# Stop payment service (Ctrl+C in payment service terminal)

# Try to join session
curl -X POST http://localhost:3007/api/group-buying/join \
  -H "Content-Type: application/json" \
  -d '{
    "groupSessionId": "session-123",
    "userId": "user-789",
    "quantity": 1,
    "unitPrice": 100000,
    "totalPrice": 100000
  }'
```

**Check Logs:** You should see structured JSON logs like:
```json
{
  "timestamp": "2025-10-25T...",
  "level": "error",
  "service": "group-buying-service",
  "message": "Payment failed",
  ...
}
```

**Expected Result:** ✅ Participant is rolled back, logs show the failure

---

### Test #4: Webhook Idempotency (CRITICAL)

**What we're testing:** Same webhook doesn't process twice

**Test:**
```bash
# Send same webhook twice
WEBHOOK_PAYLOAD='{
  "id": "test-invoice-123",
  "status": "PAID",
  "amount": 100000,
  "fees_paid_amount": 2000
}'

# First call
curl -X POST http://localhost:3006/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: your-token" \
  -d "$WEBHOOK_PAYLOAD"

# Second call (duplicate)
curl -X POST http://localhost:3006/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: your-token" \
  -d "$WEBHOOK_PAYLOAD"
```

**Check Database:**
```sql
SELECT * FROM webhook_events WHERE event_id = 'test-invoice-123';
-- Should only have 1 record

SELECT * FROM payments WHERE gateway_transaction_id = 'test-invoice-123';
-- payment_status should be 'paid' (not charged twice)
```

**Expected Result:** ✅ Second webhook returns "Already processed", payment not duplicated

---

### Test #5: Retry Logic (MAJOR)

**What we're testing:** Service calls retry on failure

**Test:** Temporarily stop payment service, then start it mid-retry

```bash
# Stop payment service
# Try to join session - it will retry 3 times
curl -X POST http://localhost:3007/api/group-buying/join \
  -H "Content-Type: application/json" \
  -d '{
    "groupSessionId": "session-123",
    "userId": "user-retry-test",
    "quantity": 1,
    "unitPrice": 100000,
    "totalPrice": 100000
  }'

# Watch logs - you should see retry attempts:
# "Retry attempt 1/3 after 1000ms delay"
# "Retry attempt 2/3 after 2000ms delay"
# "Retry attempt 3/3 after 4000ms delay"
```

**Expected Result:** ✅ Logs show exponential backoff retry attempts

---

### Test #6: Escrow Release Transaction (CRITICAL)

**What we're testing:** Escrow release and ledger recording happen atomically

**Setup:** Create a group session that reaches MOQ

**Test:**
```bash
# Release escrow
curl -X POST http://localhost:3006/api/payments/release-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "groupSessionId": "session-123"
  }'
```

**Check Database:**
```sql
-- All payments should have is_in_escrow = false
SELECT id, is_in_escrow, escrow_released_at FROM payments
WHERE group_session_id = 'session-123';

-- All should have corresponding ledger entries
SELECT * FROM transaction_ledger
WHERE payment_id IN (
  SELECT id FROM payments WHERE group_session_id = 'session-123'
);
```

**Expected Result:** ✅ All payments released AND all ledger entries exist (or all fail together)

---

### Test #7: Order Service Partial Failure (MAJOR)

**What we're testing:** If some payments fail, successful ones still work

**Setup:** Create an order with items from 2 factories

**Test:**
1. Stop payment service temporarily
2. Create order
3. Start payment service after 2 seconds

```bash
curl -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "items": [
      {"productId": "prod-1", "quantity": 1},
      {"productId": "prod-2", "quantity": 1}
    ],
    "shippingAddress": {
      "name": "John Doe",
      "address": "123 Main St"
    }
  }'
```

**Expected Result:**
- ✅ Response shows `failedPayments` array with details
- ✅ Failed orders marked with status 'failed'
- ✅ Successful orders have payment URLs

---

## Automated Test Suite

Create `test-suite.sh`:

```bash
#!/bin/bash

echo "🧪 Running Business Logic Test Suite"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Test 1: Health Check
echo -e "\n📋 Test 1: Service Health Check"
if curl -s http://localhost:3007/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC} - Group buying service is running"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC} - Group buying service is not running"
  ((FAIL++))
fi

if curl -s http://localhost:3006/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC} - Payment service is running"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC} - Payment service is not running"
  ((FAIL++))
fi

# Test 2: Price Validation
echo -e "\n📋 Test 2: Price Validation"
RESPONSE=$(curl -s -X POST http://localhost:3007/api/group-buying/join \
  -H "Content-Type: application/json" \
  -d '{"groupSessionId":"test","userId":"test","quantity":1,"unitPrice":1,"totalPrice":1}')

if echo "$RESPONSE" | grep -q "Invalid unit price"; then
  echo -e "${GREEN}✓ PASS${NC} - Price validation working"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC} - Price validation not working"
  ((FAIL++))
fi

# Summary
echo -e "\n===================================="
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo -e "===================================="
```

Run it:
```bash
chmod +x test-suite.sh
./test-suite.sh
```

---

## Manual Testing Checklist

### Group Buying Flow

- [ ] Create a group session
- [ ] Join session with correct price → ✅ Should succeed
- [ ] Try to join again with same user → ❌ Should fail
- [ ] Try to join with wrong price → ❌ Should fail
- [ ] Reach MOQ and check escrow release
- [ ] Check transaction ledger has all entries

### Payment Flow

- [ ] Create regular order
- [ ] Simulate Xendit webhook (PAID)
- [ ] Send same webhook again → Should be idempotent
- [ ] Check order status updated to 'paid'
- [ ] Check transaction ledger

### Refund Flow

- [ ] Create group session
- [ ] Users join and pay
- [ ] Session fails (doesn't reach MOQ)
- [ ] Check refunds are created automatically
- [ ] Check all participants notified

---

## Monitoring Logs

All services now use structured logging. Watch logs:

```bash
# Group buying service logs
tail -f services/group-buying-service/logs/*.log | jq '.'

# Look for:
# - level: "critical" → Alerts for manual intervention
# - level: "error" → Errors that were handled
# - level: "info" → Normal operations
```

---

## Database Checks

Useful queries to verify functionality:

```sql
-- Check for duplicate participants
SELECT group_session_id, user_id, COUNT(*)
FROM group_participants
GROUP BY group_session_id, user_id
HAVING COUNT(*) > 1;
-- Should return 0 rows ✅

-- Check escrow consistency
SELECT
  p.id,
  p.is_in_escrow,
  COUNT(tl.id) as ledger_entries
FROM payments p
LEFT JOIN transaction_ledger tl ON tl.payment_id = p.id
WHERE p.group_session_id IS NOT NULL
GROUP BY p.id, p.is_in_escrow;
-- All should have matching ledger entries ✅

-- Check webhook processing
SELECT event_id, processed, created_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
-- All should be processed = true ✅
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to payment service"
**Solution:**
- Check payment service is running: `curl http://localhost:3006/health`
- Check environment variables are set correctly
- Check retry logs show connection attempts

### Issue: "Prisma Client not generated"
**Solution:**
```bash
cd packages/database
pnpm prisma generate
```

### Issue: "Database connection failed"
**Solution:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Test connection: `psql $DATABASE_URL`

---

## Next Steps

1. **Add Automated Tests:** Create Jest/Mocha tests for critical paths
2. **Add Integration Tests:** Test service-to-service communication
3. **Set Up CI/CD:** Run tests on every commit
4. **Add Monitoring:** Integrate with Datadog/New Relic
5. **Load Testing:** Test concurrent user scenarios with k6/Artillery

---

**Happy Testing! 🎉**

If you find any issues, check:
1. Service logs (structured JSON)
2. Database state
3. Environment variables
4. Network connectivity between services
