# Payment Service - Comprehensive Review

**Service:** Payment Service (Xendit Integration)
**Review Date:** 2025-11-09
**Status:** ⚠️ CRITICAL SECURITY ISSUES FOUND

## Executive Summary

The Payment Service integrates with Xendit payment gateway and handles payment processing, escrow management, and refunds. **13 CRITICAL bugs** were found including severe security vulnerabilities in webhook validation and incomplete refund implementation.

**Critical Issues:**
- 🔴 Webhook validation uses simple string comparison (NOT HMAC)
- 🔴 Mock refund implementations (not real Xendit API calls)
- 🔴 Xendit API parameters have wrong types
- 🔴 Escrow logic errors causing payment loss
- 🔴 Race conditions in refund processing
- 🔴 Admin force update without audit trail

---

## All Endpoints

### Public Endpoints (Port 3002)
```
POST   /api/payments/create               - Create new payment
GET    /api/payments/:id                  - Get payment details
POST   /api/payments/webhook              - Xendit webhook callback
GET    /api/payments/user/:userId         - Get user's payments
POST   /api/payments/verify               - Verify payment status
POST   /api/refunds                       - Request refund
GET    /api/refunds/:id                   - Get refund status
```

### Admin Endpoints
```
GET    /api/admin/payments                - Get all payments (filtered)
GET    /api/admin/payments/stats          - Payment statistics
GET    /api/admin/payments/:id            - Get payment details
POST   /api/admin/payments/:id/update     - Force update payment status
POST   /api/admin/payments/:id/cancel     - Cancel payment
POST   /api/admin/refunds                 - Process manual refund
GET    /api/admin/refunds                 - Get all refunds
POST   /api/admin/escrow/:groupSessionId/release  - Release escrow
GET    /api/admin/ledger                  - Get transaction ledger
POST   /api/admin/settlement/:factoryId   - Process factory settlement
GET    /api/admin/revenue                 - Get revenue report
POST   /api/admin/reconcile               - Reconcile with Xendit
```

**Total Endpoints:** 20

---

## CRITICAL BUGS

### 🔴 BUG #1: Webhook Security Vulnerability
**Location:** services/payment-service/src/controllers/webhook.controller.ts:19
**Severity:** CRITICAL - Security

**Issue:**
```typescript
// Line 19
const token = req.headers['x-callback-token'];
if (token !== 'your-secret-token-here') {  // ❌ Simple string comparison
    return res.status(401).json({ error: 'Unauthorized' });
}
```

**Problems:**
1. **Not using Xendit's official validation**: Xendit provides HMAC-SHA256 signature validation
2. **Vulnerable to replay attacks**: Old webhook payloads can be replayed
3. **Hardcoded token**: Should be in environment variables
4. **No payload integrity check**: Payload could be tampered

**Fix Required:**
```typescript
import crypto from 'crypto';

handleWebhook = async (req: Request, res: Response) => {
    const webhookToken = req.headers['x-callback-token'] as string;
    const webhookId = req.headers['webhook-id'] as string;

    // Xendit HMAC validation
    const payload = JSON.stringify(req.body);
    const signature = crypto
        .createHmac('sha256', process.env.XENDIT_WEBHOOK_SECRET!)
        .update(webhookId + payload)
        .digest('hex');

    if (signature !== webhookToken) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process webhook...
};
```

### 🔴 BUG #2: Xendit Invoice Duration Type Error
**Location:** services/payment-service/src/services/payment.service.ts:87
**Severity:** CRITICAL - API Error

**Issue:**
```typescript
// Line 87
const invoice = await xenditClient.Invoice.createInvoice({
    externalID: payment.id,
    amount: Number(payment.amount),
    payerEmail: userEmail,
    description: `Payment for order ${orderId}`,
    invoiceDuration: '86400',  // ❌ Should be number (seconds), not string
});
```

**Impact:**
- Xendit API will reject the request
- TypeScript should catch this, but might be using `any`
- All payment creations fail

**Fix Required:**
```typescript
const invoice = await xenditClient.Invoice.createInvoice({
    externalID: payment.id,
    amount: Number(payment.amount),
    payerEmail: userEmail,
    description: `Payment for order ${orderId}`,
    invoiceDuration: 86400,  // ✓ Number: 24 hours in seconds
});
```

### 🔴 BUG #3: Escrow Flag Logic Error
**Location:** services/payment-service/src/services/payment.service.ts:79
**Severity:** CRITICAL - Business Logic

**Issue:**
```typescript
// Line 79
const isEscrow = orderId?.startsWith('grosir-') || false;
```

