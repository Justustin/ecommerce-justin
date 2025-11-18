# E-Commerce Group Buying Platform

A Pinduoduo-inspired e-commerce platform with group buying, tiered pricing, bot participants, and batch withdrawal system.

## 🚀 Features

### Core Business Model
- **Group Buying Sessions** - MOQ-based purchasing with tiered pricing
- **Bot Participants** - 25% minimum fill guarantee for customer experience
- **Grosir Allocation System** - Dynamic warehouse tolerance for bundle-based inventory
- **Escrow Payments** - Hold funds until production completion, auto-refund on failure
- **Wallet System** - Credits, cashback, and batch withdrawals (2x per week)
- **Two-Entity Structure** - Platform collects escrow, warehouse orders in bundles

### Key Capabilities
✅ Real-time tier pricing (25%, 50%, 75%, 100% MOQ)
✅ Variant-based allocation with locking mechanism
✅ Xendit payment integration (e-wallet, bank transfer, VA)
✅ Secure webhook verification (HMAC-SHA256)
✅ Batch withdrawal processing via Xendit Disbursement API
✅ Auto-refund on failed withdrawals
✅ Warehouse demand calculation (excludes bot participants)
✅ CRON-based session expiration and batch processing

---

## 📁 Project Structure

```
ecommerce-justin/
├── packages/
│   └── database/              # Prisma schema & migrations
│       ├── prisma/
│       │   └── schema.prisma  # Database schema
│       └── migrations/        # SQL migrations
│
├── services/                  # Microservices
│   ├── auth-service/         # Authentication & OTP
│   ├── product-service/      # Product catalog
│   ├── factory-service/      # Factory management
│   ├── group-buying-service/ # Group buying sessions
│   ├── payment-service/      # Xendit integration
│   ├── order-service/        # Order management
│   ├── notification-service/ # Notifications
│   ├── warehouse-service/    # Inventory & PO
│   ├── wallet-service/       # Wallet & withdrawals
│   ├── logistics-service/    # Shipping
│   └── ...                   # Other services
│
├── COMPREHENSIVE_FLOW_SUMMARY.md  # Complete backend logic documentation
├── WALLET_SERVICE_API.md          # Wallet API docs with Swagger
├── CRON_SETUP.md                  # CRON job setup guide
├── DEPLOYMENT.md                  # Production deployment guide
├── TESTING_QUICKSTART.md          # ⚡ START HERE - Run tests in 5 minutes
├── UNIT_TESTING_PLAN.md           # Unit testing guide with Jest
├── INTEGRATION_TESTING_PLAN.md    # Integration testing guide (API + DB)
└── END_TO_END_TESTING_PLAN.md     # E2E testing guide with scenarios
```

---

## 🏗️ Architecture

### Microservices Overview

| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 3001 | User authentication, OTP verification |
| product-service | 3002 | Product catalog, variants |
| factory-service | 3003 | Factory profiles |
| **group-buying-service** | 3004 | **Group buying sessions, MOQ, tiers** |
| payment-service | 3005 | Xendit integration, escrow, refunds |
| order-service | 3006 | Order creation, fulfillment |
| notification-service | 3007 | Push notifications |
| warehouse-service | 3008 | Inventory, purchase orders |
| review-service | 3009 | Product reviews |
| **wallet-service** | 3010 | **Wallet, credits, withdrawals** |
| logistics-service | 3011 | Shipping integration (Biteship) |
| seller-service | 3012 | Seller inventory (future) |
| settlement-service | 3013 | Factory settlements |
| office-service | 3014 | Agent offices |
| address-service | 3015 | User addresses |
| whatsapp-service | 3016 | Factory WhatsApp notifications |

### Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 14+
- **ORM:** Prisma
- **Cache:** Redis
- **Payment Gateway:** Xendit (Indonesia)
- **Shipping:** Biteship API
- **Process Manager:** PM2 (production)

