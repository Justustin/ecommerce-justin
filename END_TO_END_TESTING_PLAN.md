# End-to-End Testing Plan

Complete testing guide for the e-commerce group buying platform. Follow this plan to verify all critical business flows work correctly.

## Table of Contents
1. [Test Environment Setup](#test-environment-setup)
2. [Test Data Preparation](#test-data-preparation)
3. [Test Scenarios](#test-scenarios)
4. [Testing Tools](#testing-tools)
5. [Test Execution Order](#test-execution-order)
6. [Success Criteria](#success-criteria)

---

## Test Environment Setup

### Prerequisites

**Database:**
```bash
# 1. PostgreSQL 14+ running
sudo systemctl status postgresql

# 2. Create test database
sudo -u postgres psql
CREATE DATABASE ecommerce_test;
CREATE USER ecommerce_test WITH PASSWORD 'test123';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_test TO ecommerce_test;
\c ecommerce_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

**Environment Variables:**
```bash
# packages/database/.env
DATABASE_URL=postgresql://ecommerce_test:test123@localhost:5432/ecommerce_test

# Each service needs .env file with test database URL
```

**Run Migrations:**
```bash
cd packages/database
npx prisma generate
npx prisma migrate deploy
```

**Install Dependencies:**
```bash
# Root directory
npm install

# Each service
cd services/wallet-service && npm install
cd services/group-buying-service && npm install
cd services/payment-service && npm install
# ... repeat for all services
```

---

## Test Data Preparation

### 1. Create Bot User (Required)

```sql
-- Execute in PostgreSQL
INSERT INTO users (id, phone_number, password_hash, first_name, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '+628001234567',
  '$2b$10$dummyhashforbot',
  'Platform Bot',
  'customer',
  'active'
);
```

### 2. Create Test Users

```sql
-- Test User 1 (Regular Customer)
INSERT INTO users (id, phone_number, password_hash, first_name, role, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '+6281234567891',
  '$2b$10$yourhashedpassword',
  'John Doe',
  'customer',
  'active'
);

-- Test User 2 (Another Customer)
INSERT INTO users (id, phone_number, password_hash, first_name, role, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '+6281234567892',
  '$2b$10$yourhashedpassword',
  'Jane Smith',
  'customer',
  'active'
);

-- Test User 3 (For wallet testing)
INSERT INTO users (id, phone_number, password_hash, first_name, role, status)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '+6281234567893',
  '$2b$10$yourhashedpassword',
  'Bob Wilson',
  'customer',
  'active'
);
```

### 3. Create Test Factory

```sql
INSERT INTO factories (id, name, phone_number, status)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test Factory Ltd',
  '+6281234560000',
  'active'
);
```

### 4. Create Test Product with Variants

```sql
-- Product
INSERT INTO products (id, factory_id, name, description, status)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test T-Shirt',
  'Premium cotton t-shirt',
  'active'
);

-- Variants (Size S, M, L in Red and Blue)
INSERT INTO product_variants (id, product_id, variant_name, sku, moq, base_price, status)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Red-S', 'TSHIRT-RED-S', 100, 50000, 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Red-M', 'TSHIRT-RED-M', 100, 50000, 'active'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Red-L', 'TSHIRT-RED-L', 100, 50000, 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Blue-S', 'TSHIRT-BLUE-S', 100, 50000, 'active'),
  ('10101010-1010-1010-1010-101010101010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Blue-M', 'TSHIRT-BLUE-M', 100, 50000, 'active'),
  ('20202020-2020-2020-2020-202020202020', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Blue-L', 'TSHIRT-BLUE-L', 100, 50000, 'active');
```

### 5. Create Warehouse Stock

```sql
-- Grosir allocation (bundle-based)
INSERT INTO grosir_allocations (id, product_id, variant_id, bundle_size, allocated_bundles, available_bundles, reserved_bundles, tolerance_percentage)
VALUES
  ('30303030-3030-3030-3030-303030303030', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 100, 10, 10, 0, 10.00),
  ('40404040-4040-4040-4040-404040404040', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 100, 10, 10, 0, 10.00),
  ('50505050-5050-5050-5050-505050505050', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 100, 10, 10, 0, 10.00),
  ('60606060-6060-6060-6060-606060606060', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 100, 10, 10, 0, 10.00),
  ('70707070-7070-7070-7070-707070707070', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10101010-1010-1010-1010-101010101010', 100, 10, 10, 0, 10.00),
  ('80808080-8080-8080-8080-808080808080', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '20202020-2020-2020-2020-202020202020', 100, 10, 10, 0, 10.00);
```

---

## Test Scenarios

### Scenario 1: Group Buying Happy Path (MOQ Reached)

**Objective:** Test complete group buying flow when MOQ is reached naturally by real users.

**Test Steps:**

1. **Create Group Buying Session**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions" \
     -H "Content-Type: application/json" \
     -d '{
       "product_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
       "base_price": 50000,
       "tier_1_price": 47500,
       "tier_2_price": 45000,
       "tier_3_price": 42500,
       "min_order_quantity": 100,
       "duration_hours": 24,
       "variant_allocations": [
         {"variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "moq": 100}
       ]
     }'
   ```

   **Expected:** Session created with status `active`, expiry time = now + 24 hours

2. **User 1 Joins Session (50 units)**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "11111111-1111-1111-1111-111111111111",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 50
     }'
   ```

   **Expected:**
   - Participant created
   - Payment intent created with Xendit (escrow)
   - Current tier: 50% (tier 2 pricing: Rp 45,000)
   - Total: Rp 2,250,000

3. **User 2 Joins Session (60 units)**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "22222222-2222-2222-2222-222222222222",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 60
     }'
   ```

   **Expected:**
   - Total participants: 110 units (110% of MOQ)
   - Current tier: 100% (tier 3 pricing: Rp 42,500)
   - User 1 gets refund: (45,000 - 42,500) × 50 = Rp 125,000 to wallet
   - User 2 pays: Rp 42,500 × 60 = Rp 2,550,000

4. **Verify Wallet Refund (User 1)**
   ```bash
   curl -X GET "http://localhost:3010/api/balance/11111111-1111-1111-1111-111111111111"
   ```

   **Expected:**
   - Balance: Rp 125,000
   - Transaction type: `cashback`
   - Description: "Tier refund from group buying session..."

5. **Simulate Payment Success via Webhook**
   ```bash
   # Payment for User 1
   curl -X POST "http://localhost:3005/api/webhooks/payment" \
     -H "Content-Type: application/json" \
     -H "x-callback-token: your_xendit_webhook_token" \
     -d '{
       "external_id": "{user1_payment_id}",
       "status": "PAID",
       "amount": 2250000
     }'

   # Payment for User 2
   curl -X POST "http://localhost:3005/api/webhooks/payment" \
     -H "Content-Type: application/json" \
     -H "x-callback-token: your_xendit_webhook_token" \
     -d '{
       "external_id": "{user2_payment_id}",
       "status": "PAID",
       "amount": 2550000
     }'
   ```

   **Expected:**
   - Payment status: `paid`
   - Escrow status: `held`

6. **Manually Expire Session (or wait 24 hours)**
   ```bash
   # Update session to expired
   curl -X POST "http://localhost:3004/api/group-buying/process-expired"
   ```

   **Expected:**
   - Session status: `completed`
   - Warehouse notified to fulfill demand
   - Purchase order created

7. **Warehouse Fulfills Demand**
   ```bash
   curl -X POST "http://localhost:3008/api/warehouse/fulfill-bundle-demand" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "{session_id}"
     }'
   ```

   **Expected:**
   - Grosir allocation updated (reserved_bundles incremented)
   - Purchase order status: `pending_production`
   - Callback to group-buying service

8. **Simulate Production Complete**
   ```sql
   -- Update purchase order status
   UPDATE purchase_orders
   SET status = 'completed', completed_at = NOW()
   WHERE group_session_id = '{session_id}';
   ```

9. **Group Buying Service Creates Orders**
   ```bash
   # This should happen automatically after production complete
   # Or manually trigger:
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/finalize"
   ```

   **Expected:**
   - Orders created for User 1 (50 units) and User 2 (60 units)
   - Escrow released to factory
   - Session status: `finalized`
   - Users notified

**Success Criteria:**
- ✅ Both users have orders with status `pending_shipment`
- ✅ Factory received payment (escrow released)
- ✅ User 1 received Rp 125,000 wallet refund
- ✅ Warehouse allocation locked correctly
- ✅ No bot participants involved

---

### Scenario 2: Bot Participant Auto-Join (< 25% at T-10min)

**Objective:** Test bot auto-join when session is under 25% filled at T-10 minutes.

**Test Steps:**

1. **Create Session with T-15 minutes expiry**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions" \
     -H "Content-Type: application/json" \
     -d '{
       "product_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
       "base_price": 50000,
       "tier_1_price": 47500,
       "tier_2_price": 45000,
       "tier_3_price": 42500,
       "min_order_quantity": 100,
       "duration_hours": 0.25,
       "variant_allocations": [
         {"variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "moq": 100}
       ]
     }'
   ```

2. **User Joins with Only 20 Units (20% of MOQ)**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "11111111-1111-1111-1111-111111111111",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 20
     }'
   ```

3. **Wait or Manually Trigger Near-Expiration Processing**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/process-near-expiration"
   ```

   **Expected:**
   - Bot user joins with remaining units to reach 25% (5 units)
   - Total: 25 units (25% of MOQ)
   - Bot participant created with `is_bot: true`

4. **Verify Bot Participation**
   ```sql
   SELECT * FROM group_participants
   WHERE session_id = '{session_id}' AND user_id = '00000000-0000-0000-0000-000000000001';
   ```

   **Expected:**
   - Bot participant exists
   - Quantity: 5 units
   - is_bot: true

5. **Session Expires (MOQ Not Reached)**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/process-expired"
   ```

   **Expected:**
   - Session status: `failed`
   - Bot participant deleted
   - User refunded (escrow returned)
   - No orders created

**Success Criteria:**
- ✅ Bot auto-joined at T-10 minutes
- ✅ Bot filled gap to 25%
- ✅ Bot deleted after session failed
- ✅ User received full refund

---

### Scenario 3: Wallet Withdrawal Flow (Happy Path)

**Objective:** Test complete withdrawal flow from request to bank disbursement.

**Test Steps:**

1. **Credit User Wallet**
   ```bash
   curl -X POST "http://localhost:3010/api/transactions/credit" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "33333333-3333-3333-3333-333333333333",
       "amount": 500000,
       "type": "cashback",
       "description": "Test tier refund"
     }'
   ```

   **Expected:**
   - Wallet balance: Rp 500,000

2. **Request Withdrawal**
   ```bash
   curl -X POST "http://localhost:3010/api/withdrawals/request" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "33333333-3333-3333-3333-333333333333",
       "amount": 200000,
       "bankCode": "BCA",
       "bankName": "Bank Central Asia",
       "accountNumber": "1234567890",
       "accountName": "Bob Wilson"
     }'
   ```

   **Expected:**
   - Withdrawal created
   - Status: `pending`
   - Amount: Rp 200,000
   - Fee: Rp 2,500
   - Net amount: Rp 197,500
   - Wallet balance: Rp 300,000 (500k - 200k)

3. **Process Batch Withdrawals (Simulate CRON)**
   ```bash
   curl -X POST "http://localhost:3010/api/withdrawals/process-batch"
   ```

   **Expected:**
   - Status: `processing`
   - xendit_disbursement_id: populated
   - Sent to Xendit Disbursement API

4. **Simulate Xendit Webhook (Success)**
   ```bash
   curl -X POST "http://localhost:3010/api/webhooks/disbursement" \
     -H "Content-Type: application/json" \
     -H "x-callback-token: your_webhook_token" \
     -d '{
       "id": "disb_test123",
       "external_id": "{withdrawal_id}",
       "status": "COMPLETED"
     }'
   ```

   **Expected:**
   - Status: `completed`
   - completed_at: timestamp populated
   - User receives Rp 197,500 in bank account

5. **Verify Final Wallet State**
   ```bash
   curl -X GET "http://localhost:3010/api/balance/33333333-3333-3333-3333-333333333333"
   ```

   **Expected:**
   - Balance: Rp 300,000
   - total_withdrawn: Rp 200,000

**Success Criteria:**
- ✅ Withdrawal processed successfully
- ✅ Correct fee deducted
- ✅ Xendit disbursement created
- ✅ Webhook handled correctly
- ✅ Wallet balance accurate

---

### Scenario 4: Failed Withdrawal with Auto-Refund

**Objective:** Test auto-refund when Xendit disbursement fails.

**Test Steps:**

1. **Request Withdrawal** (same as Scenario 3 step 2)

2. **Process Batch** (same as Scenario 3 step 3)

3. **Simulate Xendit Webhook (Failed)**
   ```bash
   curl -X POST "http://localhost:3010/api/webhooks/disbursement" \
     -H "Content-Type: application/json" \
     -H "x-callback-token: your_webhook_token" \
     -d '{
       "id": "disb_test456",
       "external_id": "{withdrawal_id}",
       "status": "FAILED",
       "failure_code": "INVALID_DESTINATION"
     }'
   ```

   **Expected:**
   - Status: `failed`
   - failed_reason: "INVALID_DESTINATION"
   - Amount refunded to wallet (Rp 200,000)

4. **Verify Wallet Refund**
   ```bash
   curl -X GET "http://localhost:3010/api/balance/33333333-3333-3333-3333-333333333333"
   ```

   **Expected:**
   - Balance: Rp 500,000 (original amount restored)
   - Transaction log shows refund with type `refund`

**Success Criteria:**
- ✅ Withdrawal marked as failed
- ✅ Full amount refunded to wallet
- ✅ User can retry withdrawal

---

### Scenario 5: Multi-Variant Session with Complex Allocations

**Objective:** Test session with multiple variants and warehouse allocation logic.

**Test Steps:**

1. **Create Multi-Variant Session**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions" \
     -H "Content-Type: application/json" \
     -d '{
       "product_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
       "base_price": 50000,
       "tier_1_price": 47500,
       "tier_2_price": 45000,
       "tier_3_price": 42500,
       "min_order_quantity": 300,
       "duration_hours": 24,
       "variant_allocations": [
         {"variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "moq": 100},
         {"variant_id": "dddddddd-dddd-dddd-dddd-dddddddddddd", "moq": 100},
         {"variant_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "moq": 100}
       ]
     }'
   ```

2. **Multiple Users Join Different Variants**
   ```bash
   # User 1: 120 units of Red-S (120% of variant MOQ)
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "11111111-1111-1111-1111-111111111111",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 120
     }'

   # User 2: 110 units of Red-M (110% of variant MOQ)
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "22222222-2222-2222-2222-222222222222",
       "variant_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
       "quantity": 110
     }'

   # User 3: 90 units of Red-L (90% of variant MOQ - insufficient)
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "33333333-3333-3333-3333-333333333333",
       "variant_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
       "quantity": 90
     }'
   ```

   **Expected:**
   - Total: 320 units across 3 variants
   - Overall session: 106% of total MOQ
   - Variant Red-S: 120% ✅
   - Variant Red-M: 110% ✅
   - Variant Red-L: 90% ❌ (below MOQ)

3. **Session Expires**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/process-expired"
   ```

   **Expected:**
   - Variants Red-S and Red-M: Proceed to production
   - Variant Red-L: Participants refunded (MOQ not reached)
   - User 3 receives full refund

4. **Warehouse Fulfillment**
   ```bash
   curl -X POST "http://localhost:3008/api/warehouse/fulfill-bundle-demand" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "{session_id}"
     }'
   ```

   **Expected:**
   - Red-S: 2 bundles reserved (120 units = 1.2 bundles, rounded up with tolerance)
   - Red-M: 2 bundles reserved (110 units = 1.1 bundles, rounded up)
   - Red-L: No allocation (refunded)

**Success Criteria:**
- ✅ Multi-variant logic works correctly
- ✅ Per-variant MOQ validation
- ✅ Failed variants refunded separately
- ✅ Successful variants proceed to production

---

### Scenario 6: Race Condition - Concurrent Joins

**Objective:** Test that concurrent user joins don't cause allocation conflicts.

**Test Steps:**

1. **Create Session with Limited Availability**
   ```bash
   # Update grosir allocation to only 1 bundle available
   UPDATE grosir_allocations
   SET available_bundles = 1
   WHERE variant_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
   ```

2. **Simulate 3 Concurrent Join Requests (each 50 units)**
   ```bash
   # Run these 3 commands in parallel (different terminals)

   # Terminal 1
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "11111111-1111-1111-1111-111111111111", "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "quantity": 50}'

   # Terminal 2
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "22222222-2222-2222-2222-222222222222", "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "quantity": 50}'

   # Terminal 3
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "33333333-3333-3333-3333-333333333333", "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "quantity": 50}'
   ```

   **Expected:**
   - First 2 requests succeed (total 100 units = 1 bundle)
   - Third request fails with "Insufficient inventory" error
   - No over-allocation

3. **Verify Database State**
   ```sql
   SELECT available_bundles, reserved_bundles
   FROM grosir_allocations
   WHERE variant_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
   ```

   **Expected:**
   - available_bundles: 0
   - reserved_bundles: 1
   - No negative values

**Success Criteria:**
- ✅ Atomic transaction prevents over-allocation
- ✅ Only 2 users successfully joined
- ✅ Third user receives clear error message
- ✅ Database consistency maintained

---

### Scenario 7: Tier Upgrade During Session

**Objective:** Test that users get wallet refunds when tier improves.

**Test Steps:**

1. **Create Session** (MOQ: 100 units)

2. **User 1 Joins at 25% Tier**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "11111111-1111-1111-1111-111111111111",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 25
     }'
   ```

   **Expected:**
   - Price: Rp 47,500 (tier 1)
   - Total paid: Rp 1,187,500

3. **User 2 Joins → Pushes to 50% Tier**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "22222222-2222-2222-2222-222222222222",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 25
     }'
   ```

   **Expected:**
   - User 1 refund: (47,500 - 45,000) × 25 = Rp 62,500
   - User 2 pays: Rp 45,000 × 25 = Rp 1,125,000

