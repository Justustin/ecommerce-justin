# Integration Testing Plan

Comprehensive integration testing guide for the e-commerce group buying platform. Integration tests verify that different components work together correctly.

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Setup & Configuration](#setup--configuration)
3. [Test Environment](#test-environment)
4. [API Integration Tests](#api-integration-tests)
5. [Service-to-Service Integration](#service-to-service-integration)
6. [Database Integration Tests](#database-integration-tests)
7. [External API Integration](#external-api-integration)
8. [Test Data Management](#test-data-management)
9. [Running Tests](#running-tests)

---

## Testing Philosophy

### What is Integration Testing?

Integration tests verify that different components work together correctly:
- **API + Database** - HTTP endpoints with real database operations
- **Service + Service** - Microservice communication
- **Application + External APIs** - Xendit, Biteship integration
- **Complete Flows** - Multi-step business processes

### Integration Tests vs Unit Tests vs E2E Tests

| Aspect | Unit Tests | Integration Tests | E2E Tests |
|--------|-----------|-------------------|-----------|
| **Scope** | Single function | Multiple components | Entire system |
| **Database** | Mocked | Real (test DB) | Real (test DB) |
| **External APIs** | Mocked | Mocked/Stubbed | Real/Staged |
| **Speed** | Milliseconds | Seconds | Minutes |
| **Quantity** | Many (70%) | Some (20%) | Few (10%) |

### What to Test (Integration Level)

✅ **API endpoints** with database operations
✅ **Service communication** (HTTP calls between services)
✅ **Database transactions** and consistency
✅ **Webhook handling** with signature verification
✅ **Business flows** spanning multiple operations
✅ **Error handling** across component boundaries

### What NOT to Test

❌ Business logic calculations (unit tests)
❌ Complete user journeys with UI (E2E tests)
❌ Performance/load testing (separate suite)

---

## Setup & Configuration

### 1. Install Testing Dependencies

```bash
# Each service directory
npm install --save-dev supertest @types/supertest
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @faker-js/faker
npm install --save-dev testcontainers  # Optional: for Docker-based test DB
```

### 2. Jest Configuration for Integration Tests

**jest.integration.config.js** (in each service):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run tests serially to avoid DB conflicts
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
  ],
};
```

### 3. Test Database Setup

**tests/integration/setup.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
});

beforeAll(async () => {
  // Reset test database
  execSync('npx prisma migrate reset --force --skip-seed', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    },
  });

  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean all tables before each test
  const tables = [
    'group_participants',
    'group_sessions',
    'wallet_withdrawals',
    'wallet_transactions',
    'user_wallets',
    'grosir_allocations',
    'product_variants',
    'products',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
  }
});

export { prisma };
```

### 4. Environment Configuration

**.env.test** (each service):
```env
NODE_ENV=test
PORT=3004
DATABASE_URL_TEST=postgresql://test_user:test_pass@localhost:5432/ecommerce_test
XENDIT_SECRET_KEY=test_xendit_key
WAREHOUSE_SERVICE_URL=http://localhost:3008
PAYMENT_SERVICE_URL=http://localhost:3005
BOT_USER_ID=00000000-0000-0000-0000-000000000001
```

### 5. Update package.json

```json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.js",
    "test:integration:watch": "jest --config jest.integration.config.js --watch",
    "test:integration:coverage": "jest --config jest.integration.config.js --coverage"
  }
}
```

---

## Test Environment

### Directory Structure

```
services/wallet-service/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── index.ts
├── tests/
│   ├── integration/
│   │   ├── setup.ts
│   │   ├── helpers/
│   │   │   ├── testData.ts
│   │   │   └── apiClient.ts
│   │   ├── wallet.api.test.ts
│   │   ├── withdrawal.api.test.ts
│   │   └── webhook.api.test.ts
│   └── fixtures/
│       ├── users.json
│       └── wallets.json
└── jest.integration.config.js
```

### Test Helpers

**tests/integration/helpers/testData.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function createTestUser(overrides = {}) {
  return await prisma.users.create({
    data: {
      phone_number: faker.phone.number('+628##########'),
      password_hash: '$2b$10$testhashedpassword',
      first_name: faker.person.firstName(),
      role: 'customer',
      status: 'active',
      ...overrides,
    },
  });
}

export async function createTestWallet(userId: string, balance = 0) {
  return await prisma.user_wallets.create({
    data: {
      user_id: userId,
      balance,
      total_earned: balance,
    },
  });
}

export async function createTestProduct(factoryId: string) {
  return await prisma.products.create({
    data: {
      factory_id: factoryId,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      status: 'active',
    },
  });
}

export async function createTestVariant(productId: string, moq = 100) {
  return await prisma.product_variants.create({
    data: {
      product_id: productId,
      variant_name: `${faker.color.human()}-${faker.helpers.arrayElement(['S', 'M', 'L'])}`,
      sku: faker.string.alphanumeric(10).toUpperCase(),
      moq,
      base_price: 50000,
      status: 'active',
    },
  });
}

export async function createTestFactory() {
  return await prisma.factories.create({
    data: {
      name: faker.company.name(),
      phone_number: faker.phone.number('+628##########'),
      status: 'active',
    },
  });
}

export async function createGroupSession(productId: string, variantIds: string[], moq = 100) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return await prisma.group_sessions.create({
    data: {
      product_id: productId,
      base_price: 50000,
      tier_1_price: 47500,
      tier_2_price: 45000,
      tier_3_price: 42500,
      min_order_quantity: moq,
      current_quantity: 0,
      status: 'active',
      expires_at: expiresAt,
      variant_allocations: {
        create: variantIds.map(variantId => ({
          variant_id: variantId,
          moq: moq,
          current_quantity: 0,
        })),
      },
    },
    include: {
      variant_allocations: true,
    },
  });
}
```

**tests/integration/helpers/apiClient.ts:**
```typescript
import request from 'supertest';
import app from '../../../src/index';

export class APIClient {
  async get(path: string, headers = {}) {
    return request(app)
      .get(path)
      .set(headers);
  }

  async post(path: string, body: any, headers = {}) {
    return request(app)
      .post(path)
      .send(body)
      .set(headers);
  }

  async put(path: string, body: any, headers = {}) {
    return request(app)
      .put(path)
      .send(body)
      .set(headers);
  }

  async delete(path: string, headers = {}) {
    return request(app)
      .delete(path)
      .set(headers);
  }
}

export const api = new APIClient();
```

---

## API Integration Tests

### 1. Wallet API Tests

**tests/integration/wallet.api.test.ts:**
```typescript
import { api } from './helpers/apiClient';
import { createTestUser, createTestWallet } from './helpers/testData';
import { prisma } from './setup';

describe('Wallet API', () => {
  describe('GET /api/balance/:userId', () => {
    it('should return wallet balance for existing user', async () => {
      // Arrange
      const user = await createTestUser();
      const wallet = await createTestWallet(user.id, 500000);

      // Act
      const response = await api.get(`/api/balance/${user.id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        balance: '500000.00',
        total_earned: '500000.00',
        total_withdrawn: '0.00',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await api.get('/api/balance/00000000-0000-0000-0000-999999999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Wallet not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await api.get('/api/balance/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid user ID');
    });
  });

  describe('POST /api/transactions/credit', () => {
    it('should credit wallet and create transaction', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 100000);

      // Act
      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: 50000,
        type: 'cashback',
        description: 'Tier refund',
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.transaction).toMatchObject({
        amount: '50000.00',
        type: 'cashback',
      });

      // Verify wallet balance updated
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('150000.00');
    });

    it('should reject negative amount', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id);

      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: -10000,
        type: 'cashback',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Amount must be positive');
    });

    it('should create wallet if not exists', async () => {
      const user = await createTestUser();

      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: 50000,
        type: 'cashback',
      });

      expect(response.status).toBe(201);

      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet).toBeDefined();
      expect(wallet?.balance.toString()).toBe('50000.00');
    });
  });

  describe('POST /api/transactions/debit', () => {
    it('should debit wallet when sufficient balance', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const response = await api.post('/api/transactions/debit', {
        userId: user.id,
        amount: 200000,
        type: 'withdrawal',
      });

      expect(response.status).toBe(201);

      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('300000.00');
    });

    it('should reject debit when insufficient balance', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 50000);

      const response = await api.post('/api/transactions/debit', {
        userId: user.id,
        amount: 100000,
        type: 'withdrawal',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient balance');
    });
  });
});
```

---

### 2. Withdrawal API Tests

**tests/integration/withdrawal.api.test.ts:**
```typescript
import { api } from './helpers/apiClient';
import { createTestUser, createTestWallet } from './helpers/testData';
import { prisma } from './setup';

describe('Withdrawal API', () => {
  describe('POST /api/withdrawals/request', () => {
    it('should create withdrawal request and deduct balance', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      // Act
      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 200000,
        bankCode: 'BCA',
        bankName: 'Bank Central Asia',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.withdrawal).toMatchObject({
        amount: '200000.00',
        withdrawal_fee: '2500.00',
        net_amount: '197500.00',
        status: 'pending',
        bank_code: 'BCA',
      });

      // Verify wallet balance deducted
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('300000.00');

      // Verify transaction created
      const transaction = await prisma.wallet_transactions.findFirst({
        where: {
          user_id: user.id,
          type: 'withdrawal',
        },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.amount.toString()).toBe('200000.00');
    });

    it('should reject withdrawal below minimum amount', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 5000,
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Minimum withdrawal is Rp 10,000');
    });

    it('should reject withdrawal exceeding balance', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 50000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 100000,
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient balance');
    });

    it('should validate bank account number format', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 100000,
        bankCode: 'BCA',
        accountNumber: 'ABC123',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must contain only digits');
    });

    it('should reject invalid bank code', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 100000,
        bankCode: 'INVALID',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid bank code');
    });
  });

  describe('POST /api/withdrawals/process-batch', () => {
    it('should process pending withdrawals', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      // Create withdrawal request
      await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 200000,
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      // Act
      const response = await api.post('/api/withdrawals/process-batch');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.processed).toBeGreaterThan(0);

      // Verify withdrawal status updated
      const withdrawal = await prisma.wallet_withdrawals.findFirst({
        where: { user_id: user.id },
      });
      expect(withdrawal?.status).toBe('processing');
      expect(withdrawal?.xendit_disbursement_id).toBeDefined();
      expect(withdrawal?.processed_at).toBeDefined();
    });

    it('should skip already processed withdrawals', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      await prisma.wallet_withdrawals.create({
        data: {
          user_id: user.id,
          amount: 200000,
          withdrawal_fee: 2500,
          net_amount: 197500,
          bank_code: 'BCA',
          bank_name: 'BCA',
          account_number: '1234567890',
          account_name: 'John Doe',
          status: 'completed',
          processed_at: new Date(),
        },
      });

      // Act
      const response = await api.post('/api/withdrawals/process-batch');

      // Assert
      expect(response.body.processed).toBe(0);
    });
  });
});
```

---

### 3. Webhook Integration Tests

**tests/integration/webhook.api.test.ts:**
```typescript
import crypto from 'crypto';
import { api } from './helpers/apiClient';
import { createTestUser, createTestWallet } from './helpers/testData';
import { prisma } from './setup';

describe('Webhook API', () => {
  const WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || 'test_token';

  function generateWebhookSignature(payload: any): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', WEBHOOK_TOKEN)
      .update(data)
      .digest('hex');
  }

  describe('POST /api/webhooks/disbursement', () => {
    it('should update withdrawal status to completed on success', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const withdrawal = await prisma.wallet_withdrawals.create({
        data: {
          user_id: user.id,
          amount: 200000,
          withdrawal_fee: 2500,
          net_amount: 197500,
          bank_code: 'BCA',
          bank_name: 'BCA',
          account_number: '1234567890',
          account_name: 'John Doe',
          status: 'processing',
          xendit_disbursement_id: 'disb_test123',
        },
      });

      const payload = {
        id: 'disb_test123',
        external_id: withdrawal.id,
        status: 'COMPLETED',
        amount: 197500,
      };

      const signature = generateWebhookSignature(payload);

      // Act
      const response = await api.post('/api/webhooks/disbursement', payload, {
        'x-callback-token': signature,
      });

      // Assert
      expect(response.status).toBe(200);

      const updatedWithdrawal = await prisma.wallet_withdrawals.findUnique({
        where: { id: withdrawal.id },
      });
      expect(updatedWithdrawal?.status).toBe('completed');
      expect(updatedWithdrawal?.completed_at).toBeDefined();
    });

    it('should refund wallet on failed disbursement', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 300000);

      const withdrawal = await prisma.wallet_withdrawals.create({
        data: {
          user_id: user.id,
          amount: 200000,
          withdrawal_fee: 2500,
          net_amount: 197500,
          bank_code: 'BCA',
          bank_name: 'BCA',
          account_number: '1234567890',
          account_name: 'John Doe',
          status: 'processing',
          xendit_disbursement_id: 'disb_test456',
        },
      });

      const payload = {
        id: 'disb_test456',
        external_id: withdrawal.id,
        status: 'FAILED',
        failure_code: 'INVALID_DESTINATION',
      };

      const signature = generateWebhookSignature(payload);

      // Act
      const response = await api.post('/api/webhooks/disbursement', payload, {
        'x-callback-token': signature,
      });

      // Assert
      expect(response.status).toBe(200);

      // Verify withdrawal marked as failed
      const updatedWithdrawal = await prisma.wallet_withdrawals.findUnique({
        where: { id: withdrawal.id },
      });
      expect(updatedWithdrawal?.status).toBe('failed');
      expect(updatedWithdrawal?.failed_reason).toBe('INVALID_DESTINATION');

      // Verify wallet refunded
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('500000.00'); // 300k + 200k refund

      // Verify refund transaction created
      const refundTransaction = await prisma.wallet_transactions.findFirst({
        where: {
          user_id: user.id,
          type: 'refund',
        },
      });
      expect(refundTransaction).toBeDefined();
      expect(refundTransaction?.amount.toString()).toBe('200000.00');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        id: 'disb_test789',
        external_id: 'some-withdrawal-id',
        status: 'COMPLETED',
      };

      const response = await api.post('/api/webhooks/disbursement', payload, {
        'x-callback-token': 'invalid-signature',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid signature');
    });

    it('should handle idempotent webhook calls', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 300000);

      const withdrawal = await prisma.wallet_withdrawals.create({
        data: {
          user_id: user.id,
          amount: 200000,
          withdrawal_fee: 2500,
          net_amount: 197500,
          bank_code: 'BCA',
          bank_name: 'BCA',
          account_number: '1234567890',
          account_name: 'John Doe',
          status: 'processing',
          xendit_disbursement_id: 'disb_idempotent',
        },
      });

      const payload = {
        id: 'disb_idempotent',
        external_id: withdrawal.id,
        status: 'COMPLETED',
      };

      const signature = generateWebhookSignature(payload);

      // Act - Call webhook twice
      await api.post('/api/webhooks/disbursement', payload, {
        'x-callback-token': signature,
      });

      const response = await api.post('/api/webhooks/disbursement', payload, {
        'x-callback-token': signature,
      });

      // Assert - Second call should succeed without errors
      expect(response.status).toBe(200);

      // Verify wallet balance not double-credited
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('300000.00'); // No change
    });
  });
});
```

---

## Service-to-Service Integration

### 4. Group Buying → Warehouse Integration

**tests/integration/groupBuying-warehouse.test.ts:**
```typescript
import nock from 'nock';
import { api } from './helpers/apiClient';
import {
  createTestUser,
  createTestFactory,
  createTestProduct,
  createTestVariant,
  createGroupSession,
} from './helpers/testData';
import { prisma } from './setup';

describe('Group Buying → Warehouse Integration', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  describe('POST /api/group-buying/sessions/:id/finalize', () => {
    it('should call warehouse service to fulfill demand', async () => {
      // Arrange
      const factory = await createTestFactory();
      const product = await createTestProduct(factory.id);
      const variant = await createTestVariant(product.id, 100);
      const session = await createGroupSession(product.id, [variant.id], 100);

      // Mock warehouse allocation
      await prisma.grosir_allocations.create({
        data: {
          product_id: product.id,
          variant_id: variant.id,
          bundle_size: 100,
          allocated_bundles: 10,
          available_bundles: 10,
          reserved_bundles: 0,
          tolerance_percentage: 10,
        },
      });

      // Mock users joining session
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await prisma.group_participants.createMany({
        data: [
          {
            session_id: session.id,
            user_id: user1.id,
            variant_id: variant.id,
            quantity: 60,
            price_per_unit: 45000,
          },
          {
            session_id: session.id,
            user_id: user2.id,
            variant_id: variant.id,
            quantity: 50,
            price_per_unit: 45000,
          },
        ],
      });

      // Update session status
      await prisma.group_sessions.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          current_quantity: 110,
        },
      });

      // Mock warehouse service response
      const warehouseScope = nock('http://localhost:3008')
        .post('/api/warehouse/fulfill-bundle-demand', {
          session_id: session.id,
        })
        .reply(200, {
          success: true,
          purchase_order_id: 'po_test123',
        });

      // Act
      const response = await api.post(`/api/group-buying/sessions/${session.id}/finalize`);

      // Assert
      expect(response.status).toBe(200);
      expect(warehouseScope.isDone()).toBe(true);

      // Verify session marked as finalized
      const updatedSession = await prisma.group_sessions.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('finalized');
    });

    it('should handle warehouse service failure gracefully', async () => {
      // Arrange
      const factory = await createTestFactory();
      const product = await createTestProduct(factory.id);
      const variant = await createTestVariant(product.id);
      const session = await createGroupSession(product.id, [variant.id]);

      await prisma.group_sessions.update({
        where: { id: session.id },
        data: { status: 'completed' },
      });

      // Mock warehouse service error
      nock('http://localhost:3008')
        .post('/api/warehouse/fulfill-bundle-demand')
        .reply(500, { error: 'Internal server error' });

      // Act
      const response = await api.post(`/api/group-buying/sessions/${session.id}/finalize`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('warehouse');

      // Verify session status not changed
      const updatedSession = await prisma.group_sessions.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('completed');
    });
  });
});
```

---

### 5. Group Buying → Wallet Integration

**tests/integration/groupBuying-wallet.test.ts:**
```typescript
import nock from 'nock';
import { api } from './helpers/apiClient';
import {
  createTestUser,
  createTestFactory,
  createTestProduct,
  createTestVariant,
  createGroupSession,
  createTestWallet,
} from './helpers/testData';
import { prisma } from './setup';

describe('Group Buying → Wallet Integration', () => {
  describe('Tier Upgrade Refund', () => {
    it('should credit wallet when tier improves', async () => {
      // Arrange
      const factory = await createTestFactory();
      const product = await createTestProduct(factory.id);
      const variant = await createTestVariant(product.id, 100);
      const session = await createGroupSession(product.id, [variant.id], 100);

      const user1 = await createTestUser();
      const user2 = await createTestUser();
      await createTestWallet(user1.id);
      await createTestWallet(user2.id);

      // User 1 joins at 50% (tier 2 price: 45000)
      await api.post(`/api/group-buying/sessions/${session.id}/join`, {
        userId: user1.id,
        variantId: variant.id,
        quantity: 50,
      });

      // Mock wallet service for refund
      const walletScope = nock('http://localhost:3010')
        .post('/api/transactions/credit', {
          userId: user1.id,
          amount: 125000, // (47500 - 45000) * 50
          type: 'cashback',
          description: expect.stringContaining('Tier refund'),
        })
        .reply(201, { success: true });

      // Act - User 2 joins, pushing to 100% (tier 3 price: 42500)
      const response = await api.post(`/api/group-buying/sessions/${session.id}/join`, {
        userId: user2.id,
        variantId: variant.id,
        quantity: 50,
      });

      // Assert
      expect(response.status).toBe(201);
      expect(walletScope.isDone()).toBe(true);

      // Verify user 1 received refund
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user1.id },
      });
      expect(wallet?.balance.toString()).toBe('125000.00');
    });
  });
});
```

---

## Database Integration Tests

### 6. Database Transaction Tests

**tests/integration/database-transactions.test.ts:**
```typescript
import { prisma } from './setup';
import { createTestUser, createTestWallet } from './helpers/testData';

describe('Database Transactions', () => {
  describe('Wallet Balance Consistency', () => {
    it('should maintain consistency during concurrent operations', async () => {
      // Arrange
      const user = await createTestUser();
      await createTestWallet(user.id, 1000000);

      // Act - Simulate concurrent debit operations
      const operations = Array(10).fill(null).map(() =>
        prisma.$transaction(async (tx) => {
          const wallet = await tx.user_wallets.findUnique({
            where: { user_id: user.id },
          });

          if (wallet && wallet.balance >= 10000) {
            return tx.user_wallets.update({
              where: { user_id: user.id },
              data: {
                balance: { decrement: 10000 },
              },
            });
          }
          throw new Error('Insufficient balance');
        })
      );

      await Promise.all(operations);

      // Assert
      const finalWallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(finalWallet?.balance.toString()).toBe('900000.00'); // 1M - (10k * 10)
    });

    it('should rollback on error', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 50000);

      try {
        await prisma.$transaction(async (tx) => {
          // Debit wallet
          await tx.user_wallets.update({
            where: { user_id: user.id },
            data: { balance: { decrement: 30000 } },
          });

          // Simulate error (e.g., external API failure)
          throw new Error('Xendit API failed');
        });
      } catch (error) {
        // Expected error
      }

      // Verify wallet balance unchanged
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet?.balance.toString()).toBe('50000.00');
    });
  });

  describe('Unique Constraint Tests', () => {
    it('should prevent duplicate wallet creation', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id);

      await expect(createTestWallet(user.id)).rejects.toThrow();
    });

    it('should prevent duplicate user phone numbers', async () => {
      await createTestUser({ phone_number: '+6281234567890' });

      await expect(
        createTestUser({ phone_number: '+6281234567890' })
      ).rejects.toThrow();
    });
  });
});
```

---

## External API Integration

### 7. Xendit API Integration (Mocked)

**tests/integration/xendit.test.ts:**
```typescript
import nock from 'nock';
import { XenditService } from '../../src/services/xendit.service';

describe('Xendit API Integration', () => {
  const xenditService = new XenditService();
  const XENDIT_BASE_URL = 'https://api.xendit.co';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createDisbursement', () => {
    it('should create disbursement successfully', async () => {
      // Mock Xendit API
      nock(XENDIT_BASE_URL)
        .post('/disbursements', {
          external_id: expect.any(String),
          amount: 197500,
          bank_code: 'BCA',
          account_holder_name: 'John Doe',
          account_number: '1234567890',
        })
        .reply(200, {
          id: 'disb_test123',
          external_id: 'withdrawal_123',
          amount: 197500,
          status: 'PENDING',
        });

      // Act
      const result = await xenditService.createDisbursement({
        externalId: 'withdrawal_123',
        amount: 197500,
        bankCode: 'BCA',
        accountName: 'John Doe',
        accountNumber: '1234567890',
      });

      // Assert
      expect(result).toMatchObject({
        id: 'disb_test123',
        status: 'PENDING',
      });
    });

    it('should handle Xendit API errors', async () => {
      nock(XENDIT_BASE_URL)
        .post('/disbursements')
        .reply(400, {
          error_code: 'INVALID_DESTINATION',
          message: 'Bank account not found',
        });

      await expect(
        xenditService.createDisbursement({
          externalId: 'withdrawal_456',
          amount: 197500,
          bankCode: 'BCA',
          accountName: 'John Doe',
          accountNumber: 'invalid',
        })
      ).rejects.toThrow('INVALID_DESTINATION');
    });
  });
});
```

---

## Test Data Management

### Test Data Cleanup Strategy

```typescript
// tests/integration/setup.ts
export async function cleanDatabase() {
  const tables = [
    'group_participants',
    'group_sessions',
    'wallet_withdrawals',
    'wallet_transactions',
    'user_wallets',
    'orders',
    'grosir_allocations',
    'product_variants',
    'products',
    'factories',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

// Reset sequences
export async function resetSequences() {
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false)`;
}
```

### Fixtures

**tests/fixtures/users.json:**
```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "phone_number": "+6281234567891",
    "first_name": "Test User 1",
    "role": "customer",
    "status": "active"
  },
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "phone_number": "+6281234567892",
    "first_name": "Test User 2",
    "role": "customer",
    "status": "active"
  }
]
```

---

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Specific Test Suite

```bash
npm run test:integration -- wallet.api.test.ts
```

### Run Tests with Coverage

```bash
npm run test:integration:coverage
```

### Run Tests in CI/CD

```bash
npm run test:integration -- --ci --maxWorkers=1 --forceExit
```

---

## CI/CD Integration

**.github/workflows/integration-tests.yml:**
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: ecommerce_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/ecommerce_test

      - name: Run integration tests
        run: npm run test:integration -- --ci
        env:
          DATABASE_URL_TEST: postgresql://test_user:test_pass@localhost:5432/ecommerce_test
          NODE_ENV: test
```

---

## Best Practices

### 1. Test Independence
- Each test should clean up after itself
- Don't rely on test execution order
- Use `beforeEach` for common setup

### 2. Use Real Database
- Don't mock Prisma in integration tests
- Use separate test database
- Clean data between tests

### 3. Mock External Services
- Mock Xendit, Biteship, etc.
- Use `nock` for HTTP mocks
- Verify mock calls with `.isDone()`

### 4. Transaction Handling
- Test atomic operations
- Verify rollback behavior
- Test concurrent scenarios

### 5. Error Scenarios
- Test network failures
- Test timeout handling
- Test partial failures

---

## Troubleshooting

### Database Connection Issues
```bash
# Check postgres is running
pg_isready -h localhost -p 5432

# Reset test database
npx prisma migrate reset --force --skip-seed
```

### Port Conflicts
```bash
# Kill process on port
lsof -ti:3004 | xargs kill -9
```

### Test Timeouts
```typescript
// Increase timeout for slow tests
jest.setTimeout(30000);
```

---

## Next Steps

1. ✅ Set up test database
2. ✅ Write API integration tests for each service
3. ✅ Test service-to-service communication
4. ✅ Mock external APIs
5. ✅ Add to CI/CD pipeline
6. ✅ Monitor test execution time

---

**For complete testing strategy, see also:**
- [UNIT_TESTING_PLAN.md](./UNIT_TESTING_PLAN.md)
- [END_TO_END_TESTING_PLAN.md](./END_TO_END_TESTING_PLAN.md)