---

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 7+
- npm or pnpm

### 1. Clone Repository
```bash
git clone https://github.com/Justustin/ecommerce-justin.git
cd ecommerce-justin
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
# Set DATABASE_URL in packages/database/.env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# Generate Prisma client
cd packages/database
npx prisma generate

# Run migrations (if needed)
npx prisma migrate deploy
```

### 4. Environment Variables

Each service needs a `.env` file. See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete list.

**Key Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# Xendit (Payment)
XENDIT_SECRET_KEY=xnd_production_xxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token

# Bot User ID
BOT_USER_ID=00000000-0000-0000-0000-000000000001
```

### 5. Start Services

**Development (single service):**
```bash
cd services/wallet-service
npm run dev
```

**Production (all services with PM2):**
```bash
pm2 start ecosystem.config.js
pm2 save
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

---

## 📚 Documentation

### Essential Docs (Read First)

**⚡ TESTING QUICKSTART:** [TESTING_QUICKSTART.md](./TESTING_QUICKSTART.md) - Run 84 unit tests in 5 minutes!

1. **[COMPREHENSIVE_FLOW_SUMMARY.md](./COMPREHENSIVE_FLOW_SUMMARY.md)** ⭐
   - Complete backend business logic
   - Group buying flow (happy path & failure)
   - Bot participant logic
   - Grosir allocation system
   - Payment & escrow flow
   - **Master documentation - read this first!**

2. **[WALLET_SERVICE_API.md](./WALLET_SERVICE_API.md)** 🔧
   - Wallet API documentation
   - Swagger UI guide
   - Complete testing examples
   - Webhook integration
   - Test scenarios with cURL commands

3. **[CRON_SETUP.md](./CRON_SETUP.md)** ⏰
   - Required CRON jobs (3 total)
   - AWS EventBridge setup
   - Google Cloud Scheduler setup
   - Kubernetes CronJob examples

4. **[DEPLOYMENT.md](./DEPLOYMENT.md)** 🚀
   - Production deployment guide
   - PM2 configuration
   - Nginx reverse proxy
   - Security checklist
   - Monitoring setup

5. **[UNIT_TESTING_PLAN.md](./UNIT_TESTING_PLAN.md)** 🔬
   - Unit testing guide with Jest
   - Business logic tests (tier pricing, refunds, fees)
   - Mock strategies for external dependencies
   - Test coverage goals (70%+)
   - CI/CD integration

6. **[INTEGRATION_TESTING_PLAN.md](./INTEGRATION_TESTING_PLAN.md)** 🔗
   - API + Database integration tests
   - Service-to-service communication tests
   - Webhook integration tests
   - Database transaction tests
   - Test data management

7. **[END_TO_END_TESTING_PLAN.md](./END_TO_END_TESTING_PLAN.md)** 🧪
   - Complete E2E testing guide
   - 7 detailed test scenarios
   - Test data preparation scripts
   - Testing tools and methods
   - Success criteria checklist

---

## 🧪 Testing

### Testing Strategy (Test Pyramid)

```
      /\
     /E2E\     ← Few (7 scenarios) - Complete user flows
    /____\
   /      \
  /Integr.\   ← Some (20%) - API + DB + Service communication
 /________\
/          \
/   Unit    \  ← Many (70%) - Business logic functions
/____________\
```

**Three-tier testing approach:**
1. **[Unit Tests](./UNIT_TESTING_PLAN.md)** - Fast, isolated function tests
2. **[Integration Tests](./INTEGRATION_TESTING_PLAN.md)** - API endpoints with database
3. **[End-to-End Tests](./END_TO_END_TESTING_PLAN.md)** - Complete business flows

### Quick Testing

**Run Unit Tests:**
```bash
npm test
npm run test:coverage
```

**Run Integration Tests:**
```bash
npm run test:integration
```

**Wallet Service (Swagger UI):**
```bash
cd services/wallet-service
npm run dev
# Open http://localhost:3010/api-docs
```