4. **User 3 Joins → Pushes to 75% Tier**
   ```bash
   curl -X POST "http://localhost:3004/api/group-buying/sessions/{session_id}/join" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "33333333-3333-3333-3333-333333333333",
       "variant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
       "quantity": 25
     }'
   ```

   **Expected:**
   - User 1 refund: (45,000 - 42,500) × 25 = Rp 62,500 (additional)
   - User 2 refund: (45,000 - 42,500) × 25 = Rp 62,500
   - User 3 pays: Rp 42,500 × 25 = Rp 1,062,500

5. **Verify Wallet Balances**
   ```bash
   # User 1 total refunds
   curl -X GET "http://localhost:3010/api/balance/11111111-1111-1111-1111-111111111111"
   # Expected: Rp 125,000 (62,500 + 62,500)

   # User 2 total refunds
   curl -X GET "http://localhost:3010/api/balance/22222222-2222-2222-2222-222222222222"
   # Expected: Rp 62,500
   ```

**Success Criteria:**
- ✅ Tier upgrades calculated correctly
- ✅ All previous participants refunded automatically
- ✅ Wallet transactions logged correctly

---

## Testing Tools

### 1. Swagger UI (Wallet Service)
```bash
cd services/wallet-service
npm run dev
# Open browser: http://localhost:3010/api-docs
```

