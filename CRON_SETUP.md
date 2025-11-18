# CRON Job Setup Guide

This document describes the required CRON jobs for the e-commerce platform and provides setup examples for various infrastructure providers.

## Required CRON Jobs

### 1. Process Near-Expiration Sessions (Group Buying)
- **Endpoint**: `POST http://localhost:3004/api/group-buying/process-near-expiration`
- **Schedule**: Every 2 minutes
- **Purpose**: Checks sessions expiring in 8-10 minutes and creates bot participants if < 25% filled
- **Service**: group-buying-service (Port 3004)

### 2. Process Expired Sessions (Group Buying)
- **Endpoint**: `POST http://localhost:3004/api/group-buying/process-expired`
- **Schedule**: Every 5 minutes
- **Purpose**: Finalizes expired sessions, creates orders, triggers warehouse stock allocation
- **Service**: group-buying-service (Port 3004)

### 3. Process Batch Withdrawals (Wallet)
- **Endpoint**: `POST http://localhost:3010/api/withdrawals/process-batch`
- **Schedule**: Twice per week (Tuesday & Friday at 10:00 AM GMT+7)
- **Purpose**: Processes pending wallet withdrawals via Xendit Disbursement API
- **Service**: wallet-service (Port 3010)

---

## Setup Examples

### Option 1: Traditional Crontab (Linux/Unix)

```bash
# Edit crontab
crontab -e

# Add these entries:
# Process near-expiration sessions every 2 minutes
*/2 * * * * curl -X POST http://localhost:3004/api/group-buying/process-near-expiration

# Process expired sessions every 5 minutes
*/5 * * * * curl -X POST http://localhost:3004/api/group-buying/process-expired

# Process batch withdrawals - Tuesday & Friday at 10 AM Jakarta time (GMT+7)
# Note: If your server is in UTC, adjust to 03:00 (10 AM GMT+7 = 3 AM UTC)
0 3 * * 2,5 curl -X POST http://localhost:3010/api/withdrawals/process-batch
```

### Option 2: AWS EventBridge (Recommended for Production)

#### Near-Expiration Processor
```json
{
  "ScheduleExpression": "rate(2 minutes)",
  "Target": {
    "Arn": "arn:aws:lambda:region:account:function:cron-handler",
    "Input": "{\"endpoint\": \"http://group-buying-service:3004/api/group-buying/process-near-expiration\", \"method\": \"POST\"}"
  }
}
```

#### Expired Sessions Processor
```json
{
  "ScheduleExpression": "rate(5 minutes)",
  "Target": {
    "Arn": "arn:aws:lambda:region:account:function:cron-handler",
    "Input": "{\"endpoint\": \"http://group-buying-service:3004/api/group-buying/process-expired\", \"method\": \"POST\"}"
  }
}
```

#### Batch Withdrawals Processor
```json
{
  "ScheduleExpression": "cron(0 3 ? * TUE,FRI *)",
  "Target": {
    "Arn": "arn:aws:lambda:region:account:function:cron-handler",
    "Input": "{\"endpoint\": \"http://wallet-service:3010/api/withdrawals/process-batch\", \"method\": \"POST\"}"
  }
}
```

**Lambda Handler Example** (`cron-handler`):
```javascript
const axios = require('axios');

exports.handler = async (event) => {
  try {
    const response = await axios({
      method: event.method,
      url: event.endpoint,
      timeout: 30000
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('CRON job failed:', error);
    throw error;
  }
};
```

### Option 3: Google Cloud Scheduler

#### Near-Expiration Processor
```bash
gcloud scheduler jobs create http near-expiration-processor \
  --schedule="*/2 * * * *" \
  --uri="https://your-domain.com/api/group-buying/process-near-expiration" \
  --http-method=POST \
  --time-zone="Asia/Jakarta"
```

#### Expired Sessions Processor
```bash
gcloud scheduler jobs create http expired-sessions-processor \
  --schedule="*/5 * * * *" \
  --uri="https://your-domain.com/api/group-buying/process-expired" \
  --http-method=POST \
  --time-zone="Asia/Jakarta"
```

#### Batch Withdrawals Processor
```bash
gcloud scheduler jobs create http batch-withdrawals-processor \
  --schedule="0 10 * * 2,5" \
  --uri="https://your-domain.com/api/withdrawals/process-batch" \
  --http-method=POST \
  --time-zone="Asia/Jakarta"
```

### Option 4: Kubernetes CronJob

#### near-expiration-processor.yaml
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: near-expiration-processor
spec:
  schedule: "*/2 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: curl
            image: curlimages/curl:latest
            args:
            - "-X"
            - "POST"
            - "http://group-buying-service:3004/api/group-buying/process-near-expiration"
          restartPolicy: OnFailure
