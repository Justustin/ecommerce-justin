# E-Commerce Platform Deployment Guide

Complete deployment guide for the group-buying e-commerce platform with microservices architecture.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Service Deployment](#service-deployment)
6. [CRON Infrastructure](#cron-infrastructure)
7. [API Gateway & Routing](#api-gateway--routing)
8. [Security Checklist](#security-checklist)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)

---

## Architecture Overview

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| auth-service | 3001 | User authentication & OTP verification |
| product-service | 3002 | Product catalog & variants management |
| factory-service | 3003 | Factory profiles & verification |
| group-buying-service | 3004 | Group buying sessions, MOQ, tier pricing |
| payment-service | 3005 | Xendit integration, escrow, refunds |
| order-service | 3006 | Order management & fulfillment |
| notification-service | 3007 | Push notifications, emails, SMS |
| warehouse-service | 3008 | Inventory, purchase orders, stock allocation |
| review-service | 3009 | Product & factory reviews |
| wallet-service | 3010 | User wallet, credits, withdrawals |
| logistics-service | 3011 | Shipping integration & tracking |
| seller-service | 3012 | Seller inventory (future feature) |
| settlement-service | 3013 | Factory settlements & payouts |
| office-service | 3014 | Agent office management |
| address-service | 3015 | User addresses & location services |
| whatsapp-service | 3016 | WhatsApp notifications to factories |

### External Dependencies
- **PostgreSQL** (Database)
- **Redis** (Caching, session management)
- **Xendit** (Payment gateway & disbursements)
- **WhatsApp Business API** (Factory communication)
- **S3/Cloud Storage** (Image uploads)

---

## Prerequisites

### System Requirements
- **Node.js**: v18+ LTS
- **npm**: v9+
- **PostgreSQL**: v14+
- **Redis**: v7+
- **PM2** (for production process management)
- **Nginx** (for reverse proxy)

### Cloud Infrastructure (Recommended)
- **Compute**: AWS EC2 / Google Compute Engine / DigitalOcean Droplets
- **Database**: AWS RDS PostgreSQL / Google Cloud SQL
- **Cache**: AWS ElastiCache Redis / Google Memorystore
- **Storage**: AWS S3 / Google Cloud Storage
- **CRON**: AWS EventBridge / Google Cloud Scheduler

---

## Environment Variables

Create `.env` files for each service. **CRITICAL**: Never commit `.env` files to git.

### Database Package (.env in `/packages/database`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce?schema=public
```

### Auth Service
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_URL=redis://localhost:6379
OTP_EXPIRY_MINUTES=5
```

### Product Service
```env
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
S3_BUCKET=your-product-images-bucket
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Factory Service
```env
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
```

### Group Buying Service
```env
PORT=3004
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
WAREHOUSE_SERVICE_URL=http://localhost:3008
PAYMENT_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3007
BOT_USER_ID=00000000-0000-0000-0000-000000000001
```

### Payment Service
```env
PORT=3005
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
XENDIT_SECRET_KEY=xnd_production_xxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
XENDIT_PUBLIC_KEY=xnd_public_production_xxx
NOTIFICATION_SERVICE_URL=http://localhost:3007
```

### Order Service
```env
PORT=3006
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
LOGISTICS_SERVICE_URL=http://localhost:3011
NOTIFICATION_SERVICE_URL=http://localhost:3007
```

### Notification Service
```env
PORT=3007
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FCM_SERVER_KEY=your-firebase-server-key
SMS_API_KEY=your-sms-provider-key
```

### Warehouse Service
```env
PORT=3008
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
WHATSAPP_SERVICE_URL=http://localhost:3016
FACTORY_SERVICE_URL=http://localhost:3003
```

### Review Service
```env
PORT=3009
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
```

### Wallet Service
```env
PORT=3010
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
XENDIT_SECRET_KEY=xnd_production_xxx
XENDIT_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
```

### Logistics Service
```env
PORT=3011
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
JNE_API_KEY=your-jne-api-key
JNT_API_KEY=your-jnt-api-key
SICEPAT_API_KEY=your-sicepat-api-key
```

### Seller Service
```env
PORT=3012
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
```

### Settlement Service
```env
PORT=3013
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
XENDIT_SECRET_KEY=xnd_production_xxx
```

### Office Service
```env
PORT=3014
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
```

### Address Service
```env
PORT=3015
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### WhatsApp Service
```env
PORT=3016
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
WHATSAPP_API_URL=https://api.whatsapp.com/send
WHATSAPP_API_TOKEN=your-whatsapp-business-token
```

---

## Database Setup

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database
```bash
sudo -u postgres psql

CREATE DATABASE ecommerce;
CREATE USER ecommerce_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce TO ecommerce_user;

# Enable UUID extension
\c ecommerce
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 3. Run Prisma Migrations
```bash
cd packages/database

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (if seed script exists)
npx prisma db seed
```

### 4. Create Bot User (Required for Group Buying)
```sql
INSERT INTO users (id, phone_number, password_hash, first_name, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '+628001234567',
  'bot-no-password',
  'Platform Bot',
  'customer',
  'active'
);
```

---

## Service Deployment

### Option 1: PM2 (Recommended for Production)

#### Install PM2
```bash
npm install -g pm2
```

#### Create ecosystem.config.js
```javascript
module.exports = {
  apps: [
    {
      name: 'auth-service',
      cwd: './services/auth-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3001 }
    },
    {
      name: 'product-service',
      cwd: './services/product-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3002 }
    },
    {
      name: 'factory-service',
      cwd: './services/factory-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3003 }
    },
    {
      name: 'group-buying-service',
      cwd: './services/group-buying- service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3004 }
    },
    {
      name: 'payment-service',
      cwd: './services/payment-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3005 }
    },
    {
      name: 'order-service',
      cwd: './services/order-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3006 }
    },
    {
      name: 'notification-service',
      cwd: './services/notification-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3007 }
    },
    {
      name: 'warehouse-service',
      cwd: './services/warehouse-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3008 }
    },
    {
      name: 'review-service',
      cwd: './services/review-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3009 }
    },
    {
      name: 'wallet-service',
      cwd: './services/wallet-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3010 }
    },
    {
      name: 'logistics-service',
      cwd: './services/logistics-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3011 }
    },
    {
      name: 'seller-service',
      cwd: './services/seller-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3012 }
    },
    {
      name: 'settlement-service',
      cwd: './services/settlement-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3013 }
    },
    {
      name: 'office-service',
      cwd: './services/office-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3014 }
    },
    {
      name: 'address-service',
      cwd: './services/address-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3015 }
    },
    {
      name: 'whatsapp-service',
      cwd: './services/whatsapp-service',
      script: 'npm',
      args: 'start',
      env: { PORT: 3016 }
    }
  ]
};
```

#### Start All Services
```bash
# Install dependencies for all services
npm run install:all  # or run npm install in each service directory

# Build all services (if TypeScript)
npm run build:all

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### PM2 Commands
```bash
# List all services
pm2 list

# View logs
pm2 logs
pm2 logs auth-service
pm2 logs --lines 100

# Restart a service
pm2 restart auth-service

# Stop all services
pm2 stop all

# Monitor
pm2 monit
```

### Option 2: Docker Compose

#### Dockerfile (example for a service)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: ecommerce_user
      POSTGRES_PASSWORD: your-password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3001"
    env_file:
      - ./services/auth-service/.env
    depends_on:
      - postgres
      - redis

  # ... repeat for all services

volumes:
  postgres_data:
```

---

## CRON Infrastructure

**See [CRON_SETUP.md](./CRON_SETUP.md) for complete CRON job setup.**

Required CRON jobs:
1. Process near-expiration sessions (every 2 min)
2. Process expired sessions (every 5 min)
3. Process batch withdrawals (Tue & Fri 10 AM)

---

## API Gateway & Routing

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/ecommerce

upstream auth_service {
    server localhost:3001;
}

upstream product_service {
    server localhost:3002;
}

upstream group_buying_service {
    server localhost:3004;
}

upstream payment_service {
    server localhost:3005;
}

upstream wallet_service {
    server localhost:3010;
}

# Add upstream blocks for all services...

server {
    listen 80;
    server_name api.yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Auth endpoints
    location /api/auth/ {
        proxy_pass http://auth_service/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Product endpoints
    location /api/products/ {
        proxy_pass http://product_service/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Group buying endpoints
    location /api/group-buying/ {
        proxy_pass http://group_buying_service/api/group-buying/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Payment webhooks (no rate limiting)
    location /api/webhooks/payment {
        limit_req off;
        proxy_pass http://payment_service/api/webhooks/payment;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Wallet endpoints
    location /api/wallet/ {
        proxy_pass http://wallet_service/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Add more location blocks for all services...
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL/TLS Setup (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Security Checklist

### Environment Security
- [ ] All `.env` files excluded from git (`.gitignore`)
- [ ] Strong passwords for database (20+ chars, random)
- [ ] JWT secrets are cryptographically random (64+ chars)
- [ ] Xendit API keys are production keys (not test keys)
- [ ] Webhook verification tokens are random and secure

### Network Security
- [ ] PostgreSQL only accessible from application servers
- [ ] Redis protected with password
- [ ] CRON endpoints not publicly exposed
- [ ] CORS configured correctly (whitelist domains)
- [ ] Rate limiting enabled on all public endpoints

### Application Security
- [ ] SQL injection prevention (Prisma ORM used)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection enabled
- [ ] Webhook signature verification (HMAC-SHA256)
- [ ] Password hashing (bcrypt with salt)
- [ ] OTP rate limiting (max 3 attempts)

### Data Security
- [ ] Database backups encrypted
- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL enabled for all external communication
- [ ] PII data handling compliant with regulations

---

## Monitoring & Logging

### Health Checks
Each service exposes `/health` endpoint:
```bash
curl http://localhost:3001/health
# {"status":"ok","service":"auth-service"}
```

### Logging Best Practices
```javascript
// Use structured logging
const logger = require('winston');

logger.info('User logged in', {
  userId: user.id,
  timestamp: new Date(),
  service: 'auth-service'
});
```

### Monitoring Tools (Recommended)
- **Application Performance**: New Relic, DataDog, or Sentry
- **Infrastructure**: CloudWatch (AWS), Stackdriver (GCP)
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime**: Pingdom, UptimeRobot

### Key Metrics to Monitor
- API response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database connection pool usage
- Queue depth (if using message queues)
- CRON job success/failure rates
- Xendit payment success rates
- Withdrawal processing times

---

## Backup & Recovery

### Database Backups

#### Daily Automated Backup (Crontab)
```bash
#!/bin/bash
# /home/user/scripts/backup-db.sh

BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ecommerce_$DATE.sql.gz"

# Create backup
pg_dump -U ecommerce_user ecommerce | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "ecommerce_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database/

echo "Backup completed: $BACKUP_FILE"
```

Add to crontab:
```bash
0 2 * * * /home/user/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

#### Restore from Backup
```bash
# Restore from backup
gunzip -c ecommerce_20250118.sql.gz | psql -U ecommerce_user ecommerce
```

### Application Backups
- Code: Git repository (GitHub/GitLab)
- Configuration: Store encrypted `.env` files in secure vault
- Uploads: S3 versioning enabled

---

## Deployment Checklist

### Pre-Deployment
- [ ] Database migrations tested on staging
- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] CRON jobs scheduled
- [ ] Monitoring & alerting configured
- [ ] Backup strategy implemented

### Deployment
- [ ] Pull latest code from repository
- [ ] Run database migrations
- [ ] Build all services
- [ ] Start services with PM2
- [ ] Verify all health endpoints
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error logs for 1 hour
- [ ] Verify CRON jobs execute successfully
- [ ] Test payment flow end-to-end
- [ ] Verify webhook delivery
- [ ] Check database connection pool

---

## Rollback Procedure

If deployment fails:

1. **Stop all services**
   ```bash
   pm2 stop all
   ```

2. **Restore database from backup** (if migrations failed)
   ```bash
   gunzip -c latest_backup.sql.gz | psql -U ecommerce_user ecommerce
   ```

3. **Checkout previous working commit**
   ```bash
   git checkout <previous-commit-hash>
   ```

4. **Rebuild and restart**
   ```bash
   npm run build:all
   pm2 restart all
   ```

---

## Support & Troubleshooting

### Common Issues

**Services won't start**
- Check `.env` files exist and are valid
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check port conflicts: `lsof -i :3001`

**Database connection errors**
- Verify `DATABASE_URL` format
- Check PostgreSQL accepts connections
- Verify user permissions

**Webhook failures**
- Verify webhook URL is publicly accessible
- Check `XENDIT_WEBHOOK_VERIFICATION_TOKEN`
- Review Xendit dashboard for delivery logs

**CRON jobs not running**
- Verify CRON scheduler is active
- Check service health endpoints
- Review CRON job logs

---

## Production Deployment Timeline

1. **Week 1**: Infrastructure setup (servers, database, Redis)
2. **Week 2**: Deploy services, configure Nginx
3. **Week 3**: Setup CRON jobs, monitoring, SSL
4. **Week 4**: Testing, security audit, go-live

---

## Maintenance Windows

Recommended maintenance schedule:
- **Database migrations**: Sunday 2-4 AM Jakarta time
- **Service updates**: Rolling updates (no downtime)
- **Security patches**: As needed with 24h notice

---

For CRON job setup details, see [CRON_SETUP.md](./CRON_SETUP.md).