**Complete Testing Guides:**
- **[UNIT_TESTING_PLAN.md](./UNIT_TESTING_PLAN.md)** - Jest setup, business logic tests, mocking
- **[INTEGRATION_TESTING_PLAN.md](./INTEGRATION_TESTING_PLAN.md)** - API tests, webhooks, service integration
- **[END_TO_END_TESTING_PLAN.md](./END_TO_END_TESTING_PLAN.md)** - 7 scenarios with cURL commands

---

## 🔧 Development

### Database Migrations
```bash
cd packages/database

# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Regenerate client
npx prisma generate
```

### Add New Service
```bash
# Create service directory
mkdir -p services/your-service/src/{controllers,services,routes,types}

# Copy package.json from existing service
# Update dependencies and service name
# Create index.ts with Express server
```

---

## 🎯 Key Business Flows

### 1. Group Buying Session
```
User joins session → Payment held in escrow → MOQ reached →
Factory produces → Warehouse receives → Orders created →
Escrow released → Products shipped
```

### 2. Bot Participant (25% Guarantee)
```
Session < 25% filled at T-10min → Bot auto-joins →
Ensures MOQ reached → Customers get discount →
Bot deleted before order creation (no actual purchase)
```

### 3. Tier Pricing
```
25% MOQ: Highest price
50% MOQ: Medium-high price
75% MOQ: Medium-low price
100% MOQ: Lowest price

If tier improves: Refund difference to wallet
```

### 4. Wallet Withdrawal
```
User requests withdrawal → Status: pending →
CRON runs (Tue/Fri 10 AM) → Sent to Xendit → Status: processing →
Success: Completed | Failed: Auto-refund to wallet
```

---

## 🔒 Security

✅ **Webhook Verification** - HMAC-SHA256 with timing-safe comparison
✅ **Escrow Payments** - Money held until production complete
✅ **Atomic Transactions** - Race condition prevention
✅ **Webhook Deduplication** - Prevent double-processing
✅ **Input Validation** - express-validator on all endpoints
✅ **CORS Configuration** - Whitelist allowed domains

---

## 📊 CRON Jobs (Required)

**See [CRON_SETUP.md](./CRON_SETUP.md) for setup.**

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Process near-expiration | Every 2 min | `POST /api/group-buying/process-near-expiration` |
| Process expired sessions | Every 5 min | `POST /api/group-buying/process-expired` |
| **Batch withdrawals** | **Tue & Fri 10 AM** | **`POST /api/withdrawals/process-batch`** |

---

## 🐛 Troubleshooting

**Database connection errors:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**Prisma client not generated:**
```bash
cd packages/database
npx prisma generate
```

**Service won't start:**
```bash
# Check port availability
lsof -i :3010

# Check logs
pm2 logs wallet-service
```

**Webhook signature invalid:**
```bash
# Verify token matches Xendit dashboard
echo $XENDIT_WEBHOOK_VERIFICATION_TOKEN
```

---

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test locally
4. Create pull request

**Branch naming:** `feature/description` or `fix/description`

---

## 📞 Support

- **Documentation Issues:** Check [COMPREHENSIVE_FLOW_SUMMARY.md](./COMPREHENSIVE_FLOW_SUMMARY.md)
- **API Issues:** Check [WALLET_SERVICE_API.md](./WALLET_SERVICE_API.md)
- **Deployment Issues:** Check [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🎉 Recent Updates

**v1.0.0 - January 2025**
- ✅ Fixed 4 critical production bugs
- ✅ Implemented wallet withdrawal with batch processing
- ✅ Added Xendit disbursement integration
- ✅ Added Swagger API documentation
- ✅ Improved webhook security (HMAC-SHA256)
- ✅ Synced schema with database
- ✅ Complete deployment guide
- ✅ CRON setup documentation

---

**Built with ❤️ for Indonesian e-commerce**