### 2. Postman Collection
Import and test all endpoints with pre-configured requests.

### 3. Database Inspection
```bash
# Connect to test database
psql -U ecommerce_test -d ecommerce_test

# Useful queries
SELECT * FROM group_sessions WHERE status = 'active';
SELECT * FROM group_participants WHERE session_id = '{session_id}';
SELECT * FROM wallet_withdrawals WHERE status = 'pending';
SELECT * FROM grosir_allocations WHERE available_bundles < 5;
```

### 4. Log Monitoring
```bash
# PM2 logs
pm2 logs wallet-service
pm2 logs group-buying-service
pm2 logs payment-service

# Or direct service logs
cd services/wallet-service && npm run dev
```

---

## Test Execution Order

Execute tests in this order to avoid dependencies:

1. ✅ **Setup** - Database, migrations, test data
2. ✅ **Scenario 3** - Wallet withdrawal (standalone)
3. ✅ **Scenario 4** - Failed withdrawal (builds on 3)
4. ✅ **Scenario 1** - Group buying happy path (core flow)
5. ✅ **Scenario 7** - Tier upgrades (extends 1)
6. ✅ **Scenario 2** - Bot participants (edge case)
7. ✅ **Scenario 5** - Multi-variant (complex)
8. ✅ **Scenario 6** - Race conditions (stress test)

