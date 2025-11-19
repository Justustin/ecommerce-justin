import { prisma } from '@repo/database';
import { faker } from '@faker-js/faker';

export async function createTestUser(overrides: any = {}) {
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

export async function createTestFactory() {
  return await prisma.factories.create({
    data: {
      name: faker.company.name(),
      phone_number: faker.phone.number('+628##########'),
      status: 'active',
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
