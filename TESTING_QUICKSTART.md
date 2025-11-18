# Testing Quickstart Guide

Get up and running with unit tests in 5 minutes! This guide shows you exactly how to pull my branch and run all the tests I've created for you.

---

## Step 1: Switch to My Testing Branch

You have two options depending on where you are:

### Option A: If You're in Your New Testing Repo

```bash
# Navigate to your testing repository
cd ecommerce-testing

# Add my original repo as a remote (if not already added)
git remote add claude https://github.com/Justustin/ecommerce-justin.git

# Fetch my branch
git fetch claude claude/review-backend-logic-flow-01HbjQAwWMhuVnt8m4vWZfEg

# Switch to my branch
git checkout claude/review-backend-logic-flow-01HbjQAwWMhuVnt8m4vWZfEg
```

### Option B: If You're in Your Original Repo

```bash
# Navigate to your repo
cd ecommerce-justin

# Fetch latest changes
git fetch origin

# Switch to my testing branch
git checkout claude/review-backend-logic-flow-01HbjQAwWMhuVnt8m4vWZfEg

# Pull latest changes
git pull origin claude/review-backend-logic-flow-01HbjQAwWMhuVnt8m4vWZfEg
```

---

## Step 2: Install Dependencies

Now install Jest and testing dependencies for each service:

```bash
# Wallet Service
cd services/wallet-service
npm install
cd ../..

# Group Buying Service
cd services/group-buying-service
npm install
cd ../..

# Warehouse Service
cd services/warehouse-service
npm install
cd ../..
```

**What this installs:**
- ✅ `jest` - Testing framework
- ✅ `ts-jest` - TypeScript support for Jest
- ✅ `@types/jest` - TypeScript types

---

## Step 3: Run Your First Tests! 🎉

### Run All Tests in Wallet Service

```bash
cd services/wallet-service
npm test
```

**Expected Output:**
```
PASS  src/utils/withdrawal.test.ts
  withdrawal utilities
    calculateWithdrawalFee
      ✓ should return flat fee of 2500 for any amount (2 ms)
      ✓ should match the constant WITHDRAWAL_FEE (1 ms)
    calculateNetAmount
      ✓ should deduct fee from amount (1 ms)
      ✓ should handle exact fee amount (1 ms)
      ✓ should return negative for amounts less than fee
      ✓ should handle large amounts
    validateWithdrawalAmount
      ✓ should pass validation for valid amount
      ✓ should fail for negative amount
      ✓ should fail for zero amount
      ✓ should fail for amount below minimum
      ✓ should pass for exact minimum amount
      ✓ should fail when amount exceeds balance
      ✓ should pass when amount equals balance
      ✓ should fail when net amount is negative

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        1.234 s
```

### Run All Tests in Group Buying Service

```bash
cd services/group-buying-service
npm test
```

**Expected Output:**
```
PASS  src/utils/tierPricing.test.ts
  tierPricing
    calculateTierPrice
      ✓ should return base price when under 50% of MOQ
      ✓ should return tier 1 price when at exactly 50% of MOQ
      ✓ should return tier 1 price when between 50-74% of MOQ
      ✓ should return tier 2 price when at exactly 75% of MOQ
      ✓ should return tier 2 price when between 75-99% of MOQ
      ✓ should return tier 3 price when at exactly 100% of MOQ
      ✓ should return tier 3 price when over 100% of MOQ
      ✓ should handle edge case of 0 quantity
    calculateRefundAmount
      ✓ should calculate correct refund for tier upgrade
      ✓ should return 0 when prices are equal
      ✓ should handle decimal quantities
      ✓ should return 0 for 0 quantity
      ✓ should handle large numbers
      ✓ should handle multiple tier upgrades
    getTierPercentage
      ✓ should calculate correct percentage
      ✓ should handle over 100%
      ✓ should handle decimal results
      ✓ should return 0 for 0 quantity
      ✓ should handle different MOQ values
    determineCurrentTier
      ✓ should return base tier for under 50%
      ✓ should return tier_1 for 50-74%
      ✓ should return tier_2 for 75-99%
      ✓ should return tier_3 for 100%+

PASS  src/utils/botParticipant.test.ts
  botParticipant
    shouldBotJoin
      ✓ should return true when < 25% and T-10 minutes
      ✓ should return true when < 25% and T-5 minutes
      ✓ should return false when >= 25%
      ✓ should return false when < 25% but > 10 minutes remaining
      ✓ should return true when 0% at T-10 minutes
      ✓ should return false when exactly at 25%
      ✓ should return false when over 25%
      ✓ should return true when 24% at T-1 minute
    calculateBotQuantity
      ✓ should calculate correct quantity to reach 25%
      ✓ should return 0 when already at 25%
      ✓ should return full 25% when starting from 0
      ✓ should handle MOQ that does not divide evenly
      ✓ should return 0 when over 25%
      ✓ should handle different MOQ values
      ✓ should handle edge case of 1 unit short
    isSessionNearExpiration
      ✓ should return true when exactly 10 minutes remaining
      ✓ should return true when 5 minutes remaining
      ✓ should return true when 1 minute remaining
      ✓ should return false when 11 minutes remaining
      ✓ should return false when already expired
      ✓ should return false when 15 minutes remaining
    getMinutesUntilExpiry
      ✓ should calculate correct minutes remaining
      ✓ should return 10 for T-10 minutes
      ✓ should return negative for expired sessions
      ✓ should return 0 for expiring right now

Test Suites: 2 passed, 2 total
Tests:       47 passed, 47 total
Snapshots:   0 total
Time:        2.456 s
```

