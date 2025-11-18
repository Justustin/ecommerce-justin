# Wallet Service API Documentation

Complete API documentation and testing guide for the Wallet Service.

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Swagger UI](#swagger-ui)
- [API Endpoints](#api-endpoints)
- [Testing Guide](#testing-guide)
- [Webhook Integration](#webhook-integration)
- [CRON Job](#cron-job)

---

## Quick Start

### Prerequisites
```bash
# 1. Ensure PostgreSQL is running with wallet tables
# 2. Set environment variables
cd services/wallet-service
cp .env.example .env
```

### Environment Variables
```env
PORT=3010
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
XENDIT_SECRET_KEY=xnd_development_xxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
```

### Start the Service
```bash
# Install dependencies
npm install

# Generate Prisma client
cd ../../packages/database
npx prisma generate

# Start wallet service
cd ../../services/wallet-service
npm run dev
```

The service will run on `http://localhost:3010`

---

## Swagger UI

**Interactive API Documentation:** `http://localhost:3010/api-docs`

The Swagger UI provides:
- ✅ Complete API documentation
- ✅ Request/response schemas
- ✅ Try-it-out functionality
- ✅ Example requests

---

## API Endpoints

### 1. Get Wallet Balance

**Endpoint:** `GET /api/balance/:userId`

**Description:** Retrieve wallet balance for a user

**cURL:**
```bash
curl -X GET "http://localhost:3010/api/balance/123e4567-e89b-12d3-a456-426614174001"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "balance": 150000.00,
    "total_earned": 500000.00,
    "total_spent": 200000.00,
    "total_withdrawn": 150000.00,
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-18T15:30:00.000Z"
  }
}
```

---

### 2. Credit Transaction

**Endpoint:** `POST /api/transactions/credit`

**Description:** Add funds to a wallet (cashback, refunds, tier refunds)

**cURL:**
```bash
curl -X POST "http://localhost:3010/api/transactions/credit" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174001",
    "amount": 25000.00,
    "type": "cashback",
    "description": "Tier refund from group buying session #12345",
    "referenceId": "session-uuid-here",
    "referenceType": "group_session"
  }'
```

**Request Body:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174001",
  "amount": 25000.00,
  "type": "cashback",
  "description": "Tier refund from group buying session #12345",
  "referenceId": "session-uuid-here",
  "referenceType": "group_session"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-uuid",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "amount": 25000.00,
    "type": "cashback",
    "description": "Tier refund from group buying session #12345",
    "reference_type": "group_session",
    "reference_id": "session-uuid-here",
    "balance_before": 100000.00,
    "balance_after": 125000.00,
    "created_at": "2025-01-18T15:30:00.000Z"
  }
}
```

**Valid Transaction Types:**
- `cashback` - Tier refund when user gets better price
- `deposit` - Manual deposit (admin)
- `refund` - Refund from cancelled order

---

### 3. Request Withdrawal

**Endpoint:** `POST /api/withdrawals/request`

**Description:** User requests withdrawal to bank account

**Business Rules:**
- ✅ Minimum amount: Rp 10,000 (including Rp 2,500 fee)
- ✅ Fee: Rp 2,500 (flat)
- ✅ Processing: 2x per week (Tuesday & Friday 10 AM Jakarta time)
- ✅ Time to complete: 1-4 days maximum
- ✅ Auto-refund to wallet if disbursement fails

**cURL:**
```bash
curl -X POST "http://localhost:3010/api/withdrawals/request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174001",
    "amount": 100000.00,
    "bankCode": "BCA",
    "bankName": "Bank Central Asia",
    "accountNumber": "1234567890",
    "accountName": "John Doe"
  }'
```

**Request Body:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174001",
  "amount": 100000.00,
  "bankCode": "BCA",
  "bankName": "Bank Central Asia",
  "accountNumber": "1234567890",
  "accountName": "John Doe"
}
```

**Supported Bank Codes:**
- `BCA` - Bank Central Asia
- `BNI` - Bank Negara Indonesia
- `BRI` - Bank Rakyat Indonesia
- `MANDIRI` - Bank Mandiri
- `CIMB` - CIMB Niaga
- `PERMATA` - Bank Permata
- `DANAMON` - Bank Danamon
- `BTN` - Bank Tabungan Negara

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "withdrawal-uuid",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "amount": 100000.00,
    "withdrawal_fee": 2500.00,
    "net_amount": 97500.00,
    "bank_code": "BCA",
    "bank_name": "Bank Central Asia",
    "account_number": "1234567890",
    "account_name": "John Doe",
    "status": "pending",
    "requested_at": "2025-01-18T15:30:00.000Z"
  }
}
```

**Error Responses:**

**Insufficient Balance:**
```json
{
  "success": false,
  "error": "Insufficient wallet balance."
}
```

**Amount Too Low:**
```json
{
  "success": false,
  "error": "Withdrawal amount must be greater than the fee of Rp 2500"
}
```

---

### 4. Process Batch Withdrawals (CRON Only)

**Endpoint:** `POST /api/withdrawals/process-batch`

**Description:** Process all pending withdrawals via Xendit Disbursement API

**Schedule:** Tuesday & Friday at 10:00 AM Jakarta time (GMT+7)

**cURL:**
```bash
curl -X POST "http://localhost:3010/api/withdrawals/process-batch"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Batch processing completed",
    "processed": 5,
    "failed": 1,
    "errors": [
      {
        "withdrawal_id": "withdrawal-uuid-123",
        "error": "Invalid bank account number"
      }
    ]
  }
}
```

**What Happens:**
1. ✅ Gets all withdrawals with `status = 'pending'`
2. ✅ Calls Xendit Create Disbursement API for each
3. ✅ Updates status to `processing` on success
4. ✅ Updates status to `failed` and refunds to wallet on error
5. ✅ Creates transaction log for refunds
6. ✅ Returns summary of results

---

### 5. Xendit Disbursement Webhook

**Endpoint:** `POST /api/webhooks/disbursement`

**Description:** Receives status updates from Xendit when disbursement completes or fails

**Security:** Webhook signature verification using `XENDIT_WEBHOOK_VERIFICATION_TOKEN`

**Example Payload (COMPLETED):**
```json
{
  "id": "disb_abc123xyz",
  "external_id": "withdrawal-uuid-from-your-db",
  "status": "COMPLETED",
  "amount": 97500,
  "bank_code": "BCA",
  "account_holder_name": "John Doe",
  "disbursement_description": "Wallet withdrawal - withdrawal-uuid",
  "created": "2025-01-19T03:15:00.000Z",
  "updated": "2025-01-19T03:20:00.000Z"
}
```

**Example Payload (FAILED):**
```json
{
  "id": "disb_abc123xyz",
  "external_id": "withdrawal-uuid-from-your-db",
  "status": "FAILED",
  "failure_code": "INVALID_DESTINATION",
  "amount": 97500,
  "bank_code": "BCA",
  "account_holder_name": "John Doe"
}
```

**What Happens on COMPLETED:**
1. ✅ Updates withdrawal status to `completed`
2. ✅ Sets `completed_at` timestamp
3. ✅ User receives money in their bank account

**What Happens on FAILED:**
1. ✅ Updates withdrawal status to `failed`
2. ✅ Stores failure reason
3. ✅ **Automatically refunds amount to user's wallet**
4. ✅ Creates transaction log with refund details
5. ✅ User can request withdrawal again

**Response:**
```json
{
  "received": true
}
```

---

## Testing Guide

### Test Scenario 1: Complete Withdrawal Flow (Happy Path)

```bash
# Step 1: Check initial balance
curl -X GET "http://localhost:3010/api/balance/user-uuid-here"

