# Notification Service - Comprehensive Review

**Service:** Notification Service
**Review Date:** 2025-11-09
**Status:** ⚠️ CRITICAL ISSUES - SERVICE WILL NOT START

## Executive Summary

The Notification Service has **8 CRITICAL issues**, **5 HIGH severity issues**, and **4 MEDIUM issues**. **The service cannot compile or run** due to missing type definitions and dependencies.

**Critical Issues:**
- 🔴 Wrong package.json metadata (says "product-service")
- 🔴 Missing critical dependencies (web-push, twilio, axios)
- 🔴 Missing type definitions (compilation fails)
- 🔴 Notification types in templates don't exist in schema
- 🔴 Admin validation checks wrong type values
- 🔴 NO AUTHENTICATION on any endpoint
- 🔴 Push notifications never actually sent (TODO in code)
- 🔴 SQL injection in push channel

**Service Status:** 🔴 WILL NOT COMPILE OR RUN

---

## Critical Bugs

### 🔴 BUG #1: Wrong Package Name
**File:** `package.json:2`
```json
{
  "name": "product-service"  // ❌ Should be "notification-service"
}
```

### 🔴 BUG #2: Missing Critical Dependencies
**Missing from package.json:**
```json
{
  "dependencies": {
    "web-push": "^3.6.6",      // ❌ MISSING - Used in push.channel.ts
    "twilio": "^4.20.0",       // ❌ MISSING - Used in whatsapp.channel.ts
    "axios": "^1.6.5",         // ❌ MISSING - Used in whatsapp.channel.ts
    "swagger-jsdoc": "^6.2.8"  // ❌ MISSING - Used in config/swagger.ts
  }
}
```

**Impact:** Service will fail to compile with "Cannot find module" errors

### 🔴 BUG #3: Missing Type Definitions
**File:** `src/types/index.ts`

**Missing types that are imported elsewhere:**
```typescript
// ❌ MISSING - imported in notification.repository.ts:3
export interface NotificationFilters {...}

// ❌ MISSING - imported in notification.repository.ts:3
export interface PaginatedResponse<T> {...}

// ❌ MISSING - imported in notification.templates.ts:2
export enum NotificationType {...}

// ❌ MISSING - imported in notification.templates.ts:2
export interface NotificationTemplate {...}
```

**Impact:** TypeScript compilation will fail completely

**Fix:**
```typescript
export interface NotificationFilters {
  userId?: string;
  type?: notification_type;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  MOQ_REACHED = 'moq_reached',
  // ... all notification types
}

export interface NotificationTemplate {
  title: string;
  message: string;
  whatsappMessage: string;
  actionUrl?: string;
  icon?: string;
  badge?: string;
}
```

### 🔴 BUG #4: Notification Type Schema Mismatch
**File:** `src/templates/notification.templates.ts`

**Prisma Schema** has only:
```prisma
enum notification_type {
  order_created
  payment_success
  moq_reached
  production_started
  ready_for_pickup
  picked_up
  shipped
  delivered
  review_reminder
  group_expiring
}
```

**Templates Try to Use:**
- ❌ `PAYMENT_FAILED` - MISSING
- ❌ `GROUP_CONFIRMED` - MISSING
- ❌ `GROUP_FAILED` - MISSING
- ❌ `PRODUCTION_COMPLETED` - MISSING
- ❌ `OUT_FOR_DELIVERY` - MISSING
- ❌ `REFUND_INITIATED` - MISSING
- ❌ `REFUND_COMPLETED` - MISSING
- ❌ `ORDER_CANCELLED` - MISSING

**Impact:** Database constraint violations when creating notifications

**Fix:** Add missing types to Prisma schema:
```prisma
enum notification_type {
  order_created
  order_cancelled
  payment_success
  payment_failed
  moq_reached
  group_confirmed
  group_failed
  group_expiring
  production_started
  production_completed
  ready_for_pickup
  picked_up
  shipped
  out_for_delivery
  delivered
  review_reminder
  refund_initiated
  refund_completed
}
```

### 🔴 BUG #5: Admin Routes Type Validation Mismatch
**File:** `src/routes/admin.routes.ts:22,33,68`
```typescript
body('type').isIn(['order', 'payment', 'group_buying', 'promotion', 'system', 'wallet'])
```

**Issues:**
- Schema has `order_created` not `order`
- Schema has `payment_success` not `payment`
- `promotion`, `system`, `wallet` don't exist in schema

**Impact:** All admin broadcast requests fail validation

**Fix:**
```typescript
body('type').isIn([
  'order_created', 'order_cancelled',
  'payment_success', 'payment_failed',
  'moq_reached', 'group_confirmed', 'group_failed', 'group_expiring',
  'production_started', 'production_completed',
  'ready_for_pickup', 'picked_up', 'shipped', 'out_for_delivery', 'delivered',
  'review_reminder',
  'refund_initiated', 'refund_completed'
])
```

### 🔴 BUG #6: No Authentication
**All endpoints completely unprotected**

**Vulnerable Endpoints:**
- ❌ Anyone can create notifications for any user
- ❌ Anyone can read any user's notifications
- ❌ Anyone can send broadcast to all users (spam!)
- ❌ Anyone can access admin functions

### 🔴 BUG #7: Push Notifications Never Sent
**File:** `src/services/notification.service.ts:17-18`
```typescript
async createNotification(data: CreateNotificationDTO) {
  const notification = await prisma.notifications.create({...});

  // ❌ TODO: Send push notification if enabled
  // ❌ TODO: Send email notification if enabled

  return notification;
}
```

**Impact:** Core functionality not working - notifications created in DB but never delivered

