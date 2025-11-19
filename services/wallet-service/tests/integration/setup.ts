import { PrismaClient } from '@repo/database';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean all tables before each test (in reverse order of dependencies)
  const tables = [
    'wallet_withdrawals',
    'wallet_transactions',
    'user_wallets',
    'group_participants',
    'group_sessions',
    'orders',
    'grosir_allocations',
    'product_variants',
    'products',
    'factories',
    'users',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (error) {
      // Table might not exist, continue
      console.log(`Warning: Could not truncate ${table}`);
    }
  }
});

export { prisma };
