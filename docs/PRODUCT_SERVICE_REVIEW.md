# Product Service - Comprehensive Review & Documentation

**Service:** Product Service
**Port:** 3004
**Status:** ⚠️ Has Critical Bugs - DO NOT DEPLOY
**Last Reviewed:** 2025-11-09

---

## Executive Summary

The Product Service handles product catalog management, variants, categories, and images. The service has **3 critical bugs** that will cause runtime errors, missing CORS protection, and inconsistent validation. While the admin endpoints are well-implemented, several schema mismatches and error handling issues need immediate attention.

**Critical Issues:**
- ❌ Category schema field mismatch (`description` and `parent_category_id` don't exist)
- ❌ CORS imported but not applied
- ❌ No unique constraint error handling
- ❌ Incomplete input validation on user endpoints

---

## Endpoints Overview

### Total Endpoints: 28
- **User Product Endpoints:** 10
- **User Category Endpoints:** 5
- **Admin Product Endpoints:** 12
- **Admin Category Endpoints:** 3 (includes 1 NOT IMPLEMENTED)

---

## Detailed Endpoint Documentation

### User Product Endpoints

#### 1. POST /api/products
**Purpose:** Create new product
**Validation:** ❌ NONE - No express-validator
**Issues:**
- Missing required field validation
- No UUID validation for IDs
- No price/quantity range validation

#### 2. GET /api/products
**Purpose:** List products with filters
**Query Parameters:**
- `factoryId` - Filter by factory
- `categoryId` - Filter by category
- `status` - Filter by status
- `search` - Search in name/description
- `page`, `limit` - Pagination

#### 3. GET /api/products/:slug
**Purpose:** Get product by slug
**Returns:** Full product with variants, images, category, factory

#### 4. GET /api/products/id/:id
**Purpose:** Get product by ID
**Returns:** Full product details

#### 5. PATCH /api/products/:id
**Purpose:** Update product
**Validation:** ❌ NONE

#### 6. PATCH /api/products/:id/publish
**Purpose:** Change product status from draft to active

#### 7. DELETE /api/products/:id
**Purpose:** Soft delete product

#### 8. POST /api/products/:id/images
**Purpose:** Add images to product
**Body:** `{ imageUrls: string[] }`

#### 9. POST /api/products/:id/variants
**Purpose:** Create product variant
**Validation:** ❌ NONE

#### 10. GET /api/products/variants/:variantId
**Purpose:** Get variant details

### User Category Endpoints

#### 1. GET /api/categories
**Purpose:** List categories
**Filters:** `parentId`, `isActive`

#### 2. GET /api/categories/:id
**Purpose:** Get category with subcategories

#### 3. POST /api/categories
**Purpose:** Create category
**Validation:** ✅ Yes - validates name, slug, parentId

#### 4. PATCH /api/categories/:id
**Purpose:** Update category

#### 5. DELETE /api/categories/:id
**Purpose:** Soft delete category

### Admin Product Endpoints

#### 1. POST /api/admin/products
**Purpose:** Admin create product
**Validation:** ✅ Comprehensive
**Fields:** name, sku, description, categoryId, factoryId, basePrice, moq, etc.

#### 2. PUT /api/admin/products/:id
**Purpose:** Admin update product
**Validation:** ✅ Partial

#### 3. DELETE /api/admin/products/:id
**Purpose:** Admin delete product

#### 4-6. Variant Management
- POST /api/admin/products/:id/variants
- PUT /api/admin/products/:id/variants/:variantId
- DELETE /api/admin/products/:id/variants/:variantId

#### 7-9. Image Management
- POST /api/admin/products/:id/images
- PUT /api/admin/products/:id/images/reorder
- DELETE /api/admin/products/:id/images/:imageId

#### 10. POST /api/admin/products/bulk/import
**Status:** ❌ NOT IMPLEMENTED - Returns 501

#### 11. POST /api/admin/products/bulk/update
**Purpose:** Bulk update products
**Body:** `{ productIds: [], updateData: {} }`

#### 12. POST /api/admin/products/bulk/delete
**Purpose:** Bulk delete products
**Body:** `{ productIds: [] }`

### Admin Category Endpoints

#### 1. POST /api/admin/categories
**Purpose:** Admin create category
**🐛 BUG:** Uses `description` field that doesn't exist in schema

#### 2. PUT /api/admin/categories/:id
**Purpose:** Admin update category
**🐛 BUG:** Uses `parent_category_id` instead of `parent_id`

#### 3. DELETE /api/admin/categories/:id
**Purpose:** Admin delete category

---

## Critical Bugs (Must Fix)

### 🔴 BUG #1: Category Schema Field Mismatch - CRITICAL
**File:** `src/controllers/admin.controller.ts`
**Lines:** 295-302, 331

```typescript
// ❌ WRONG - These fields don't exist in schema
const category = await prisma.categories.create({
  data: {
    name,
    description,  // ❌ Field doesn't exist
    parent_category_id: parentCategoryId,  // ❌ Should be parent_id
    image_url: imageUrl
  }
});
```

**Schema Reality:**
```prisma
model categories {
  id           String
  parent_id    String?  // ✅ Correct field name
  name         String
  slug         String
  icon_url     String?
  // NO description field!
  // NO image_url field!
}
```

**Fix:**
```typescript
const category = await prisma.categories.create({
  data: {
    name,
    slug: slugify(name),
    parent_id: parentCategoryId || null,
    icon_url: imageUrl || null,
    display_order: displayOrder || 0,
    is_active: true
  }
});
```

**Impact:** Runtime error when creating categories via admin endpoint

---

### 🔴 BUG #2: CORS Not Applied
**File:** `src/index.ts`
**Line:** 2

```typescript
import cors from 'cors';  // ❌ Imported but never used
```

**Fix:**
```typescript
app.use(cors());  // Add after line 15
```

**Impact:**
- API accessible from any origin
- CSRF vulnerability
- Cannot control cross-origin requests

---

### 🔴 BUG #3: No Unique Constraint Error Handling
**File:** `src/repositories/product.repository.ts`
**Lines:** 6-39

```typescript
async create(data: CreateProductDTO) {
  return prisma.products.create({
    data: {
      sku: data.sku,  // Unique field
      slug: data.slug  // Unique field
      // ...
    }
  });
}
```

**Problem:** If SKU or slug already exists, Prisma throws P2002 error but it's not caught

**Fix:**
```typescript
try {
  return await prisma.products.create({ data });
} catch (error: any) {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0];
    throw new Error(`${field} already exists`);
  }
  throw error;
}
```

---

## High Priority Issues

### ⚠️ Issue #1: Status Validation Mismatch
**File:** `src/routes/admin.routes.ts`
**Line:** 125

```typescript
body('status').optional().isIn(['draft', 'active', 'archived'])  // ❌ 'archived' not in schema
```

**Schema Enum:**
```prisma
enum product_status {
  draft
  active
  inactive
  out_of_stock
}
```

**Fix:** Remove 'archived', add 'inactive' and 'out_of_stock'

---

### ⚠️ Issue #2: Missing Validation on User Endpoints
**File:** `src/controllers/product.controller.ts`
**Lines:** 12-19 (createProduct method)

**Missing Validations:**
- Required fields: name, sku, basePrice, moq, categoryId, factoryId
- UUID validation for IDs
- Numeric validation for prices
- SKU format validation
- URL validation for images

**Recommendation:** Add express-validator to user routes same as admin routes

---

### ⚠️ Issue #3: Repository Pattern Violation
**File:** `src/controllers/admin.controller.ts`

**Direct Prisma Calls (Should go through repository):**
- Line 169: `prisma.product_images.update()`
- Line 192: `prisma.product_images.delete()`
- Line 295: `prisma.categories.create()`
- Line 326: `prisma.categories.update()`
- Line 353: `prisma.categories.delete()`

**Impact:** Inconsistent data access pattern, harder to test

---

## Medium Priority Issues

### ⚠️ Issue #4: Pagination Not Validated
**File:** `src/repositories/product.repository.ts`
**Lines:** 43-44

```typescript
const page = filters.page || 1;
const limit = filters.limit || 20;
const skip = (page - 1) * limit;
```

**Problem:** User could request:
- `page=0` → negative skip
- `limit=999999` → huge query
- `page=-5` → undefined behavior

**Fix:**
```typescript
const page = Math.max(1, filters.page || 1);
const limit = Math.min(100, Math.max(1, filters.limit || 20));
```

---

### ⚠️ Issue #5: Inconsistent Response Format
**User endpoints:**
```typescript
res.status(201).json(product);  // Direct data
```

**Admin endpoints:**
```typescript
res.status(201).json({
  message: 'Product created',
  data: product
});  // Wrapped response
```

**Recommendation:** Standardize to wrapped format everywhere

---

### ⚠️ Issue #6: Missing Circular Reference Check
**File:** `src/routes/category.routes.ts`
**Line:** 166

When creating/updating categories with `parentId`, no check prevents:
- Category A → parent: Category B
- Category B → parent: Category A
- Result: Infinite loop when traversing hierarchy

**Fix:** Add recursive parent chain validation

---

## Security Issues

### 🔒 Security #1: No Authentication
**All endpoints** are accessible without authentication:
- Anyone can create/update/delete products
- No user tracking
- No audit trail

**Fix:** Add JWT middleware to all routes

---

### 🔒 Security #2: Generic Error Messages
**All error handlers** expose internal errors:

```typescript
res.status(500).json({
  error: err.message  // ❌ Exposes stack trace, file paths
});
```

**Fix:**
```typescript
res.status(500).json({
  error: process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message
});
```

---

### 🔒 Security #3: No Input Sanitization
User input stored directly without sanitization:
- Product names
- Descriptions
- Category names

**Risk:** Stored XSS if frontend doesn't escape

---

## Code Quality Issues

### Issue #1: Unnecessary Service Layer
**File:** `src/services/product.service.ts`

The service class just delegates to repository with no business logic:

```typescript
async createProduct(data: CreateProductDTO) {
  return this.repository.create(data);
}
```

**Recommendation:** Remove service layer or add actual business logic

---

### Issue #2: Multiple Instance Creation
Controllers instantiate their own services:
- product.controller.ts creates ProductService
- admin.controller.ts creates ProductService
- Routes also instantiate

**Problem:** No singleton pattern, wasted memory

**Fix:** Use dependency injection or singleton

---

### Issue #3: Type Safety with `any`
**Multiple locations** use `any` type:
- All `catch (error: any)` blocks
- `where: any = {}` in repository queries

**Fix:** Create proper types:
```typescript
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

---

## Database Schema Reference

### products Table
```prisma
model products {
  id                  String @id
  factory_id          String
  category_id         String
  name                String
  sku                 String @unique
  slug                String @unique
  description         String?
  base_price          Decimal
  moq                 Int
  weight_grams        Int?
  length_cm           Decimal?
  width_cm            Decimal?
  height_cm           Decimal?
  status              product_status @default(draft)
  primary_image_url   String?
  is_featured         Boolean @default(false)
  created_at          DateTime @default(now())
  updated_at          DateTime @default(now())
}
```

### categories Table
```prisma
model categories {
  id            String @id
  parent_id     String?  // ⚠️ NOT parent_category_id
  name          String
  slug          String @unique
  icon_url      String?
  display_order Int? @default(0)
  is_active     Boolean @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @default(now())
  // ⚠️ NO description field
  // ⚠️ NO image_url field
}
```

### product_variants Table
```prisma
model product_variants {
  id             String @id
  product_id     String
  variant_name   String
  sku            String @unique
  variant_price  Decimal?
  stock_quantity Int? @default(0)
  created_at     DateTime @default(now())
  updated_at     DateTime @default(now())
}
```

---

## Testing Status

**Unit Tests:** ❌ None
**Integration Tests:** ❌ None
**E2E Tests:** ❌ None

**Recommendation:** Add at least:
- Unit tests for repository layer
- Integration tests for critical endpoints
- Validation tests for all inputs

---

## Performance Considerations

### Issue #1: N+1 Queries
When listing products with variants:
```typescript
// Could optimize to single query with include
const products = await prisma.products.findMany({
  include: {
    product_variants: true,
    product_images: true
  }
});
```

### Issue #2: Missing Indexes
Check if these indexes exist:
- `products.status` (frequently filtered)
- `products.factory_id` (frequently filtered)
- `products.category_id` (frequently filtered)

---

## Recommendations

### Priority 1 (Fix Immediately):
1. ✅ Fix category schema field mismatch (Bug #1)
2. ✅ Apply CORS middleware (Bug #2)
3. ✅ Add P2002 error handling (Bug #3)
4. ✅ Fix status validation enum
5. ✅ Add authentication to all endpoints

### Priority 2 (Fix Soon):
1. ✅ Add validation to user endpoints
2. ✅ Move Prisma calls to repository
3. ✅ Add pagination limits
4. ✅ Standardize response format
5. ✅ Add circular reference check for categories

### Priority 3 (Improve):
1. ✅ Add comprehensive tests
2. ✅ Remove unnecessary service layer or add logic
3. ✅ Replace `any` types
4. ✅ Add input sanitization
5. ✅ Improve error messages
6. ✅ Add structured logging
7. ✅ Optimize database queries

---

## Files Modified in Review

| File | Lines | Status | Issues Found |
|------|-------|--------|--------------|
| src/index.ts | 47 | ⚠️ | CORS not applied |
| src/controllers/admin.controller.ts | 358 | ❌ | Critical schema bugs |
| src/controllers/product.controller.ts | 107 | ⚠️ | Missing validation |
| src/repositories/product.repository.ts | 215 | ⚠️ | Missing error handling |
| src/routes/admin.routes.ts | 357 | ⚠️ | Invalid enum value |
| src/routes/category.routes.ts | 218 | ⚠️ | Missing circular check |
| src/routes/product.routes.ts | 127 | ⚠️ | Missing validation |
| src/services/product.service.ts | 70 | ⚠️ | Unnecessary abstraction |

**Total Lines Reviewed:** 2,221

---

## Conclusion

**Overall Status:** ⚠️ NEEDS FIXES BEFORE DEPLOYMENT

The Product Service has solid structure but **3 critical bugs** that will cause runtime errors. The admin endpoints are well-designed but suffer from schema mismatches. User endpoints lack proper validation.

**Estimated Fix Time:** 4-6 hours for Priority 1 items

**Deploy Readiness:** ❌ NOT READY - Fix critical bugs first
