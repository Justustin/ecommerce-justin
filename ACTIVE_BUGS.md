# Active Bugs - E-Commerce Platform

**Date:** 2025-11-11
**Status:** Functional bugs only (excluding auth/security - handled by other dev)

---

## 🔴 CRITICAL BUGS

### 1. Order Service - Wrong Payment Amount Calculation
**File:** `services/order-service/src/services/order.service.ts:88`
**Severity:** CRITICAL - Financial loss

**Issue:**
```typescript
// Line 87-88
// Use pre-calculated total_amount from repository (includes discounts)
const totalAmount = Number(order.subtotal || 0); // ❌ BUG: Uses subtotal instead of total_amount!
```

**Impact:**
- Payment amount DOES NOT include shipping cost or tax
- Customer pays less than actual order total
- Business loses money on every order

**Correct Fix:**
```typescript
const totalAmount = Number(order.total_amount || 0); // ✅ Use total_amount
```

**Example:**
```
Order Details:
- Subtotal: Rp 100,000
- Shipping: Rp 15,000
- Tax: Rp 5,000
- Total: Rp 120,000

Current (WRONG): Payment created for Rp 100,000 (subtotal only)
Correct: Payment should be for Rp 120,000 (total_amount)

Business Loss: Rp 20,000 per order
```

---

## 🟠 HIGH PRIORITY BUGS

### 2. Group Buying - TODO Comments for Critical Features
**Files:** Multiple in `services/group-buying- service/`

**TODOs Found:**
1. Line 966: `// TODO: Notify all participants` - Production started notification
2. Line 1026: `// TODO: Notify participants - ready for shipping` - Production completed notification
3. Line 1038: `// TODO: Trigger logistics - create pickup tasks` - Pickup task creation
4. Line 1080: `// TODO: Notify factory owner` - MOQ reached notification
5. Line 1094: `// TODO: Notify all participants` - Group confirmed notification
6. Line 1407-1411: `// TODO: Calculate and charge shipping`, `// TODO: Notify participants/factory`
7. Line 1440-1442: `// TODO: Notify participants - refund coming`, `// TODO: Notify factory`, `// TODO: Trigger refunds`
8. Line 1660: `// TODO: Notify all participants of price drop`

**Impact:**
- Users not notified of important events
- Factory owners don't know when to start production
- No notification when MOQ reached
- Missing refund trigger implementation

**Note:** Most notifications are commented out but implementation appears to exist. May just need uncommenting and testing.

---

### 3. Wallet Service - Withdrawal Processing Incomplete
**File:** `services/wallet-service/src/controllers/admin.controller.ts:366`

**Issue:**
```typescript
// TODO: Integrate with payment gateway to actually send money
// Money is NOT actually transferred to user's bank!
```

**Impact:**
- Withdrawals approved in system
- Money NEVER sent to user's bank account
- Users think money is coming but it never arrives

---

### 4. Notification Service - Push/Email Not Implemented
**File:** `services/notification-service/src/services/notification.service.ts:17-18`

**Issue:**
```typescript
// TODO: Send push notification if enabled
// TODO: Send email notification if enabled
```

**Impact:**
- All notification records created in database
- NO actual notifications sent to users
- Users miss important updates

---

### 5. Warehouse Service - Missing Audit Logging
**Files:**
- `services/warehouse-service/src/controllers/admin.controller.ts:155-156`
- `services/warehouse-service/src/controllers/admin.controller.ts:539-541`

**Issue:**
```typescript
// TODO: Create audit log entry
// TODO: Implement warehouse_audit_log table
```

**Impact:**
- No audit trail for inventory changes
- Cannot track who made adjustments
- Compliance issues

---

### 6. WhatsApp Service - Sending Logic Not Implemented
**File:** `services/whatsapp-service/src/controllers/admin.controller.ts:195`

**Issue:**
```typescript
// TODO: Integrate with actual WhatsApp sending logic
const whatsappMessage = await prisma.whatsapp_messages.create({...});
// Message record created but nothing actually sent
```

**Impact:**
- WhatsApp messages saved to database
- NO messages actually sent via WhatsApp API

---

## 🟡 MEDIUM PRIORITY

### 7. Payment Service - Mock Refund Implementations
**File:** Actual implementation unknown (TODO comment in admin controller line 257)

**Issue:**
```typescript
// TODO: Trigger actual refund processing with Xendit
// For now, we just mark as processing
```

**Impact:**
- Refunds marked as "processing"
- May or may not actually be sent
- Needs verification

---

### 8. Order Service - Refund Logic Missing
**File:** `services/order-service/src/controllers/admin.controller.ts:141`

**Issue:**
```typescript
// TODO: Trigger refund if payment was made
```

**Impact:**
- Orders can be cancelled
- Refunds not automatically triggered

---

### 9. Order Service - Auth Check Placeholder
**File:** `services/order-service/src/services/order.service.ts:239`

**Issue:**
```typescript
// TODO: Check if userId is admin
throw new Error('Unauthorized to cancel this order');
```

**Note:** Handled by another dev, but placeholder code exists

---