```

#### expired-sessions-processor.yaml
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: expired-sessions-processor
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: curl
            image: curlimages/curl:latest
            args:
            - "-X"
            - "POST"
            - "http://group-buying-service:3004/api/group-buying/process-expired"
          restartPolicy: OnFailure
```

#### batch-withdrawals-processor.yaml
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: batch-withdrawals-processor
spec:
  schedule: "0 3 * * 2,5"  # 10 AM Jakarta = 3 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: curl
            image: curlimages/curl:latest
            args:
            - "-X"
            - "POST"
            - "http://wallet-service:3010/api/withdrawals/process-batch"
          restartPolicy: OnFailure
```

Apply with:
```bash
kubectl apply -f near-expiration-processor.yaml
kubectl apply -f expired-sessions-processor.yaml
kubectl apply -f batch-withdrawals-processor.yaml
```

### Option 5: Node-Cron (Development Only)

**⚠️ WARNING: Not recommended for production** (single point of failure, no scaling)

```javascript
// cron-scheduler.js
const cron = require('node-cron');
const axios = require('axios');

// Every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  console.log('Running near-expiration processor...');
  try {
    await axios.post('http://localhost:3004/api/group-buying/process-near-expiration');
  } catch (error) {
    console.error('Near-expiration processor failed:', error);
  }
});

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running expired sessions processor...');
  try {
    await axios.post('http://localhost:3004/api/group-buying/process-expired');
  } catch (error) {
    console.error('Expired sessions processor failed:', error);
  }
});

// Tuesday & Friday at 10 AM Jakarta time
cron.schedule('0 10 * * 2,5', async () => {
  console.log('Running batch withdrawals processor...');
  try {
    await axios.post('http://localhost:3010/api/withdrawals/process-batch');
  } catch (error) {
    console.error('Batch withdrawals processor failed:', error);
  }
}, {
  timezone: "Asia/Jakarta"
});

console.log('CRON scheduler started');
```

Run with:
```bash
npm install node-cron axios
node cron-scheduler.js
```

---

## Environment Variables Required

Ensure these environment variables are set for the services:

### Group Buying Service (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
WAREHOUSE_SERVICE_URL=http://localhost:3008
PAYMENT_SERVICE_URL=http://localhost:3005
```

### Wallet Service (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
XENDIT_SECRET_KEY=xnd_development_xxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token_here
```

---

## Monitoring & Alerting

### Health Checks

Add monitoring to ensure CRON jobs are running:

```bash
# Check last execution time
curl http://localhost:3004/health
curl http://localhost:3010/health
```

### Recommended Monitoring
- Set up dead letter queue (DLQ) for failed jobs
- Alert if CRON hasn't run in expected interval
- Log all CRON executions with timestamps
- Monitor Xendit disbursement failure rates

### CloudWatch Example (AWS)
```javascript
// In your CRON endpoint handlers
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

await cloudwatch.putMetricData({
  Namespace: 'Ecommerce/CRON',
  MetricData: [{
    MetricName: 'WithdrawalProcessorSuccess',
    Value: 1,
    Unit: 'Count'
  }]
}).promise();
```

---

## Troubleshooting

### Jobs Not Running
1. Check service health endpoints
2. Verify network connectivity between CRON scheduler and services
3. Check service logs for errors
4. Verify environment variables are set

### Sessions Not Processing
- Check database connectivity
- Verify timezone settings (Asia/Jakarta = GMT+7)
- Ensure sufficient database connections in pool

### Withdrawals Failing
- Verify `XENDIT_SECRET_KEY` is set and valid
- Check Xendit account balance and limits
- Review Xendit API logs in dashboard
- Verify bank codes are correct (BCA, BNI, MANDIRI, etc.)

---

## Testing CRON Jobs

You can manually trigger CRON jobs for testing:

```bash
# Test near-expiration processor
curl -X POST http://localhost:3004/api/group-buying/process-near-expiration

# Test expired sessions processor
curl -X POST http://localhost:3004/api/group-buying/process-expired

# Test batch withdrawals
curl -X POST http://localhost:3010/api/withdrawals/process-batch
```

Expected responses:
```json
{
  "success": true,
  "data": {
    "processed": 5,
    "failed": 0
  }
}
```

---

## Production Recommendations

1. **Use AWS EventBridge or Google Cloud Scheduler** - Most reliable for production
2. **Set up monitoring and alerting** - Know when jobs fail
3. **Implement retry logic** - Services should handle transient failures
4. **Use idempotency** - Jobs should be safe to run multiple times
5. **Log everything** - Track all CRON executions with structured logging
6. **Test timezone handling** - Ensure withdrawal times match business hours in Jakarta

---

## Security Notes

- **Never expose CRON endpoints publicly** - Use VPC/private networking
- **Add authentication** - Consider API keys or IP whitelisting for CRON endpoints
- **Rate limiting** - Prevent accidental double-triggering
- **Audit logs** - Track who/what triggered each CRON execution