**Problems:**
1. **Fragile logic**: Relies on order ID format (what if format changes?)
2. **No validation**: Doesn't verify the grosir session exists
3. **Could be bypassed**: User could create order with ID "grosir-fake"

**Fix Required:**
```typescript
// Option 1: Explicit flag from order service
const payment = await prisma.payments.create({
    data: {
        order_id: orderId,
        is_escrow: isEscrow,  // Passed from order service
        // ...
    }
});

// Option 2: Query the grosir service
let isEscrow = false;
if (orderId?.startsWith('grosir-')) {
    const sessionId = orderId.split('-')[1];
    const session = await axios.get(
        `${GROSIR_SERVICE_URL}/sessions/${sessionId}`
    );
    isEscrow = session.data.status === 'active';
}
```

### 🔴 BUG #4: Payment Marking Loses Escrow State
**Location:** services/payment-service/src/services/payment.service.ts:138
**Severity:** CRITICAL - Data Loss

**Issue:**
```typescript
// Line 138
async markAsPaid(paymentId: string, xenditInvoiceId: string) {
    return await prisma.payments.update({
        where: { id: paymentId },
        data: {
            status: 'paid',
            xendit_invoice_id: xenditInvoiceId,
            paid_at: new Date()
            // ❌ Missing: is_escrow flag preservation
        }
    });
}
```

**Impact:**
- If payment is escrow, the flag might be lost
- Could release funds immediately instead of holding in escrow

**Fix Required:**
```typescript
async markAsPaid(paymentId: string, xenditInvoiceId: string) {
    const payment = await prisma.payments.findUnique({
        where: { id: paymentId }
    });

    if (!payment) throw new Error('Payment not found');

    const updated = await prisma.payments.update({
        where: { id: paymentId },
        data: {
            status: payment.is_escrow ? 'escrow' : 'paid',  // ✓ Preserve escrow
            xendit_invoice_id: xenditInvoiceId,
            paid_at: new Date()
        }
    });

    return updated;
}
```

### 🔴 BUG #5: Transaction Ledger Factory ID Null Handling
**Location:** services/payment-service/src/services/payment.service.ts:268
**Severity:** HIGH - Data Integrity

**Issue:**
```typescript
// Line 268
async recordInLedger(data: LedgerEntry) {
    return await prisma.transaction_ledger.create({
        data: {
            factory_id: data.factoryId || null,  // ❌ Should not allow null for factory payments
            // ...
        }
    });
}
```

**Problem:**
- For factory settlements, `factory_id` should be required
- Null values make reconciliation impossible
- Could lose track of which factory received payment

**Fix Required:**
```typescript
async recordInLedger(data: LedgerEntry) {
    if (data.type === 'factory_settlement' && !data.factoryId) {
        throw new Error('Factory ID required for factory settlements');
    }

    return await prisma.transaction_ledger.create({
        data: {
            factory_id: data.factoryId || null,
            // ...
        }
    });
}
```

### 🔴 BUG #6: Refund Payment Method Type Safety
**Location:** services/payment-service/src/services/refund.service.ts:45
**Severity:** HIGH - Type Error

**Issue:**
```typescript
// Line 45
const refund = await prisma.refunds.create({
    data: {
        payment_id: payment.id,
        amount: refundAmount,
        reason,
        status: 'pending',
        refund_method: payment.payment_method  // ❌ Could be undefined/null
    }
});
```

**Impact:**
- If payment has no payment_method, refund creation fails
- Should default to original payment method or manual review

**Fix Required:**
```typescript
const refund = await prisma.refunds.create({
    data: {
        payment_id: payment.id,
        amount: refundAmount,
        reason,
        status: 'pending',
        refund_method: payment.payment_method || 'manual_review'
    }
});
```

### 🔴 BUG #7: Refund Processing Timeout Race Condition
**Location:** services/payment-service/src/services/refund.service.ts:67-89
**Severity:** CRITICAL - Race Condition

**Issue:**
```typescript
// Line 67-89
async processRefund(refundId: string) {
    const refund = await prisma.refunds.findUnique({
        where: { id: refundId }
    });

    // ❌ No lock, multiple processes could execute this
    if (refund.status !== 'approved') {
        throw new Error('Refund not approved');
    }

    // ❌ Long-running Xendit API call
    const xenditRefund = await xenditClient.Refund.create({...});

    // ❌ If server crashes here, refund is created but DB not updated
    await prisma.refunds.update({
        where: { id: refundId },
        data: { status: 'completed' }
    });
}
```

**Impact:**
- Double refunds if process runs twice
- Lost refunds if server crashes between Xendit call and DB update

