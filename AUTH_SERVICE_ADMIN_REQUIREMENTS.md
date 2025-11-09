# Auth Service Admin Requirements

## Overview
The Auth Service admin endpoints provide comprehensive user management, role-based access control, and security monitoring capabilities. These endpoints are critical for platform administration and user support.

## Required Admin Endpoints (13 endpoints)

### User Management (7 endpoints)

#### 1. GET /api/admin/users
**Purpose:** List all users with filtering and pagination
- **Query Parameters:**
  - `search` - Search by name, email, phone
  - `role` - Filter by user role (customer, seller, factory_owner, admin)
  - `status` - Filter by account status (active, suspended, deleted)
  - `verified` - Filter by email verification status
  - `startDate` - Filter by registration date
  - `endDate` - Filter by registration date
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 50)
- **Response:** Paginated user list with profile details
- **Use Case:** Admin dashboard, user search, bulk operations

#### 2. GET /api/admin/users/:id
**Purpose:** Get detailed user information
- **Response:** Complete user profile including:
  - Personal information (name, email, phone)
  - Account status and verification
  - Role and permissions
  - Registration date and last login
  - Associated addresses
  - Order history summary
  - Payment history summary
  - Wallet balance
- **Use Case:** User support, account investigation

#### 3. PUT /api/admin/users/:id
**Purpose:** Update user information (admin override)
- **Body:**
  - `firstName`, `lastName` - Update name
  - `email` - Update email (triggers verification)
  - `phoneNumber` - Update phone
  - `dateOfBirth` - Update DOB
  - `adminNote` - Internal admin note
- **Response:** Updated user object
- **Use Case:** Correct user data, support requests

#### 4. POST /api/admin/users/:id/suspend
**Purpose:** Suspend user account
- **Body:**
  - `reason` (required) - Suspension reason
  - `duration` - Suspension duration in days (null = permanent)
  - `note` - Admin note
- **Response:** Updated user with suspended status
- **Use Case:** Fraud prevention, policy violations

#### 5. POST /api/admin/users/:id/unsuspend
**Purpose:** Reactivate suspended account
- **Body:**
  - `note` - Admin note explaining reactivation
- **Response:** Updated user with active status
- **Use Case:** Appeal resolution, error correction

#### 6. POST /api/admin/users/:id/verify-email
**Purpose:** Manually verify user email (bypass verification process)
- **Response:** Updated user with verified email
- **Use Case:** Support escalation, verification issues

#### 7. DELETE /api/admin/users/:id
**Purpose:** Soft delete user account
- **Body:**
  - `reason` - Deletion reason
  - `hardDelete` - Boolean (false = soft delete, true = permanent)
- **Response:** Deletion confirmation
- **Use Case:** GDPR compliance, account closure requests

### Role & Permission Management (3 endpoints)

#### 8. GET /api/admin/roles
**Purpose:** List all available roles and permissions
- **Response:** Role list with associated permissions
- **Use Case:** Role configuration, permission audit

#### 9. POST /api/admin/users/:id/role
**Purpose:** Assign or change user role
- **Body:**
  - `role` (required) - New role (customer, seller, factory_owner, admin)
  - `reason` - Reason for role change
- **Response:** Updated user with new role
- **Use Case:** Seller approval, admin promotion

#### 10. GET /api/admin/users/:id/permissions
**Purpose:** Get user's effective permissions
- **Response:** Complete permission list for user
- **Use Case:** Permission debugging, access control verification

### Security & Activity (3 endpoints)

#### 11. GET /api/admin/users/:id/activity
**Purpose:** Get user activity log
- **Query Parameters:**
  - `startDate` - Filter activity by date
  - `endDate` - Filter activity by date
  - `activityType` - Filter by type (login, order, payment, etc.)
  - `page`, `limit` - Pagination
- **Response:** Activity log with timestamps and details
- **Use Case:** Security investigation, user behavior analysis

#### 12. POST /api/admin/users/:id/reset-password
**Purpose:** Force password reset (send reset email or generate temp password)
- **Body:**
  - `method` - 'email' or 'temporary'
  - `note` - Admin note
- **Response:** Success confirmation
- **Use Case:** Password recovery support, security response

#### 13. GET /api/admin/analytics/users
**Purpose:** User analytics and statistics
- **Query Parameters:**
  - `startDate`, `endDate` - Date range
  - `groupBy` - day/week/month