---

## Success Criteria

### Overall System
- [ ] All services start without errors
- [ ] Health endpoints return `200 OK`
- [ ] Database connections stable
- [ ] No SQL errors in logs

### Group Buying
- [ ] Sessions created successfully
- [ ] Users can join sessions
- [ ] MOQ validation works
- [ ] Tier pricing calculated correctly
- [ ] Tier refunds credited to wallet
- [ ] Bot participants auto-join at T-10min
- [ ] Bot deleted after session ends
- [ ] Expired sessions handled correctly
- [ ] Failed sessions refund users
- [ ] Successful sessions create orders

### Wallet & Withdrawals
- [ ] Credit transactions work
- [ ] Debit transactions work
- [ ] Withdrawal requests validated
- [ ] Batch processing sends to Xendit
- [ ] Webhooks update withdrawal status
- [ ] Failed withdrawals auto-refund
- [ ] Wallet balance always accurate
- [ ] No negative balances
- [ ] Fee calculation correct

### Warehouse & Inventory
- [ ] Grosir allocation reserved correctly
- [ ] Bundle rounding logic works
- [ ] Tolerance applied correctly
- [ ] No over-allocation
- [ ] Race conditions handled
- [ ] Purchase orders created
- [ ] Warehouse fulfillment callback works

### Payment & Escrow
- [ ] Payment intents created
- [ ] Webhooks verified (HMAC-SHA256)
- [ ] Escrow held until production
- [ ] Escrow released after completion
- [ ] Refunds processed for failed sessions
- [ ] No payment leakage

