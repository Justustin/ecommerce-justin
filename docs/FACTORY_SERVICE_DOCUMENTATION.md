# Factory Service - API Documentation

**Service:** Factory Service
**Port:** 3003
**Base URL:** http://localhost:3003
**Swagger URL:** http://localhost:3003/api-docs

---

## Overview

The Factory Service manages group buying factory partners - B2B suppliers that fulfill orders for the platform. Factories are registered and managed by platform administrators, with factory owners having read-only access to view their dashboard and metrics.

### Key Features
- Factory partner registration and management
- Verification and approval workflow
- Status management (pending, active, suspended, inactive)
- Factory performance metrics and analytics
- Session management for group buying
- Factory owner dashboard access

---

## API Endpoints

### Total Endpoints: 19
- **Public Factory Endpoints:** 9
- **Admin Factory Endpoints:** 10

---

## Public Factory Endpoints

### 1. List Factories
```
GET /api/factories
```

**Purpose:** Get all factories with filtering and pagination

**Query Parameters:**
- `status` (string, optional) - Filter by status: pending, active, suspended, inactive
- `verificationStatus` (string, optional) - Filter by verification: unverified, pending, verified, rejected
- `city` (string, optional) - Filter by city
- `province` (string, optional) - Filter by province
- `district` (string, optional) - Filter by district
- `officeId` (string, optional) - Filter by assigned office
- `search` (string, optional) - Search in factory name or code
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "factory_code": "FACT-JKT-001",
      "factory_name": "PT Batik Jakarta",
      "province": "DKI Jakarta",
      "city": "Jakarta Selatan",
      "status": "active",
      "verification_status": "verified",
      "users_factories_owner_idTousers": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### 2. Get Factory by Code
```
GET /api/factories/code/{code}
```

**Purpose:** Retrieve factory details by factory code

**Parameters:**
- `code` (string, required) - Factory code (e.g., "FACT-JKT-001")

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "factory_code": "FACT-JKT-001",
  "factory_name": "PT Batik Jakarta",
  "owner_id": "uuid",
  "phone_number": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postal_code": "12345",
  "address_line": "Jl. Sudirman No. 123",
  "status": "active",
  "verification_status": "verified",
  "verified_at": "2025-11-09T10:00:00Z",
  "users_factories_owner_idTousers": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }
}
```

---

### 3. Get Factories by Owner
```
GET /api/factories/owner/{ownerId}
```

**Purpose:** Get all factories owned by a specific user

**Parameters:**
- `ownerId` (string, required) - UUID of the owner

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "factory_code": "FACT-JKT-001",
      "factory_name": "PT Batik Jakarta",
      "status": "active",
      "verification_status": "verified"
    }
  ]
}
```

---

### 4. Get Factory by ID
```
GET /api/factories/{id}
```

**Purpose:** Retrieve factory details by UUID