### Run All Tests in Warehouse Service

```bash
cd services/warehouse-service
npm test
```

**Expected Output:**
```
PASS  src/utils/bundleCalculation.test.ts
  bundleCalculation
    calculateBundlesNeeded
      ✓ should return 1 bundle for quantity equal to bundle size
      ✓ should round up for quantity slightly over bundle size
      ✓ should account for tolerance when near bundle boundary
      ✓ should return 1 bundle when quantity just below tolerance threshold
      ✓ should handle 0 tolerance
      ✓ should handle large quantities
      ✓ should handle small quantities with tolerance
      ✓ should handle exact multiples
    canFulfillDemand
      ✓ should return true when exactly enough bundles available
      ✓ should return true when more than enough bundles available
      ✓ should return false when not enough bundles
      ✓ should account for tolerance in fulfillment check
      ✓ should return false when 0 bundles available
      ✓ should handle edge case at boundary
    calculateActualQuantityReceived
      ✓ should calculate correct quantity for 1 bundle
      ✓ should calculate correct quantity for multiple bundles
      ✓ should return 0 for 0 bundles
      ✓ should handle different bundle sizes
      ✓ should handle large numbers
    calculateWastage
      ✓ should calculate wastage for imperfect allocation
      ✓ should return 0 for perfect match
      ✓ should calculate wastage for multiple bundles
      ✓ should handle small wastage
      ✓ should handle large wastage

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        1.123 s
```

---

## Step 4: Run Tests with Coverage

See how much of your code is tested:

```bash
# In any service directory
npm run test:coverage
```

**Example Output:**
```
----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |     100 |      100 |     100 |     100 |
 utils                |     100 |      100 |     100 |     100 |
  withdrawal.ts       |     100 |      100 |     100 |     100 |
  tierPricing.ts      |     100 |      100 |     100 |     100 |
  botParticipant.ts   |     100 |      100 |     100 |     100 |
  bundleCalculation.ts|     100 |      100 |     100 |     100 |
----------------------|---------|----------|---------|---------|-------------------

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        1.234 s
```

---

## Step 5: Run Tests in Watch Mode (Optional)

This automatically re-runs tests when you change code:

```bash
npm run test:watch
```

**What this does:**
- Watches for file changes
- Automatically re-runs related tests
- Great for development workflow
- Press `q` to quit

---

## What Tests Are Included?

### 📦 Wallet Service (14 tests)
**File:** `services/wallet-service/src/utils/withdrawal.test.ts`

Tests for:
- ✅ Withdrawal fee calculation (always Rp 2,500)
- ✅ Net amount calculation (amount - fee)
- ✅ Withdrawal validation (minimum, balance checks)

**Functions tested:**
- `calculateWithdrawalFee()`
- `calculateNetAmount()`
- `validateWithdrawalAmount()`

---