**Fix Required:**
```typescript
async processRefund(refundId: string) {
    return await prisma.$transaction(async (tx) => {
        // Lock the refund
        const refund = await tx.refunds.updateMany({
            where: {
                id: refundId,
                status: 'approved'  // Only process if approved
            },
            data: { status: 'processing' }
        });

        if (refund.count === 0) {
            throw new Error('Refund already processed or not approved');
        }

        try {
            const xenditRefund = await xenditClient.Refund.create({...});

            await tx.refunds.update({
                where: { id: refundId },
                data: {
                    status: 'completed',
                    xendit_refund_id: xenditRefund.id,
                    processed_at: new Date()
                }
            });
        } catch (error) {
            await tx.refunds.update({
                where: { id: refundId },
                data: { status: 'failed', error_message: error.message }
            });
            throw error;
        }
    });
}
```

### 🔴 BUG #8: Escrow Release Doesn't Handle Ledger Failure
**Location:** services/payment-service/src/controllers/admin.controller.ts:359-392
**Severity:** CRITICAL - Data Integrity

**Issue:**
```typescript
// Line 359-392
releaseEscrow = async (req: Request, res: Response) => {
    // ...
    for (const payment of escrowPayments) {
        await prisma.payments.update({
            where: { id: payment.id },
            data: { status: 'completed', released_at: new Date() }
        });

        // ❌ If this fails, payment is released but ledger not updated
        await prisma.transaction_ledger.create({
            data: { /* ... */ }
        });
    }
};
```

**Impact:**
- Payment marked as released but no ledger entry
- Reconciliation impossible
- Factory might not get paid

**Fix Required:**
```typescript
releaseEscrow = async (req: Request, res: Response) => {
    for (const payment of escrowPayments) {
        await prisma.$transaction(async (tx) => {
            await tx.payments.update({
                where: { id: payment.id },
                data: { status: 'completed', released_at: new Date() }
            });

            await tx.transaction_ledger.create({
                data: { /* ... */ }
            });
        });
    }
};
```

### 🔴 BUG #9: Mock Refund Implementations
**Location:** services/payment-service/src/services/refund.service.ts:120-135
**Severity:** CRITICAL - Incomplete Implementation

**Issue:**
```typescript
// Line 120-135
private async processEWalletRefund(refund: any) {
    // TODO: Implement actual Xendit e-wallet refund
    console.log('Processing e-wallet refund:', refund.id);
    return { success: true, refund_id: 'mock-ewallet-refund-id' };  // ❌ MOCK!
}

private async processBankTransferRefund(refund: any) {
    // TODO: Implement actual bank transfer refund
    console.log('Processing bank transfer refund:', refund.id);
    return { success: true, refund_id: 'mock-bank-refund-id' };  // ❌ MOCK!
}
```

**Impact:**
- **Refunds don't actually happen** for e-wallet and bank transfer
- Users don't receive their money back
- Compliance/legal issues

**Fix Required:**
```typescript
private async processEWalletRefund(refund: any, payment: any) {
    const xenditRefund = await xenditClient.EWallet.createRefund({
        charge_id: payment.xendit_charge_id,
        amount: refund.amount,
        reason: refund.reason
    });

    return {
        success: true,
        refund_id: xenditRefund.id
    };
}

private async processBankTransferRefund(refund: any, payment: any) {
    // Xendit doesn't support automated bank refunds
    // Need to process manually via dashboard
    return {
        success: false,
        message: 'Bank transfer refunds require manual processing',
        requires_manual: true
    };
}
```

### 🔴 BUG #10: Admin Force Update Without Validation
**Location:** services/payment-service/src/controllers/admin.controller.ts:118-151
**Severity:** HIGH - Security & Audit

**Issue:**
```typescript
// Line 118-151
updatePaymentStatus = async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { newStatus, adminNote } = req.body;

    // ❌ No validation of status transition
    // ❌ Could mark unpaid as paid without actual payment
    // ❌ No audit trail of who made the change

    const payment = await prisma.payments.update({
        where: { id: paymentId },
        data: { status: newStatus, admin_note: adminNote }
    });
};
```

**Impact:**
- Admin could mark payments as paid without actual payment
- No record of who made changes
- Could be abused for fraud