- **Response:**
  - Total users
  - New registrations (by period)
  - Active users
  - Users by role
  - Users by verification status
  - Geographic distribution
  - Average session duration
- **Use Case:** Platform analytics, growth metrics

## Authentication & Authorization

### Admin Authentication
All admin endpoints require:
1. **JWT Token** with admin role
2. **Admin-level permissions** verified via middleware
3. **Activity logging** for all admin actions

### Middleware Requirements
```typescript
// Required middleware stack for admin routes
router.use('/api/admin', [
  authenticateJWT,           // Verify JWT token
  requireAdminRole,          // Check admin role
  logAdminActivity,          // Log admin actions
  rateLimitAdmin            // Rate limiting for admin
]);
```

### Permission Levels
- **Super Admin:** All permissions
- **Admin:** User management, order management
- **Support:** Read-only user data, limited updates
- **Moderator:** Content moderation, user suspension

## Security Considerations

### Audit Trail
Every admin action must be logged:
- Admin user ID
- Target user ID
- Action performed
- Timestamp
- IP address
- Changes made (before/after)
- Reason/note

### Rate Limiting
- Admin endpoints: 100 requests/minute per admin
- Sensitive operations (delete, suspend): 10 requests/minute
- Bulk operations: 5 requests/minute

### Data Privacy
- Mask sensitive data in responses:
  - Partial email: `j***@example.com`
  - Partial phone: `+62***1234`
  - Hide passwords (never return)
- Full data only for specific detail views

## Database Schema Requirements

### Admin Activity Log Table
```sql
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_entity VARCHAR(50),  -- 'user', 'order', 'payment', etc.
  target_entity_id UUID,
  changes JSONB,              -- Before/after values
  reason TEXT,
  admin_note TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_target ON admin_activity_log(target_user_id);
CREATE INDEX idx_admin_activity_created ON admin_activity_log(created_at DESC);
```

### User Table Additions
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_admin_update_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_admin_update_at TIMESTAMPTZ;
```

## Integration Points

### With Other Services
Admin actions may trigger:
- **Notification Service:** Send emails for suspensions, role changes
- **Wallet Service:** Freeze wallet on suspension
- **Order Service:** Cancel pending orders on account deletion
- **Payment Service:** Process refunds for cancelled orders

### Event Publishing
Publish events for admin actions:
- `user.suspended` - User account suspended
- `user.role.changed` - User role updated
- `user.deleted` - User account deleted
- `user.verified` - Email manually verified

## Response Examples

### GET /api/admin/users
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+6281234567890",
      "role": "customer",
      "email_verified": true,
      "account_status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "last_login_at": "2024-01-15T10:30:00Z",
      "total_orders": 5,
      "total_spent": 1500000,
      "wallet_balance": 50000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  }
}
```

### POST /api/admin/users/:id/suspend
```json
{
  "success": true,
  "message": "User suspended successfully",
  "data": {
    "id": "uuid",
    "account_status": "suspended",
    "suspended_at": "2024-01-20T15:00:00Z",
    "suspension_reason": "Multiple policy violations",
    "suspension_expires_at": "2024-02-20T15:00:00Z"
  }
}
```

## Testing Requirements

### Test Cases
1. **User Search:** Test various filter combinations
2. **Suspension:** Verify suspended users cannot login
3. **Role Change:** Verify permission changes take effect
4. **Audit Log:** Verify all actions are logged
5. **Soft Delete:** Verify data retention after deletion
6. **Rate Limiting:** Verify rate limits are enforced
7. **Authorization:** Verify non-admins cannot access

### Test Data
- Create test users with different roles
- Create suspended users
- Create deleted users
- Create users with various activity patterns

## Implementation Priority

### Phase 1 (Critical)
1. List users with filtering
2. Get user details
3. Suspend/unsuspend user
4. Change user role

### Phase 2 (Important)
5. Update user information
6. User activity log
7. User analytics
8. Force password reset

### Phase 3 (Nice to have)
9. Manual email verification
10. Delete user
11. Permission management
12. Role configuration
13. Advanced filtering and search

## Notes for Implementation

- Use transaction for user deletion to cascade properly
- Implement soft delete by default, hard delete only with explicit flag
- Cache user roles/permissions for performance
- Use background jobs for bulk operations
- Send notifications asynchronously
- Implement comprehensive error handling
- Add retry logic for external service calls
- Use prepared statements to prevent SQL injection
- Validate all input with express-validator
- Return masked data by default, full data only when needed