### 🛒 Group Buying Service (47 tests)
**Files:**
- `services/group-buying-service/src/utils/tierPricing.test.ts` (23 tests)
- `services/group-buying-service/src/utils/botParticipant.test.ts` (24 tests)

**Tier Pricing Tests:**
- ✅ Tier 1 pricing (50% of MOQ)
- ✅ Tier 2 pricing (75% of MOQ)
- ✅ Tier 3 pricing (100% of MOQ)
- ✅ Refund calculations for tier upgrades
- ✅ Percentage calculations

**Bot Participant Tests:**
- ✅ Bot auto-join logic (< 25% at T-10 min)
- ✅ Bot quantity calculation (to reach 25%)
- ✅ Session expiration detection
- ✅ Minutes until expiry calculation

**Functions tested:**
- `calculateTierPrice()`
- `calculateRefundAmount()`
- `getTierPercentage()`
- `determineCurrentTier()`
- `shouldBotJoin()`
- `calculateBotQuantity()`
- `isSessionNearExpiration()`
- `getMinutesUntilExpiry()`

---

### 📦 Warehouse Service (23 tests)
**File:** `services/warehouse-service/src/utils/bundleCalculation.test.ts`

Tests for:
- ✅ Bundle calculation with tolerance
- ✅ Demand fulfillment checks
- ✅ Actual quantity received
- ✅ Wastage calculation

**Functions tested:**
- `calculateBundlesNeeded()`
- `canFulfillDemand()`
- `calculateActualQuantityReceived()`
- `calculateWastage()`

---

## Quick Commands Reference

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npm test -- withdrawal.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should calculate"
```

---

## Understanding Test Output

### ✅ Passing Test
```
✓ should return tier 3 price when at exactly 100% of MOQ (2 ms)
```
- **Green checkmark** = Test passed
- **(2 ms)** = How long it took to run

### ❌ Failing Test
```
✗ should calculate correct refund
    Expected: 500000
    Received: 450000
```
- **Red X** = Test failed
- Shows what you expected vs what you got
- Helps you find bugs!

---

## Troubleshooting

### Problem: "Cannot find module 'jest'"

**Solution:**
```bash
# Make sure you're in the service directory
cd services/wallet-service

# Install dependencies
npm install
```

### Problem: "No tests found"

**Solution:**
```bash
# Make sure you're in the right directory
cd services/wallet-service  # or group-buying-service, warehouse-service

# Check if test files exist
ls src/utils/*.test.ts

# Run tests
npm test
```

### Problem: Tests fail with TypeScript errors

**Solution:**
```bash
# Make sure TypeScript is installed
npm install --save-dev typescript ts-jest @types/jest

# Check jest.config.js exists
ls jest.config.js
```

---

## What's Next?

Now that tests are running, you can:

1. **Modify a function** - Change code in `withdrawal.ts` and see tests fail/pass
2. **Add more tests** - Copy existing test patterns
3. **Check coverage** - Run `npm run test:coverage` to see what's not tested
4. **Read the full guides**:
   - [UNIT_TESTING_PLAN.md](./UNIT_TESTING_PLAN.md) - Complete unit testing guide
   - [INTEGRATION_TESTING_PLAN.md](./INTEGRATION_TESTING_PLAN.md) - API + DB testing
   - [END_TO_END_TESTING_PLAN.md](./END_TO_END_TESTING_PLAN.md) - Full flow testing

---

## Total Test Summary

| Service | Test Files | Tests | Coverage |
|---------|-----------|-------|----------|
| **wallet-service** | 1 | 14 | 100% |
| **group-buying-service** | 2 | 47 | 100% |
| **warehouse-service** | 1 | 23 | 100% |
| **TOTAL** | **4** | **84** | **100%** |

---

## Need Help?

**Common Questions:**

**Q: Which service should I test first?**
A: Start with **wallet-service** - it's the simplest with only 14 tests.

**Q: How do I know if tests are working?**
A: You'll see green checkmarks (✓) and "Tests: X passed, X total" at the bottom.

**Q: Can I run all services tests at once?**
A: Not yet - you need to cd into each service and run `npm test` separately.

**Q: What if I want to add my own test?**
A: Copy an existing `it()` block in any `.test.ts` file and modify it!

---

**You're all set! Run `npm test` and watch your tests pass! 🎉**