**Fix Required:**
```typescript
updatePaymentStatus = async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { newStatus, adminNote } = req.body;
    const adminId = req.user.id;  // From JWT

    // Validate status transition
    const validTransitions = {
        'pending': ['paid', 'failed', 'cancelled'],
        'paid': ['refunded', 'disputed'],
        'escrow': ['completed', 'refunded'],
        // ...
    };

    const payment = await prisma.payments.findUnique({
        where: { id: paymentId }
    });

    if (!validTransitions[payment.status]?.includes(newStatus)) {
        return res.status(400).json({
            error: `Invalid transition: ${payment.status} -> ${newStatus}`
        });
    }

    // Audit trail
    await prisma.$transaction([
        prisma.payments.update({
            where: { id: paymentId },
            data: { status: newStatus, admin_note: adminNote }
        }),
        prisma.admin_audit_log.create({
            data: {
                admin_id: adminId,
                action: 'payment_status_update',
                resource_type: 'payment',
                resource_id: paymentId,
                old_value: payment.status,
                new_value: newStatus,
                note: adminNote
            }
        })
    ]);
};
```

### 🔴 BUG #11: Missing User Validation in Escrow Creation
**Location:** services/payment-service/src/services/payment.service.ts:156-185
**Severity:** HIGH - Business Logic

**Issue:**
```typescript
// Line 156-185
async createEscrowPayment(orderId: string, userId: string, amount: number) {
    // ❌ Doesn't verify user is participant in group session
    // ❌ Could create escrow for non-grosir orders

    const payment = await prisma.payments.create({
        data: {
            order_id: orderId,
            user_id: userId,
            amount,
            is_escrow: true,
            status: 'pending'
        }
    });
}
```

**Impact:**
- User could create escrow payments for regular orders
- Funds held unnecessarily
- Business logic bypass

**Fix Required:**
```typescript
async createEscrowPayment(orderId: string, userId: string, amount: number) {
    // Verify order is from group buying
    const sessionId = orderId.split('-')[1];

    const participation = await axios.get(
        `${GROSIR_SERVICE_URL}/sessions/${sessionId}/participants`,
        { params: { userId } }
    );

    if (!participation.data.isParticipant) {
        throw new Error('User is not a participant in this group session');
    }

    const payment = await prisma.payments.create({
        data: {
            order_id: orderId,
            user_id: userId,
            amount,
            is_escrow: true,
            status: 'pending',
            group_session_id: sessionId  // Add for reference
        }
    });
}
```

### 🔴 BUG #12: Hardcoded Email Domain
**Location:** services/payment-service/src/services/payment.service.ts:84
**Severity:** MEDIUM - Configuration

**Issue:**
```typescript
// Line 84
const userEmail = `user${userId}@example.com`;  // ❌ Placeholder email
```

**Impact:**
- Xendit invoices sent to fake email
- Users don't receive payment links
- Poor user experience

**Fix Required:**
```typescript
// Call user service to get real email
const userResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
const userEmail = userResponse.data.email;

if (!userEmail) {
    throw new Error('User email not found');
}
```

### 🔴 BUG #13: Refund Amount Not Validated
**Location:** services/payment-service/src/controllers/refund.controller.ts:23-45
**Severity:** HIGH - Business Logic

**Issue:**
```typescript
// Line 23-45
createRefund = async (req: Request, res: Response) => {
    const { paymentId, amount, reason } = req.body;

    // ❌ Doesn't check if amount <= payment amount
    // ❌ Could refund more than original payment

    const refund = await prisma.refunds.create({
        data: { payment_id: paymentId, amount, reason }
    });
};
```

**Impact:**
- Could refund more money than received
- Financial loss

**Fix Required:**
```typescript
createRefund = async (req: Request, res: Response) => {
    const { paymentId, amount, reason } = req.body;

    const payment = await prisma.payments.findUnique({
        where: { id: paymentId },
        include: { refunds: true }
    });

    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }

    // Calculate already refunded amount
    const totalRefunded = payment.refunds
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.amount), 0);

    const maxRefundable = Number(payment.amount) - totalRefunded;

    if (amount > maxRefundable) {
        return res.status(400).json({
            error: `Cannot refund ${amount}. Max refundable: ${maxRefundable}`
        });
    }

    const refund = await prisma.refunds.create({
        data: { payment_id: paymentId, amount, reason }
    });
};
```

---

## Security Concerns

### Critical Security Issues
- 🔴 **Webhook validation using simple string comparison** (NOT HMAC)
- 🔴 **No replay attack protection**
- 🔴 **Admin endpoints can force status changes without audit**
- 🔴 **No rate limiting on payment creation**

### Data Integrity Issues
- ⚠️ Race conditions in refund processing
- ⚠️ Escrow release not atomic (payment + ledger)
- ⚠️ No validation of refund amounts
- ⚠️ Mock refund implementations (money not actually returned)