# Step 2: Credit some money to wallet (simulate tier refund)
curl -X POST "http://localhost:3010/api/transactions/credit" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "amount": 100000.00,
    "type": "cashback",
    "description": "Test tier refund"
  }'

# Step 3: Request withdrawal
curl -X POST "http://localhost:3010/api/withdrawals/request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "amount": 50000.00,
    "bankCode": "BCA",
    "bankName": "Bank Central Asia",
    "accountNumber": "1234567890",
    "accountName": "Test User"
  }'
# Result: Status = "pending", net_amount = 47500 (50000 - 2500 fee)

# Step 4: Run batch processor (simulate CRON)
curl -X POST "http://localhost:3010/api/withdrawals/process-batch"
# Result: Status changes to "processing", sent to Xendit

# Step 5: Simulate Xendit webhook (COMPLETED)
curl -X POST "http://localhost:3010/api/webhooks/disbursement" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: your_webhook_token_here" \
  -d '{
    "id": "disb_test123",
    "external_id": "withdrawal-uuid-from-step-3",
    "status": "COMPLETED"
  }'
# Result: Status changes to "completed"

# Step 6: Check final balance
curl -X GET "http://localhost:3010/api/balance/user-uuid-here"
# Result: Balance decreased by 50000
```

---

### Test Scenario 2: Failed Withdrawal with Auto-Refund

```bash
# Step 1: Request withdrawal (same as above)
curl -X POST "http://localhost:3010/api/withdrawals/request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "amount": 50000.00,
    "bankCode": "BCA",
    "bankName": "Bank Central Asia",
    "accountNumber": "INVALID",
    "accountName": "Test User"
  }'

# Step 2: Run batch processor
curl -X POST "http://localhost:3010/api/withdrawals/process-batch"
# Result: Status changes to "processing"