**Parameters:**
- `id` (string, required) - Factory UUID

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "factory_code": "FACT-JKT-001",
  "factory_name": "PT Batik Jakarta",
  "owner_id": "uuid",
  "phone_number": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postal_code": "12345",
  "address_line": "Jl. Sudirman No. 123",
  "description": "Premium batik manufacturer",
  "business_license_number": "BLN-123456",
  "tax_id": "01.234.567.8-901.000",
  "logo_url": "https://example.com/logo.png",
  "status": "active",
  "verification_status": "verified",
  "verified_at": "2025-11-09T10:00:00Z",
  "verified_by": "admin-uuid",
  "created_at": "2025-11-01T00:00:00Z",
  "updated_at": "2025-11-09T10:00:00Z",
  "users_factories_owner_idTousers": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+6281234567890",
    "role": "factory_owner"
  }
}
```

---

### 5. Create Factory
```
POST /api/factories
```

**Purpose:** Register a new factory (currently public, should be admin-only in future)

**Request Body:**
```json
{
  "ownerId": "uuid",
  "factoryCode": "FACT-JKT-001",
  "factoryName": "PT Batik Jakarta",
  "phoneNumber": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postalCode": "12345",
  "addressLine": "Jl. Sudirman No. 123",
  "description": "Premium batik manufacturer",
  "businessLicenseNumber": "BLN-123456",
  "taxId": "01.234.567.8-901.000",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response:** `201 Created`
```json
{
  "message": "Factory created successfully",
  "data": {
    "id": "uuid",
    "factory_code": "FACT-JKT-001",
    "factory_name": "PT Batik Jakarta",
    "status": "pending",
    "verification_status": "pending",
    ...
  }
}
```

---

### 6. Update Factory
```
PATCH /api/factories/{id}
```

**Purpose:** Update factory details

**Request Body:** (all fields optional)
```json
{
  "factoryName": "PT Batik Jakarta Premium",
  "phoneNumber": "+6281234567899",
  "email": "updated@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postalCode": "12345",
  "addressLine": "Jl. Sudirman No. 456",
  "description": "Premium batik manufacturer - Updated",
  "logoUrl": "https://example.com/new-logo.png"
}
```

**Response:** `200 OK`

---

### 7. Verify Factory
```
PATCH /api/factories/{id}/verify
```

**Purpose:** Verify factory (approval workflow)

**Request Body:**
```json
{
  "verifiedBy": "admin-user-uuid"
}
```

**Response:** `200 OK`

---

### 8. Update Factory Status
```
PATCH /api/factories/{id}/status
```

**Purpose:** Update factory operational status

**Request Body:**
```json
{
  "status": "active"
}
```

**Valid status values:** pending, active, suspended, inactive

**Response:** `200 OK`

---

### 9. Delete Factory
```
DELETE /api/factories/{id}
```

**Purpose:** Delete factory (hard delete)

**Response:** `200 OK`
```json
{
  "message": "Factory deleted successfully"
}
```

---

## Admin Factory Endpoints

### 1. Admin Register Factory
```
POST /api/admin/factories
```

**Purpose:** Admin registers a new factory partner

**Request Body:**
```json
{
  "ownerId": "uuid",
  "factoryCode": "FACT-JKT-001",
  "factoryName": "PT Batik Jakarta",
  "phoneNumber": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postalCode": "12345",
  "addressLine": "Jl. Sudirman No. 123",
  "description": "Premium batik manufacturer",
  "businessLicenseNumber": "BLN-123456",
  "taxId": "01.234.567.8-901.000",
  "logoUrl": "https://example.com/logo.png"
}
```

**Validation:**
- `ownerId` - Required, UUID
- `factoryCode` - Required, unique
- `factoryName` - Required
- `phoneNumber` - Required
- `province` - Required
- `city` - Required
- `district` - Required
- `addressLine` - Required
- All other fields optional

**Response:** `201 Created`
```json
{
  "message": "Factory registered successfully",
  "data": {
    "id": "uuid",
    "owner_id": "uuid",
    "factory_code": "FACT-JKT-001",
    "factory_name": "PT Batik Jakarta",
    "status": "pending",
    "verification_status": "pending",
    "created_at": "timestamp"
  }
}
```

**Errors:**
- `409 Conflict` - Factory code already exists

---

### 2. Admin Update Factory
```
PUT /api/admin/factories/{id}
```

**Purpose:** Admin updates factory information

**Request Body:** (all optional)
```json
{
  "factoryName": "PT Batik Jakarta Premium",
  "description": "Premium batik manufacturer - Updated",
  "addressLine": "Jl. Sudirman No. 456",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "province": "DKI Jakarta",
  "postalCode": "12345",
  "phoneNumber": "+6281234567899",
  "email": "updated@batikjakarta.com",
  "businessLicenseNumber": "BLN-123456-UPDATED",
  "taxId": "01.234.567.8-901.001",
  "logoUrl": "https://example.com/new-logo.png"
}
```

**Response:** `200 OK`
```json
{
  "message": "Factory updated successfully",
  "data": {
    "id": "uuid",
    "factory_name": "PT Batik Jakarta Premium",
    "updated_at": "timestamp"
  }
}
```

---

### 3. Admin Verify Factory
```
POST /api/admin/factories/{id}/verify
```

**Purpose:** Admin approves factory for platform use

**Request Body:**
```json
{
  "verifiedBy": "admin-user-uuid"
}
```

**Response:** `200 OK`
```json
{
  "message": "Factory verified successfully",
  "data": {
    "id": "uuid",
    "verification_status": "verified",
    "verified_at": "timestamp",
    "verified_by": "admin-user-uuid"
  }
}
```

---

### 4. Admin Suspend Factory
```
POST /api/admin/factories/{id}/suspend
```

**Purpose:** Suspend factory operations

**Request Body:**
```json
{
  "reason": "Quality issues reported",
  "suspensionDuration": "30 days"
}
```

**Response:** `200 OK`
```json
{
  "message": "Factory suspended successfully",
  "data": {
    "id": "uuid",
    "status": "suspended",
    "updated_at": "timestamp"
  },
  "suspension": {
    "reason": "Quality issues reported",
    "duration": "30 days"
  }
}
```

---

### 5. Admin Reactivate Factory
```
POST /api/admin/factories/{id}/reactivate
```

**Purpose:** Reactivate suspended factory

**Request Body:** None required

**Response:** `200 OK`
```json
{
  "message": "Factory reactivated successfully",
  "data": {
    "id": "uuid",
    "status": "active",
    "updated_at": "timestamp"
  }
}
```

---

### 6. Admin Delete Factory
```
DELETE /api/admin/factories/{id}
```

**Purpose:** Delete factory from system

**Response:** `200 OK`
```json
{
  "message": "Factory deleted successfully"
}
```

---

### 7. Get Factory Metrics
```
GET /api/admin/factories/{id}/metrics
```

**Purpose:** Retrieve factory performance metrics

**Query Parameters:**
- `startDate` (string, optional) - ISO 8601 date
- `endDate` (string, optional) - ISO 8601 date

**Response:** `200 OK`
```json
{
  "factoryId": "uuid",
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  },
  "metrics": {
    "totalOrders": 150,
    "totalRevenue": 500000000,
    "averageOrderValue": 3333333,
    "fulfillmentRate": 98.5,
    "averageProcessingTime": 24
  }
}
```

---

### 8. List Factory Sessions
```
GET /api/admin/factories/{id}/sessions
```

**Purpose:** Get all group buying sessions for a factory

**Query Parameters:**
- `page` (integer, optional) - Page number
- `limit` (integer, optional) - Items per page
- `status` (string, optional) - Filter by session status

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "status": "active",
      "participants_count": 45,
      "target_quantity": 50,
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 9. Force Cancel Session
```
POST /api/admin/factories/{id}/sessions/{sessionId}/cancel
```

**Purpose:** Admin force cancels a group buying session

**Request Body:**
```json
{
  "reason": "Product discontinued",
  "refundParticipants": true
}
```

**Response:** `200 OK`
```json
{
  "message": "Session cancelled successfully",
  "data": {
    "sessionId": "uuid",
    "status": "cancelled",
    "refundsInitiated": true
  }
}
```

---

### 10. Get Factory Analytics
```
GET /api/admin/factories/{id}/analytics
```

**Purpose:** Get detailed factory analytics

**Query Parameters:**
- `period` (string, optional) - monthly or yearly
- `year` (integer, optional) - Year for analytics

**Response:** `200 OK`
```json
{
  "factoryId": "uuid",
  "period": "monthly",
  "year": 2025,
  "analytics": {
    "monthlyRevenue": [
      { "month": 1, "revenue": 50000000 },
      { "month": 2, "revenue": 65000000 }
    ],
    "topProducts": [
      {
        "product_id": "uuid",
        "product_name": "Batik Shirt",
        "totalSold": 500,
        "revenue": 25000000
      }
    ],
    "customerSatisfaction": 4.8
  }
}
```

---

## Database Schema

### factories Table
```prisma
model factories {
  id                           String              @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  owner_id                     String              @db.Uuid
  office_id                    String?             @db.Uuid
  factory_code                 String              @unique @db.VarChar(50)
  factory_name                 String              @db.VarChar(255)
  status                       factory_status      @default(pending)
  verification_status          verification_status @default(pending)
  business_license_number      String?             @db.VarChar(100)
  business_license_photo_url   String?
  tax_id                       String?             @db.VarChar(50)
  phone_number                 String              @db.VarChar(20)
  email                        String?             @db.VarChar(255)
  province                     String              @db.VarChar(100)
  city                         String              @db.VarChar(100)
  district                     String              @db.VarChar(100)
  postal_code                  String?             @db.VarChar(10)
  address_line                 String
  logo_url                     String?
  description                  String?
  assigned_at                  DateTime?           @db.Timestamptz(6)
  verified_at                  DateTime?           @db.Timestamptz(6)
  verified_by                  String?             @db.Uuid
  created_at                   DateTime            @default(now()) @db.Timestamptz(6)
  updated_at                   DateTime            @default(now()) @db.Timestamptz(6)
  bank_name                    String?             @db.VarChar(100)
  bank_account_number          String?             @db.VarChar(50)
  bank_account_name            String?             @db.VarChar(255)
  wholesale_unit               Int?

  // Relations
  users_factories_owner_idTousers     users  @relation("factories_owner_idTousers", fields: [owner_id], references: [id])
  users_factories_verified_byTousers  users? @relation("factories_verified_byTousers", fields: [verified_by], references: [id])
  products                            products[]
  grosir_bundles                      grosir_bundles[]

  @@index([owner_id], map: "idx_factories_owner")
  @@index([factory_code], map: "idx_factories_code")
  @@index([status], map: "idx_factories_status")
  @@index([verification_status], map: "idx_factories_verification")
}

enum factory_status {
  pending
  active
  suspended
  inactive
}

enum verification_status {
  unverified
  pending
  verified
  rejected
}
```

---

## Business Logic

### Factory Registration Flow
1. Admin registers factory with owner's user ID
2. Factory starts with status: `pending`, verification_status: `pending`
3. Admin reviews business documents (license, tax ID)
4. Admin verifies factory → verification_status: `verified`
5. Factory can now have products listed
6. Admin can activate → status: `active`

### Status Transitions
- **pending** → active (after verification)
- **active** → suspended (quality issues, violations)
- **suspended** → active (issues resolved)
- **active** → inactive (factory closes operations)

### Verification vs Status
- **verification_status**: One-time approval process (unverified → pending → verified/rejected)
- **status**: Operational state (pending → active → suspended/inactive)

---

## Authentication

**Current State:** No authentication implemented
**Planned:** JWT-based authentication with role-based access control

**Future Access Control:**
- Public endpoints: GET /api/factories (list, view)
- Factory Owner: GET their own factory details and metrics
- Admin: All endpoints (create, update, verify, suspend, delete)

---

## Error Responses

### 400 Bad Request
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "factoryCode",
      "location": "body"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Factory not found"
}
```

### 409 Conflict
```json
{
  "error": "factory_code already exists",
  "field": "factory_code"
}
```

---

## Environment Variables

```env
PORT=3003
DATABASE_URL=postgresql://...
NODE_ENV=development
```

---

**Last Updated:** 2025-11-09
**API Version:** 1.0.0