### Configuration Issues
- ⚠️ Hardcoded webhook token
- ⚠️ Placeholder email domain
- ⚠️ API parameter type mismatches

---

## Code Quality Issues

### Incomplete Implementations
1. **Mock refunds** for e-wallet and bank transfer (lines 120-135)
2. **TODO comments** scattered throughout (13 instances)
3. **Placeholder email** instead of real user email

### Error Handling
1. **Generic error messages**: "Payment failed" without details
2. **No Xendit error parsing**: Xendit errors not properly handled
3. **Missing rollback logic**: If Xendit succeeds but DB fails

### Configuration Management
1. **Hardcoded values**: Webhook tokens, email domains, timeouts
2. **Missing environment variables**: Should use .env for all secrets
3. **No service URLs**: Inter-service communication hardcoded

---

## Business Logic Review

### ✅ Well-Implemented Features

1. **Escrow System** - Correctly holds payments until MOQ met
2. **Transaction Ledger** - Good audit trail of all transactions
3. **Factory Settlement** - Proper distribution of revenue
4. **Payment Expiration** - Cron job processes expired payments
5. **Admin Dashboard** - Comprehensive admin endpoints

### ⚠️ Issues & Improvements

1. **Partial Refunds**: Consider supporting partial refunds (currently full refunds only)
2. **Multi-currency**: No support for multiple currencies
3. **Payment Split**: Consider splitting payment between platform and factory
4. **Dispute Handling**: No dispute/chargeback workflow
5. **Reconciliation**: Limited reconciliation with Xendit

---

## Database Schema Reference

### Tables Used
```sql
payments (
    id, order_id, user_id, amount, status, payment_method,
    xendit_invoice_id, xendit_invoice_url, is_escrow,
    paid_at, expired_at, admin_note, created_at
)

refunds (
    id, payment_id, amount, reason, status, refund_method,
    xendit_refund_id, approved_by, approved_at,
    processed_at, admin_note, created_at
)

transaction_ledger (
    id, payment_id, refund_id, factory_id, type,
    amount, description, created_at
)
```

**Observations:**
- ✅ Good schema design
- ⚠️ Missing `group_session_id` in payments (helpful for escrow tracking)
- ⚠️ Missing admin audit log table
- ⚠️ Missing payment dispute table

---

## Recommendations (Priority Order)

### 🔥 CRITICAL (Must Fix Before Production)
1. **Implement HMAC webhook validation** (replace string comparison)
2. **Implement real refund methods** (remove mock implementations)
3. **Fix Xendit API parameter types** (invoiceDuration as number)
4. **Add transaction wrapping** for refund processing
5. **Validate refund amounts** against payment amounts

### ⚠️ HIGH (Fix Soon)
6. **Add admin audit logging** for all force updates
7. **Validate status transitions** before allowing updates
8. **Fix escrow release** to be atomic (payment + ledger)
9. **Get real user email** instead of placeholder
10. **Add user validation** for escrow payments

### 📋 MEDIUM (Improve Quality)
11. **Add rate limiting** on payment creation
12. **Implement proper error handling** for Xendit errors
13. **Add replay attack protection** for webhooks
14. **Fix escrow flag logic** (don't rely on order ID format)
15. **Add null checks** for factory_id in ledger

### 💡 ENHANCEMENTS (Future)
16. **Multi-currency support**
17. **Partial refund support**
18. **Dispute/chargeback workflow**
19. **Real-time reconciliation with Xendit**
20. **Payment retry logic** for failed payments

---

## Testing Recommendations

### Required Tests
1. **Webhook Signature**: Test HMAC validation with valid/invalid signatures
2. **Race Conditions**: Test concurrent refund processing
3. **Escrow Flow**: Test complete escrow cycle (create → hold → release)
4. **Refund Validation**: Test refund amount validation edge cases
5. **Status Transitions**: Test all valid/invalid status transitions

### Integration Tests
- Xendit API integration (use sandbox)
- Grosir service integration for escrow
- Order service integration for payment creation

### Security Tests
- Webhook replay attacks
- Invalid signature injection
- Admin privilege escalation
- Refund amount manipulation

---

## Conclusion

The Payment Service has a solid architecture but **CRITICAL security vulnerabilities and incomplete implementations block production deployment**. The webhook validation and mock refund implementations are the highest priorities.

**Blockers for Production:**
1. Insecure webhook validation (simple string, not HMAC)
2. Mock refund implementations (money not actually refunded)
3. Xendit API type errors
4. Race conditions in critical operations

**Estimated Fix Time:** 3-5 days for critical issues
**Recommended:** Complete security audit before deployment
