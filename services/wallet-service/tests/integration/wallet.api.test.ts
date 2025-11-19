import { api } from './helpers/apiClient';
import { createTestUser, createTestWallet } from './helpers/testData';
import { prisma } from './setup';

describe('Wallet API Integration Tests', () => {
  describe('GET /api/balance/:userId', () => {
    it('should return wallet balance for existing user', async () => {
      // Arrange
      const user = await createTestUser();
      const wallet = await createTestWallet(user.id, 500000);

      // Act
      const response = await api.get(`/api/balance/${user.id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        balance: expect.any(String),
        total_earned: expect.any(String),
        total_withdrawn: expect.any(String),
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await api.get('/api/balance/00000000-0000-0000-0000-999999999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await api.get('/api/balance/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        amount: expect.any(String),
        type: 'cashback',
        description: 'Tier refund',
      });

      // Verify wallet balance updated
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(Number(wallet?.balance)).toBe(150000);
    });

    it('should reject negative amount', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id);

      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: -10000,
        type: 'cashback',
        description: 'Test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid transaction type', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id);

      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: 10000,
        type: 'invalid_type',
        description: 'Test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create wallet if not exists', async () => {
      const user = await createTestUser();

      const response = await api.post('/api/transactions/credit', {
        userId: user.id,
        amount: 50000,
        type: 'cashback',
        description: 'First credit',
      });

      expect(response.status).toBe(201);

      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet?.balance)).toBe(50000);
    });
  });

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
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        amount: expect.any(String),
        withdrawal_fee: expect.any(String),
        net_amount: expect.any(String),
        status: 'pending',
        bank_code: 'BCA',
      });

      // Verify wallet balance deducted
      const wallet = await prisma.user_wallets.findUnique({
        where: { user_id: user.id },
      });
      expect(Number(wallet?.balance)).toBe(300000);

      // Verify transaction created
      const transaction = await prisma.wallet_transactions.findFirst({
        where: {
          user_id: user.id,
          type: 'withdrawal',
        },
      });
      expect(transaction).toBeDefined();
    });

    it('should reject withdrawal below minimum amount', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 500000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 5000,
        bankCode: 'BCA',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject withdrawal exceeding balance', async () => {
      const user = await createTestUser();
      await createTestWallet(user.id, 50000);

      const response = await api.post('/api/withdrawals/request', {
        userId: user.id,
        amount: 100000,
        bankCode: 'BCA',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });

      // Act
      const response = await api.post('/api/withdrawals/process-batch');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Note: Actual xendit processing will be mocked in production tests
    });

    it('should handle no pending withdrawals gracefully', async () => {
      const response = await api.post('/api/withdrawals/process-batch');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