# Step 3: Simulate Xendit webhook (FAILED)
curl -X POST "http://localhost:3010/api/webhooks/disbursement" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: your_webhook_token_here" \
  -d '{
    "id": "disb_test456",
    "external_id": "withdrawal-uuid-from-step-1",
    "status": "FAILED",
    "failure_code": "INVALID_DESTINATION"
  }'
# Result: Status = "failed", amount refunded to wallet

# Step 4: Check balance
curl -X GET "http://localhost:3010/api/balance/user-uuid-here"
# Result: Balance back to original (auto-refunded)
```

---

### Test Scenario 3: Insufficient Balance

```bash
curl -X POST "http://localhost:3010/api/withdrawals/request" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "amount": 999999999.00,
    "bankCode": "BCA",
    "bankName": "Bank Central Asia",
    "accountNumber": "1234567890",
    "accountName": "Test User"
  }'

# Expected Response:
# {
#   "success": false,
#   "error": "Insufficient wallet balance."
# }
```

---

## Webhook Integration

### Xendit Dashboard Setup

1. **Login to Xendit Dashboard**
2. **Go to Settings → Webhooks**
3. **Add Webhook URL:**
   - URL: `https://yourdomain.com/api/webhooks/disbursement`
   - Environment: Production
   - Events: Select "Disbursement Status"
4. **Copy Verification Token**
   - Save to `.env` as `XENDIT_WEBHOOK_VERIFICATION_TOKEN`

### Testing Webhooks Locally

**Using ngrok:**
```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start wallet service
npm run dev

# 3. Expose localhost to internet
ngrok http 3010

# 4. Copy ngrok URL and add to Xendit dashboard
# Example: https://abc123.ngrok.io/api/webhooks/disbursement
```

**Using Xendit Webhook Simulator:**
1. Go to Xendit Dashboard → Webhooks
2. Click "Send Test Webhook"
3. Select "Disbursement"
4. Choose status: COMPLETED or FAILED
5. Enter your external_id (withdrawal UUID)
6. Send

---

## CRON Job

See [CRON_SETUP.md](./CRON_SETUP.md) for complete setup instructions.

**Quick Setup (AWS EventBridge):**
```json
{
  "ScheduleExpression": "cron(0 3 ? * TUE,FRI *)",
  "Target": {
    "Arn": "arn:aws:lambda:region:account:function:cron-handler",
    "Input": "{\"endpoint\": \"http://wallet-service:3010/api/withdrawals/process-batch\", \"method\": \"POST\"}"
  }
}
```

**Schedule:** Tuesday & Friday at 3 AM UTC (10 AM Jakarta GMT+7)

---

## Status Flow

```
User Requests Withdrawal
    ↓
Status: pending
    ↓
CRON runs (Tue/Fri 10 AM)
    ↓
Status: processing (sent to Xendit)
    ↓
    ├─ Xendit Success → Status: completed (user gets money)
    └─ Xendit Fails → Status: failed (auto-refund to wallet)
```

---

## Error Handling

**Race Condition Prevention:**
- ✅ Atomic balance check and update using Prisma `updateMany` with `WHERE` clause
- ✅ Transaction rollback if balance insufficient

**Webhook Deduplication:**
- ✅ Idempotent webhook handling (can receive same webhook multiple times)

**Retry Logic:**
- ✅ Xendit disbursement API has automatic retries (handled by Xendit)
- ✅ Failed disbursements auto-refunded to wallet for user to retry

---

## Monitoring

**Key Metrics to Track:**
- Total withdrawals requested per day
- Withdrawal success rate (completed / total)
- Average processing time (requested_at → completed_at)
- Failed withdrawal reasons (group by failure_code)
- Total fees collected

**Recommended Alerts:**
- ❗ Withdrawal failure rate > 10%
- ❗ CRON job hasn't run in 4 days
- ❗ Pending withdrawals > 100

---

## Support

**Common Issues:**

**Q: Withdrawal stuck in "pending"**
A: CRON job runs 2x per week. Wait until Tuesday or Friday 10 AM.

**Q: Withdrawal failed but no refund**
A: Check webhook logs. Ensure webhook signature is valid.

**Q: Invalid webhook signature error**
A: Verify `XENDIT_WEBHOOK_VERIFICATION_TOKEN` matches Xendit dashboard.

**Q: Xendit API error 401**
A: Check `XENDIT_SECRET_KEY` is correct and has disbursement permissions.

---

## Next Steps

1. ✅ Test locally using Swagger UI
2. ✅ Set up Xendit webhook with ngrok
3. ✅ Test complete withdrawal flow
4. ✅ Set up CRON job (see [CRON_SETUP.md](./CRON_SETUP.md))
5. ✅ Deploy to production
6. ✅ Configure production Xendit webhook URL

For deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).
