# Unit Testing Plan

Comprehensive unit testing guide for the e-commerce group buying platform. Unit tests verify individual functions and methods in isolation.

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Setup & Configuration](#setup--configuration)
3. [Test Structure](#test-structure)
4. [Critical Business Logic Tests](#critical-business-logic-tests)
5. [Service-Specific Tests](#service-specific-tests)
6. [Mocking Strategy](#mocking-strategy)
7. [Coverage Goals](#coverage-goals)
8. [Running Tests](#running-tests)

---

## Testing Philosophy

### What to Test (Unit Level)
✅ **Business logic calculations** (tier pricing, refunds, fees)
✅ **Validation functions** (input validation, constraints)
✅ **Data transformations** (formatting, mapping)
✅ **Pure functions** (no side effects)
✅ **Edge cases** (boundary conditions, errors)

### What NOT to Test
❌ Framework code (Express, Prisma)
❌ Trivial getters/setters
❌ External APIs (mock instead)
❌ Database queries (integration tests)
❌ Third-party libraries

### Testing Principles
- **Fast** - Unit tests should run in milliseconds
- **Isolated** - No database, no network, no file system
- **Deterministic** - Same input = same output every time
- **Readable** - Tests as documentation

---

## Setup & Configuration

### 1. Install Testing Dependencies

```bash
# Root package.json or each service
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @faker-js/faker
```

### 2. Jest Configuration

**jest.config.js** (in each service directory):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
```

### 3. Test Setup File

**src/__tests__/setup.ts:**
```typescript
// Global test setup
beforeAll(() => {
  // Set timezone for consistent date tests
  process.env.TZ = 'Asia/Jakarta';
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});
```

### 4. Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__/unit"
  }
}
```

---

## Test Structure

### Directory Structure

```
services/group-buying-service/
├── src/
│   ├── utils/
│   │   ├── tierPricing.ts
│   │   └── __tests__/
│   │       └── tierPricing.test.ts
│   ├── services/
│   │   ├── groupBuying.service.ts
│   │   └── __tests__/
│   │       └── groupBuying.service.test.ts
│   └── __tests__/
│       └── setup.ts
└── jest.config.js
```

### Test File Naming
- `*.test.ts` - Standard unit tests
- `*.spec.ts` - Alternative naming (choose one convention)
- `*.integration.test.ts` - Integration tests (separate from unit)

### Test Structure (AAA Pattern)

```typescript
describe('FunctionName', () => {
  describe('when condition X', () => {
    it('should do Y', () => {
      // Arrange - Setup test data
      const input = { ... };

      // Act - Execute the function
      const result = functionToTest(input);

      // Assert - Verify the result
      expect(result).toBe(expected);
    });
  });
});
```

---

## Critical Business Logic Tests

### 1. Tier Pricing Calculations

**services/group-buying-service/src/utils/tierPricing.ts:**
```typescript
export function calculateTierPrice(
  basePrice: number,
  tier1Price: number,
  tier2Price: number,
  tier3Price: number,
  currentQuantity: number,
  moq: number
): number {
  const percentage = (currentQuantity / moq) * 100;

  if (percentage >= 100) return tier3Price;
  if (percentage >= 75) return tier2Price;
  if (percentage >= 50) return tier1Price;
  return basePrice;
}

export function calculateRefundAmount(
  oldPrice: number,
  newPrice: number,
  quantity: number
): number {
  return (oldPrice - newPrice) * quantity;
}

export function getTierPercentage(currentQuantity: number, moq: number): number {
  return (currentQuantity / moq) * 100;
}
```

**services/group-buying-service/src/utils/__tests__/tierPricing.test.ts:**
```typescript
import { calculateTierPrice, calculateRefundAmount, getTierPercentage } from '../tierPricing';

describe('tierPricing', () => {
  describe('calculateTierPrice', () => {
    const basePrice = 50000;
    const tier1Price = 47500;
    const tier2Price = 45000;
    const tier3Price = 42500;
    const moq = 100;

    it('should return base price when under 50% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 49, moq);
      expect(result).toBe(50000);
    });

    it('should return tier 1 price when at exactly 50% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 50, moq);
      expect(result).toBe(47500);
    });

    it('should return tier 1 price when between 50-74% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 74, moq);
      expect(result).toBe(47500);
    });

    it('should return tier 2 price when at exactly 75% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 75, moq);
      expect(result).toBe(45000);
    });

    it('should return tier 2 price when between 75-99% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 99, moq);
      expect(result).toBe(45000);
    });

    it('should return tier 3 price when at exactly 100% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 100, moq);
      expect(result).toBe(42500);
    });

    it('should return tier 3 price when over 100% of MOQ', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 150, moq);
      expect(result).toBe(42500);
    });

    it('should handle edge case of 0 quantity', () => {
      const result = calculateTierPrice(basePrice, tier1Price, tier2Price, tier3Price, 0, moq);
      expect(result).toBe(50000);
    });
  });

  describe('calculateRefundAmount', () => {
    it('should calculate correct refund for tier upgrade', () => {
      const oldPrice = 50000;
      const newPrice = 45000;
      const quantity = 100;

      const result = calculateRefundAmount(oldPrice, newPrice, quantity);

      expect(result).toBe(500000); // (50k - 45k) * 100
    });

    it('should return 0 when prices are equal', () => {
      const result = calculateRefundAmount(50000, 50000, 100);
      expect(result).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const result = calculateRefundAmount(50000, 45000, 50);
      expect(result).toBe(250000);
    });

    it('should return 0 for 0 quantity', () => {
      const result = calculateRefundAmount(50000, 45000, 0);
      expect(result).toBe(0);
    });

    it('should handle large numbers', () => {
      const result = calculateRefundAmount(100000, 90000, 1000);
      expect(result).toBe(10000000);
    });
  });

  describe('getTierPercentage', () => {
    it('should calculate correct percentage', () => {
      expect(getTierPercentage(50, 100)).toBe(50);
      expect(getTierPercentage(75, 100)).toBe(75);
      expect(getTierPercentage(100, 100)).toBe(100);
    });

    it('should handle over 100%', () => {
      expect(getTierPercentage(150, 100)).toBe(150);
    });

    it('should handle decimal results', () => {
      expect(getTierPercentage(33, 100)).toBe(33);
      expect(getTierPercentage(66, 100)).toBe(66);
    });

    it('should return 0 for 0 quantity', () => {
      expect(getTierPercentage(0, 100)).toBe(0);
    });
  });
});
```

---

### 2. Wallet Withdrawal Fee Calculation

**services/wallet-service/src/utils/withdrawal.ts:**
```typescript
export const WITHDRAWAL_FEE = 2500; // Flat fee in IDR

export function calculateWithdrawalFee(amount: number): number {
  return WITHDRAWAL_FEE;
}

export function calculateNetAmount(amount: number): number {
  return amount - WITHDRAWAL_FEE;
}

export function validateWithdrawalAmount(amount: number, balance: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < 10000) {
    return { valid: false, error: 'Minimum withdrawal is Rp 10,000' };
  }

  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  const netAmount = calculateNetAmount(amount);
  if (netAmount <= 0) {
    return { valid: false, error: 'Amount must cover withdrawal fee' };
  }

  return { valid: true };
}
```

**services/wallet-service/src/utils/__tests__/withdrawal.test.ts:**
```typescript
import {
  calculateWithdrawalFee,
  calculateNetAmount,
  validateWithdrawalAmount,
  WITHDRAWAL_FEE
} from '../withdrawal';

describe('withdrawal', () => {
  describe('calculateWithdrawalFee', () => {
    it('should return flat fee of 2500 for any amount', () => {
      expect(calculateWithdrawalFee(50000)).toBe(2500);
      expect(calculateWithdrawalFee(100000)).toBe(2500);
      expect(calculateWithdrawalFee(1000000)).toBe(2500);
    });
  });

  describe('calculateNetAmount', () => {
    it('should deduct fee from amount', () => {
      expect(calculateNetAmount(100000)).toBe(97500);
      expect(calculateNetAmount(50000)).toBe(47500);
      expect(calculateNetAmount(10000)).toBe(7500);
    });

    it('should handle exact fee amount', () => {
      expect(calculateNetAmount(2500)).toBe(0);
    });

    it('should return negative for amounts less than fee', () => {
      expect(calculateNetAmount(1000)).toBe(-1500);
    });
  });

  describe('validateWithdrawalAmount', () => {
    it('should pass validation for valid amount', () => {
      const result = validateWithdrawalAmount(100000, 500000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for negative amount', () => {
      const result = validateWithdrawalAmount(-1000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should fail for zero amount', () => {
      const result = validateWithdrawalAmount(0, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should fail for amount below minimum', () => {
      const result = validateWithdrawalAmount(9000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Minimum withdrawal is Rp 10,000');
    });

    it('should pass for exact minimum amount', () => {
      const result = validateWithdrawalAmount(10000, 500000);
      expect(result.valid).toBe(true);
    });

    it('should fail when amount exceeds balance', () => {
      const result = validateWithdrawalAmount(600000, 500000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('should pass when amount equals balance', () => {
      const result = validateWithdrawalAmount(500000, 500000);
      expect(result.valid).toBe(true);
    });

    it('should fail when net amount is negative', () => {
      const result = validateWithdrawalAmount(2000, 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must cover withdrawal fee');
    });
  });
});
```

---

### 3. Bundle Allocation Logic

**services/warehouse-service/src/utils/bundleCalculation.ts:**
```typescript
export function calculateBundlesNeeded(
  quantity: number,
  bundleSize: number,
  tolerancePercentage: number
): number {
  const exactBundles = quantity / bundleSize;
  const tolerance = (tolerancePercentage / 100) * bundleSize;
  const adjustedQuantity = quantity + tolerance;

  return Math.ceil(adjustedQuantity / bundleSize);
}

export function canFulfillDemand(
  requestedQuantity: number,
  bundleSize: number,
  availableBundles: number,
  tolerancePercentage: number
): boolean {
  const bundlesNeeded = calculateBundlesNeeded(requestedQuantity, bundleSize, tolerancePercentage);
  return bundlesNeeded <= availableBundles;
}

export function calculateActualQuantityReceived(
  bundlesAllocated: number,
  bundleSize: number
): number {
  return bundlesAllocated * bundleSize;
}
```

**services/warehouse-service/src/utils/__tests__/bundleCalculation.test.ts:**
```typescript
import {
  calculateBundlesNeeded,
  canFulfillDemand,
  calculateActualQuantityReceived
} from '../bundleCalculation';

describe('bundleCalculation', () => {
  describe('calculateBundlesNeeded', () => {
    it('should return 1 bundle for quantity equal to bundle size', () => {
      const result = calculateBundlesNeeded(100, 100, 10);
      expect(result).toBe(1);
    });

    it('should round up for quantity slightly over bundle size', () => {
      const result = calculateBundlesNeeded(101, 100, 10);
      expect(result).toBe(2);
    });

    it('should account for tolerance when near bundle boundary', () => {
      // 95 units + 10% tolerance (10 units) = 105, needs 2 bundles
      const result = calculateBundlesNeeded(95, 100, 10);
      expect(result).toBe(2);
    });

    it('should return 1 bundle when quantity within tolerance of 1 bundle', () => {
      // 91 units + 10% tolerance (10 units) = 101, needs 2 bundles
      const result = calculateBundlesNeeded(91, 100, 10);
      expect(result).toBe(2);
    });

    it('should return 1 bundle when quantity just below tolerance threshold', () => {
      // 90 units + 10% tolerance (10 units) = 100, needs 1 bundle
      const result = calculateBundlesNeeded(90, 100, 10);
      expect(result).toBe(1);
    });

    it('should handle 0 tolerance', () => {
      const result = calculateBundlesNeeded(150, 100, 0);
      expect(result).toBe(2);
    });

    it('should handle large quantities', () => {
      const result = calculateBundlesNeeded(550, 100, 10);
      expect(result).toBe(6); // 550 + 10 = 560, needs 6 bundles
    });
  });

  describe('canFulfillDemand', () => {
    it('should return true when exactly enough bundles available', () => {
      const result = canFulfillDemand(100, 100, 1, 10);
      expect(result).toBe(true);
    });

    it('should return true when more than enough bundles available', () => {
      const result = canFulfillDemand(100, 100, 5, 10);
      expect(result).toBe(true);
    });

    it('should return false when not enough bundles', () => {
      const result = canFulfillDemand(250, 100, 2, 10);
      expect(result).toBe(false);
    });

    it('should account for tolerance in fulfillment check', () => {
      // 95 + tolerance needs 2 bundles
      const result = canFulfillDemand(95, 100, 1, 10);
      expect(result).toBe(false);
    });

    it('should return false when 0 bundles available', () => {
      const result = canFulfillDemand(50, 100, 0, 10);
      expect(result).toBe(false);
    });
  });

  describe('calculateActualQuantityReceived', () => {
    it('should calculate correct quantity for 1 bundle', () => {
      const result = calculateActualQuantityReceived(1, 100);
      expect(result).toBe(100);
    });

    it('should calculate correct quantity for multiple bundles', () => {
      const result = calculateActualQuantityReceived(5, 100);
      expect(result).toBe(500);
    });

    it('should return 0 for 0 bundles', () => {
      const result = calculateActualQuantityReceived(0, 100);
      expect(result).toBe(0);
    });

    it('should handle different bundle sizes', () => {
      expect(calculateActualQuantityReceived(3, 50)).toBe(150);
      expect(calculateActualQuantityReceived(2, 200)).toBe(400);
    });
  });
});
```

---

### 4. Bot Participant Logic

**services/group-buying-service/src/utils/botParticipant.ts:**
```typescript
export function shouldBotJoin(
  currentQuantity: number,
  moq: number,
  minutesUntilExpiry: number
): boolean {
  const percentage = (currentQuantity / moq) * 100;
  return percentage < 25 && minutesUntilExpiry <= 10;
}

export function calculateBotQuantity(
  currentQuantity: number,
  moq: number
): number {
  const targetQuantity = Math.ceil(moq * 0.25);
  const needed = targetQuantity - currentQuantity;
  return Math.max(0, needed);
}

export function isSessionNearExpiration(expiresAt: Date): boolean {
  const now = new Date();
  const minutesRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
  return minutesRemaining <= 10 && minutesRemaining > 0;
}
```

**services/group-buying-service/src/utils/__tests__/botParticipant.test.ts:**
```typescript
import { shouldBotJoin, calculateBotQuantity, isSessionNearExpiration } from '../botParticipant';

describe('botParticipant', () => {
  describe('shouldBotJoin', () => {
    it('should return true when < 25% and T-10 minutes', () => {
      const result = shouldBotJoin(20, 100, 10);
      expect(result).toBe(true);
    });

    it('should return true when < 25% and T-5 minutes', () => {
      const result = shouldBotJoin(20, 100, 5);
      expect(result).toBe(true);
    });

    it('should return false when >= 25%', () => {
      const result = shouldBotJoin(25, 100, 10);
      expect(result).toBe(false);
    });

    it('should return false when < 25% but > 10 minutes remaining', () => {
      const result = shouldBotJoin(20, 100, 15);
      expect(result).toBe(false);
    });

    it('should return false when 0% at T-10 minutes', () => {
      const result = shouldBotJoin(0, 100, 10);
      expect(result).toBe(true); // Bot should join to reach 25%
    });

    it('should return false when exactly at 25%', () => {
      const result = shouldBotJoin(25, 100, 10);
      expect(result).toBe(false);
    });
  });

  describe('calculateBotQuantity', () => {
    it('should calculate correct quantity to reach 25%', () => {
      const result = calculateBotQuantity(20, 100);
      expect(result).toBe(5); // Need 5 more to reach 25
    });

    it('should return 0 when already at 25%', () => {
      const result = calculateBotQuantity(25, 100);
      expect(result).toBe(0);
    });

    it('should return full 25% when starting from 0', () => {
      const result = calculateBotQuantity(0, 100);
      expect(result).toBe(25);
    });

    it('should handle MOQ that does not divide evenly', () => {
      const result = calculateBotQuantity(10, 99);
      // 25% of 99 = 24.75, ceil to 25
      expect(result).toBe(15); // 25 - 10 = 15
    });

    it('should return 0 when over 25%', () => {
      const result = calculateBotQuantity(30, 100);
      expect(result).toBe(0);
    });
  });

  describe('isSessionNearExpiration', () => {
    beforeEach(() => {
      // Mock current time to 2025-01-18 10:00:00
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true when exactly 10 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:10:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return true when 5 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:05:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return true when 1 minute remaining', () => {
      const expiresAt = new Date('2025-01-18T10:01:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(true);
    });

    it('should return false when 11 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:11:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });

    it('should return false when already expired', () => {
      const expiresAt = new Date('2025-01-18T09:59:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });

    it('should return false when 15 minutes remaining', () => {
      const expiresAt = new Date('2025-01-18T10:15:00Z');
      expect(isSessionNearExpiration(expiresAt)).toBe(false);
    });
  });
});
```

---

### 5. Input Validation

**services/group-buying-service/src/utils/validation.ts:**
```typescript
export function validateQuantity(quantity: number, moq: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be a whole number' };
  }

  if (quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  if (quantity > moq * 2) {
    return { valid: false, error: `Quantity cannot exceed ${moq * 2} units (2x MOQ)` };
  }

  return { valid: true };
}

export function validateBankAccount(bankCode: string, accountNumber: string): {
  valid: boolean;
  error?: string;
} {
  const validBankCodes = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'CIMB', 'PERMATA'];

  if (!validBankCodes.includes(bankCode.toUpperCase())) {
    return { valid: false, error: 'Invalid bank code' };
  }

  if (!/^\d+$/.test(accountNumber)) {
    return { valid: false, error: 'Account number must contain only digits' };
  }

  if (accountNumber.length < 8 || accountNumber.length > 20) {
    return { valid: false, error: 'Account number must be 8-20 digits' };
  }

  return { valid: true };
}
```

**services/group-buying-service/src/utils/__tests__/validation.test.ts:**
```typescript
import { validateQuantity, validateBankAccount } from '../validation';

describe('validation', () => {
  describe('validateQuantity', () => {
    it('should pass for valid quantity', () => {
      const result = validateQuantity(50, 100);
      expect(result.valid).toBe(true);
    });

    it('should fail for negative quantity', () => {
      const result = validateQuantity(-10, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quantity must be greater than 0');
    });

    it('should fail for zero quantity', () => {
      const result = validateQuantity(0, 100);
      expect(result.valid).toBe(false);
    });

    it('should fail for decimal quantity', () => {
      const result = validateQuantity(50.5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quantity must be a whole number');
    });

    it('should fail for quantity over 2x MOQ', () => {
      const result = validateQuantity(201, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 200 units');
    });

    it('should pass for quantity exactly at 2x MOQ', () => {
      const result = validateQuantity(200, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBankAccount', () => {
    it('should pass for valid BCA account', () => {
      const result = validateBankAccount('BCA', '1234567890');
      expect(result.valid).toBe(true);
    });

    it('should pass for valid Mandiri account', () => {
      const result = validateBankAccount('MANDIRI', '12345678901234');
      expect(result.valid).toBe(true);
    });

    it('should accept lowercase bank code', () => {
      const result = validateBankAccount('bca', '1234567890');
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid bank code', () => {
      const result = validateBankAccount('INVALID', '1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid bank code');
    });

    it('should fail for account number with letters', () => {
      const result = validateBankAccount('BCA', '12345ABC90');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number must contain only digits');
    });

    it('should fail for account number too short', () => {
      const result = validateBankAccount('BCA', '1234567');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Account number must be 8-20 digits');
    });

    it('should fail for account number too long', () => {
      const result = validateBankAccount('BCA', '123456789012345678901');
      expect(result.valid).toBe(false);
    });

    it('should pass for minimum length account number', () => {
      const result = validateBankAccount('BCA', '12345678');
      expect(result.valid).toBe(true);
    });

    it('should pass for maximum length account number', () => {
      const result = validateBankAccount('BCA', '12345678901234567890');
      expect(result.valid).toBe(true);
    });
  });
});
```

---

## Service-Specific Tests

### Group Buying Service

**Key Functions to Test:**
- `calculateTierPrice()` ✅ (above)
- `calculateRefundAmount()` ✅ (above)
- `shouldBotJoin()` ✅ (above)
- `calculateBotQuantity()` ✅ (above)
- `validateQuantity()` ✅ (above)
- `isSessionExpired()`
- `canUserJoinSession()`

### Wallet Service

**Key Functions to Test:**
- `calculateWithdrawalFee()` ✅ (above)
- `calculateNetAmount()` ✅ (above)
- `validateWithdrawalAmount()` ✅ (above)
- `validateBankAccount()` ✅ (above)
- `formatCurrency()`
- `parseAmount()`

### Warehouse Service

**Key Functions to Test:**
- `calculateBundlesNeeded()` ✅ (above)
- `canFulfillDemand()` ✅ (above)
- `calculateActualQuantityReceived()` ✅ (above)
- `applyTolerance()`
- `checkInventoryAvailability()`

### Payment Service

**Key Functions to Test:**
- `verifyWebhookSignature()`
- `calculatePlatformFee()`
- `formatXenditAmount()`
- `parsePaymentStatus()`

---

## Mocking Strategy

### 1. Mock Database (Prisma)

```typescript
// src/__tests__/mocks/prisma.ts
export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  // ... mock other models
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));
```

### 2. Mock External APIs

```typescript
// src/__tests__/mocks/xendit.ts
export const xenditMock = {
  Disbursement: {
    create: jest.fn().mockResolvedValue({
      id: 'disb_test123',
      external_id: 'withdrawal_123',
      status: 'PENDING',
      amount: 100000,
    }),
  },
  Invoice: {
    create: jest.fn(),
  },
};

jest.mock('xendit-node', () => ({
  Xendit: jest.fn(() => xenditMock),
}));
```

### 3. Mock Date/Time

```typescript
describe('time-sensitive test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-18T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle time correctly', () => {
    // Test with fixed time
  });
});
```

### 4. Mock Environment Variables

```typescript
describe('config test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use correct config', () => {
    process.env.XENDIT_SECRET_KEY = 'test_key';
    // Test with mock env var
  });
});
```

---

## Coverage Goals

### Overall Coverage Targets

| Metric | Target | Critical Services |
|--------|--------|-------------------|
| **Lines** | 70% | 80%+ |
| **Branches** | 70% | 80%+ |
| **Functions** | 70% | 80%+ |
| **Statements** | 70% | 80%+ |

**Critical Services** requiring 80%+ coverage:
- group-buying-service
- payment-service
- wallet-service
- warehouse-service

### Generate Coverage Report

```bash
npm run test:coverage
```

**Output:**
```
----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |   82.5  |   78.3   |   85.0  |   82.1  |
 utils/
  tierPricing.ts      |   100   |   100    |   100   |   100   |
  withdrawal.ts       |   95.2  |   88.9   |   100   |   94.7  | 45-46
  validation.ts       |   87.5  |   75.0   |   90.0  |   86.4  | 23,45,67
----------------------|---------|----------|---------|---------|-------------------
```

### Viewing HTML Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## Running Tests

### Run All Unit Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm test -- tierPricing.test.ts
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in CI/CD

```bash
npm test -- --ci --coverage --maxWorkers=2
```

---

## Best Practices

### 1. Test Naming

```typescript
// ✅ Good - Descriptive and clear
it('should return tier 3 price when quantity reaches 100% of MOQ', () => {});

// ❌ Bad - Vague
it('should work', () => {});
```

### 2. One Assert Per Test (When Possible)

```typescript
// ✅ Good
it('should calculate tier 1 price correctly', () => {
  expect(calculateTierPrice(50, 100)).toBe(47500);
});

// ⚠️ Acceptable for related assertions
it('should validate all bank account fields', () => {
  const result = validateBankAccount('BCA', '1234567890');
  expect(result.valid).toBe(true);
  expect(result.error).toBeUndefined();
});
```

### 3. Test Edge Cases

```typescript
describe('calculateRefund', () => {
  it('should handle normal case', () => { /* ... */ });
  it('should handle 0 quantity', () => { /* ... */ });
  it('should handle negative difference', () => { /* ... */ });
  it('should handle very large numbers', () => { /* ... */ });
  it('should handle decimal quantities', () => { /* ... */ });
});
```

### 4. Use Test Data Builders

```typescript
// src/__tests__/builders/userBuilder.ts
export class UserBuilder {
  private user = {
    id: '11111111-1111-1111-1111-111111111111',
    phone_number: '+6281234567890',
    first_name: 'Test User',
    role: 'customer',
    status: 'active',
  };

  withId(id: string) {
    this.user.id = id;
    return this;
  }

  withPhone(phone: string) {
    this.user.phone_number = phone;
    return this;
  }

  build() {
    return this.user;
  }
}

// Usage in tests
const user = new UserBuilder()
  .withId('custom-id')
  .withPhone('+6281234567891')
  .build();
```

### 5. Avoid Test Interdependence

```typescript
// ❌ Bad - Tests depend on execution order
let sharedState;

it('test 1', () => {
  sharedState = calculate(10);
});

it('test 2', () => {
  expect(sharedState).toBe(10); // Depends on test 1
});

// ✅ Good - Independent tests
it('test 1', () => {
  const result = calculate(10);
  expect(result).toBe(10);
});

it('test 2', () => {
  const result = calculate(10);
  expect(result).toBe(10);
});
```

---

## CI/CD Integration

### GitHub Actions

**.github/workflows/unit-tests.yml:**
```yaml
name: Unit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --ci --coverage --maxWorkers=2

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold 70%"
            exit 1
          fi
```

---

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**2. Tests timing out**
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

**3. Mock not working**
```typescript
// Ensure mock is before imports
jest.mock('./module');
import { function } from './module'; // ✅ After mock

// ❌ Wrong order
import { function } from './module';
jest.mock('./module');
```

---

## Next Steps

1. ✅ Create test files for each utility function
2. ✅ Set up Jest in all services
3. ✅ Write tests for critical business logic
4. ✅ Aim for 70%+ coverage
5. ✅ Add tests to CI/CD pipeline
6. ✅ Review coverage reports weekly

---

**For complete testing strategy, see also:**
- [INTEGRATION_TESTING_PLAN.md](./INTEGRATION_TESTING_PLAN.md)
- [END_TO_END_TESTING_PLAN.md](./END_TO_END_TESTING_PLAN.md)