### Integration
- [ ] Services communicate correctly
- [ ] Webhooks delivered reliably
- [ ] CRON jobs execute on schedule
- [ ] Notifications sent to users
- [ ] End-to-end flow completes

---

## Test Report Template

After each scenario, document:

```markdown
### Test: [Scenario Name]
**Date:** [Date]
**Tester:** [Name]
**Status:** ✅ PASS / ❌ FAIL

**Results:**
- Step 1: ✅ PASS
- Step 2: ✅ PASS
- Step 3: ❌ FAIL - [Error description]

**Issues Found:**
1. [Issue description]
2. [Issue description]

**Screenshots/Logs:**
[Attach relevant evidence]

**Notes:**
[Additional observations]
```

---

## Next Steps After Testing

1. **Fix Critical Bugs** - Address any failures immediately
2. **Performance Testing** - Load test with 100+ concurrent users
3. **Security Audit** - Penetration testing, vulnerability scan
4. **Deploy to Staging** - Test in production-like environment
5. **User Acceptance Testing** - Real users test flows
6. **Production Deployment** - Follow DEPLOYMENT.md guide

---

**For questions or issues during testing, refer to:**
- [COMPREHENSIVE_FLOW_SUMMARY.md](./COMPREHENSIVE_FLOW_SUMMARY.md) - Business logic
- [WALLET_SERVICE_API.md](./WALLET_SERVICE_API.md) - Wallet API docs
- [CRON_SETUP.md](./CRON_SETUP.md) - CRON configuration
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