### 10. Product Service - Bulk Import Not Implemented
**File:** `services/product-service/src/controllers/admin.controller.ts:234-241`

**Issue:**
```typescript
// TODO: Parse CSV file and bulk insert products
res.status(501).json({
  message: 'Bulk import not yet implemented'
});
```

**Impact:**
- Endpoint exists but returns 501
- Admin cannot bulk import products

---

### 11. Logistics Service - Label Generation Returns Data Not PDF
**File:** `services/logistics-service/src/services/logistics.service.ts:498-500`

**Issue:**
```typescript
// TODO: Generate actual PDF or HTML label using a template library
// For now, return the label data
return labelData;
```

**Impact:**
- Cannot print shipping labels
- Returns JSON instead of PDF

---

### 12. Warehouse Service - Cycle Count Not Implemented
**Files:**
- `services/warehouse-service/src/controllers/admin.controller.ts:554-566`
- `services/warehouse-service/src/controllers/admin.controller.ts:569-582`

**Issue:**
```typescript
// TODO: Implement cycle count functionality
// TODO: Implement discrepancy tracking
```

**Impact:**
- Inventory reconciliation features missing
- Cannot perform physical counts

---

### 13. Factory Service - Refund Processing Incomplete
**File:** `services/factory-service/src/controllers/admin.controller.ts:398-400`

**Issue:**
```typescript
// TODO: If refundParticipants is true, trigger refund process
// This would require calling the Payment Service
```

**Impact:**
- Session cancellation doesn't trigger refunds
- Manual refund processing required

---

## 📊 SUMMARY

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 1 | Payment amount calculation |
| 🟠 High | 6 | Notifications, withdrawals, WhatsApp, audit logging |
| 🟡 Medium | 6 | Refunds, bulk import, labels, cycle count |
| **Total** | **13** | **Functional bugs** |

---

## ✅ RECENTLY FIXED (Confirmed Nov 10-11)

1. ✅ Two-leg shipping implementation
2. ✅ Group buying shipping integration
3. ✅ Warehouse service Swagger documentation
4. ✅ Shipping type validation mismatch
5. ✅ Parameter mismatch in shipping options
6. ✅ bulk_shipping_cost_per_unit generated column
7. ✅ Logistics service public routes registration
8. ✅ Missing dependencies (swagger packages)

---

## 🎯 PRIORITIZED FIX PLAN

### P0 - Fix Immediately (1-2 hours)
1. **Order Service Payment Bug** - Change `order.subtotal` to `order.total_amount` (line 88)
   - File: `services/order-service/src/services/order.service.ts`
   - Time: 5 minutes
   - Test: Create order with shipping, verify payment amount is correct

### P1 - Fix This Week (2-3 days)
2. **Notification Service** - Implement actual push/email sending
3. **Withdrawal Processing** - Integrate with payment gateway
4. **WhatsApp Service** - Integrate with WhatsApp Business API
5. **Group Buying Notifications** - Uncomment and test notification code

### P2 - Fix This Month (1 week)
6. **Audit Logging** - Create warehouse_audit_log table and implementation
7. **Refund Automation** - Complete refund processing flows
8. **Shipping Labels** - Implement PDF generation
9. **Bulk Import** - CSV parsing for products

### P3 - Future Enhancements
10. **Cycle Count** - Implement inventory reconciliation
11. **Discrepancy Tracking** - Track inventory variances

---

## 🚫 EXCLUDED FROM THIS REPORT

**Handled by other dev:**
- Authentication issues
- Authorization/role-based access
- Security vulnerabilities
- JWT middleware
- Admin role checking

**Configuration/Cosmetic:**
- Wrong package.json names (not functional bugs)
- Missing CORS configuration (deployment concern)
- Port conflicts (configuration)
- Environment variable validation (deployment)

**Code Quality (not bugs):**
- Console.log instead of proper logging
- Missing tests
- Code organization
- Error message formatting

---

## 🧪 TESTING RECOMMENDATIONS

### Critical Test: Payment Amount
```bash
# 1. Create order with shipping cost
POST /api/orders
{
  "userId": "xxx",
  "items": [...],
  "shippingAddress": {...}
}

# 2. Check payment amount in database
SELECT total_amount FROM orders WHERE id = 'order-id';
SELECT amount FROM payments WHERE order_id = 'order-id';

# 3. Verify amounts match
# Expected: payment.amount = order.total_amount (NOT order.subtotal)
```

### High Priority Tests:
1. Test withdrawal approval - verify no money sent
2. Test notifications - verify none received
3. Test WhatsApp messages - verify none sent
4. Test group buying notifications - check all TODO scenarios

---

## 📝 NOTES

- Focus is on **functional bugs** that cause incorrect behavior
- Auth/security handled separately
- Many features are partially implemented (TODO comments)
- Most TODOs are for notifications - may be quick fixes
- Critical payment bug must be fixed immediately to prevent financial loss

---

**Last Updated:** 2025-11-11
**Reviewed By:** Claude Code Assistant
**Services Analyzed:** 11
**Functional Bugs Found:** 13 (excluding auth/security)