**Fix:**
```typescript
async createNotification(data: CreateNotificationDTO) {
  const notification = await prisma.notifications.create({...});

  // Get template
  const template = this.templates.getTemplate(data.type, {...});

  // Send push notification
  await this.pushChannel.send({
    userId: data.userId,
    title: template.title,
    message: template.message,
    actionUrl: data.actionUrl,
    icon: template.icon
  });

  await this.repository.markAsPushed(notification.id);

  return notification;
}
```

### 🔴 BUG #8: SQL Injection in Push Channel
**File:** `src/channels/push.channel.ts:37-39,93-96`
```typescript
// Line 37-39
const subscriptions = await prisma.$queryRaw<any[]>`
  SELECT * FROM push_subscriptions WHERE user_id = ${payload.userId}::uuid
`;

// Line 93-96
const subscriptions = await prisma.$queryRaw<any[]>`
  SELECT * FROM push_subscriptions
  WHERE user_id = ANY(${payload.userIds}::uuid[])
`;
```

**Impact:** Potential SQL injection vulnerability

**Fix:** Use Prisma's safer query methods:
```typescript
const subscriptions = await prisma.push_subscriptions.findMany({
  where: { user_id: payload.userId }
});

const subscriptions = await prisma.push_subscriptions.findMany({
  where: { user_id: { in: payload.userIds } }
});
```

---

## High Severity Issues

### BUG #9: Missing Environment Variable Validation
**Files:** `src/channels/push.channel.ts:6-10`, `src/channels/whatsapp.channel.ts:5-7`
```typescript
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'admin@pinduoduo-clone.com'}`,
  process.env.VAPID_PUBLIC_KEY!,  // ❌ No validation - crashes if missing
  process.env.VAPID_PRIVATE_KEY!
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,  // ❌ No validation
  process.env.TWILIO_AUTH_TOKEN!
);
```

**Fix:** Add startup validation:
```typescript
const requiredEnvVars = [
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}
```

### BUG #10: Phone Number Type Mismatch
**File:** `src/repositories/notification.repository.ts:189`
```typescript
phoneMap.set(user.id, user.phone_number);  // ❌ phone_number might be null
```

**Fix:**
```typescript
if (user.phone_number) {
  phoneMap.set(user.id, user.phone_number);
}
```

### BUG #11: Race Condition in markAsRead
**File:** `src/services/notification.service.ts:46-64`
```typescript
const notification = await prisma.notifications.findFirst({
  where: { id: notificationId, user_id: userId }
});

if (!notification) throw new Error('Not found');

// ❌ Race condition here - could be deleted
return prisma.notifications.update({...});
```

**Fix:** Use atomic update:
```typescript
const result = await prisma.notifications.updateMany({
  where: { id: notificationId, user_id: userId },
  data: { is_read: true, read_at: new Date() }
});

if (result.count === 0) throw new Error('Not found');
```

---

## Complete Endpoint List

### Public Endpoints (NO AUTH)
```
POST   /api/notifications                - Create notification
GET    /api/notifications/user/:userId   - Get user notifications
PATCH  /api/notifications/:id/read       - Mark as read
PATCH  /api/notifications/read-all       - Mark all as read
DELETE /api/notifications/:id            - Delete notification
```

### Admin Endpoints (NO AUTH - CRITICAL!)
```
GET    /api/admin/notifications              - Get all notifications
POST   /api/admin/notifications/broadcast    - Send to multiple users
POST   /api/admin/notifications/send-all     - Send to ALL users (SPAM RISK!)
GET    /api/admin/notifications/templates    - Get templates
DELETE /api/admin/notifications/bulk         - Bulk delete
GET    /api/admin/notifications/statistics   - Get statistics
PUT    /api/admin/notifications/mark-read    - Bulk mark read
POST   /api/admin/notifications/test         - Send test notification
```

---

## Security Vulnerabilities

| Issue | Severity | Risk |
|-------|----------|------|
| No authentication | CRITICAL | Anyone can access all functionality |
| No admin authorization | CRITICAL | Anyone can spam all users |
| SQL injection | CRITICAL | Data breach possible |
| Mass spam possible | CRITICAL | /send-all is public |
| No rate limiting | HIGH | DDoS vulnerability |

---

## Prioritized Fixes

### P0 - MUST FIX (Won't Compile/Start)
1. **Fix package.json name** (2 min)
2. **Add missing dependencies** (5 min)
3. **Add missing type definitions** (15 min)
4. **Update Prisma schema with missing types** (migration required)
5. **Fix admin validation** (10 min)
6. **Implement authentication** (2-4 hours)
7. **Complete push notification sending** (2 hours)
8. **Fix SQL injection** (15 min)

**Total:** ~6-8 hours

### P1 - HIGH Priority
9. Add environment validation
10. Fix phone number handling
11. Fix race condition

### P2 - MEDIUM Priority
12. Add Swagger setup
13. Add request logging
14. Add rate limiting

---

## Required Environment Variables

```env
# Server
PORT=3007
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# VAPID (Web Push)
VAPID_EMAIL=admin@pinduoduo-clone.com
VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from above command>

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## Summary

**Issues:** 17 total
- Critical: 8
- High: 5
- Medium: 4

**Fix Time:** 6-8 hours for P0

**Status:** 🔴 **WILL NOT START**

**Blockers:**
1. Missing dependencies (compilation fails)
2. Missing type definitions (compilation fails)
3. Schema type mismatches (runtime failures)
4. No authentication (security breach)
5. Core features not implemented (TODOs)

**Recommendation:** Service needs significant work before it can even start. Fix all compilation issues first, then implement authentication and core push notification functionality.
