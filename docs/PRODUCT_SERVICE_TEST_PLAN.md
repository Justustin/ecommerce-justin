# Product Service - Swagger Test Plan

**Service:** Product Service
**Port:** 3002
**Swagger URL:** http://localhost:3002/api-docs
**Date:** 2025-11-09

---

## Prerequisites

1. Start the Product Service:
   ```bash
   cd services/product-service
   npm install
   npm run dev
   ```

2. Open Swagger UI: http://localhost:3002/api-docs

3. Verify service is running:
   - Check: http://localhost:3002/health
   - Expected: `{"status":"ok","service":"product-service"}`

---

## Test Sequence

### Test 1: Create Root Category

**Endpoint:** `POST /api/admin/categories`

**Request Body:**
```json
{
  "name": "Electronics",
  "iconUrl": "https://example.com/icons/electronics.png"
}
```

**Expected Response (201):**
```json
{
  "message": "Category created successfully",
  "data": {
    "id": "<uuid>",
    "parent_id": null,
    "name": "Electronics",
    "slug": "electronics",
    "icon_url": "https://example.com/icons/electronics.png",
    "display_order": 0,
    "is_active": true,
    "created_at": "<timestamp>",
    "updated_at": "<timestamp>"
  }
}
```

**✅ Success Criteria:**
- Status code is 201
- Category has auto-generated slug "electronics"
- parent_id is null
- Returns valid UUID in id field

**❌ Copy the category ID for next tests!**

---

### Test 2: Create Sub-Category

**Endpoint:** `POST /api/admin/categories`

**Request Body:**
```json
{
  "name": "Mobile Phones",
  "parentCategoryId": "<paste-electronics-category-id-here>",
  "iconUrl": "https://example.com/icons/phones.png"
}
```

**Expected Response (201):**
```json
{
  "message": "Category created successfully",
  "data": {
    "id": "<uuid>",
    "parent_id": "<electronics-category-id>",
    "name": "Mobile Phones",
    "slug": "mobile-phones",
    "icon_url": "https://example.com/icons/phones.png",
    "display_order": 0,
    "is_active": true,
    "created_at": "<timestamp>",
    "updated_at": "<timestamp>"
  }
}
```

**✅ Success Criteria:**
- Status code is 201
- parent_id matches the Electronics category ID
- Slug is generated correctly with hyphens

**❌ Copy the mobile phones category ID for next tests!**

---

### Test 3: Duplicate Category (Should Fail)

**Endpoint:** `POST /api/admin/categories`

**Request Body:**
```json
{
  "name": "Electronics"
}
```

**Expected Response (409 Conflict):**
```json
{
  "error": "Category with this name already exists",
  "field": "slug"
}
```

**✅ Success Criteria:**
- Status code is 409 (Conflict)
- Error message indicates duplicate
- P2002 error handling works correctly

---

### Test 4: Update Category

**Endpoint:** `PUT /api/admin/categories/{id}`

**Path Parameter:** Use the Electronics category ID

**Request Body:**
```json
{
  "name": "Consumer Electronics",
  "iconUrl": "https://example.com/icons/consumer-electronics.png"
}
```

**Expected Response (200):**
```json
{
  "message": "Category updated successfully",
  "data": {
    "id": "<same-uuid>",
    "name": "Consumer Electronics",
    "slug": "consumer-electronics",
    "icon_url": "https://example.com/icons/consumer-electronics.png",
    "updated_at": "<new-timestamp>"
  }
}
```

**✅ Success Criteria:**
- Status code is 200
- Name and slug are updated
- Timestamp is newer

---

### Test 5: Get All Categories

**Endpoint:** `GET /api/categories`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "<uuid>",
      "name": "Consumer Electronics",
      "slug": "consumer-electronics",
      ...
    },
    {
      "id": "<uuid>",
      "name": "Mobile Phones",
      "slug": "mobile-phones",
      "parent_id": "<electronics-id>",
      ...
    }
  ]
}
```

**✅ Success Criteria:**
- Returns both categories
- Sub-category has correct parent_id

---

### Test 6: Get Root Categories Only

**Endpoint:** `GET /api/categories/root`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "<uuid>",
      "name": "Consumer Electronics",
      "slug": "consumer-electronics",
      "parent_id": null,
      ...
    }
  ]
}
```

**✅ Success Criteria:**
- Returns only root categories (parent_id is null)
- Mobile Phones is NOT included

---

### Test 7: Get Category by Slug

**Endpoint:** `GET /api/categories/slug/consumer-electronics`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "<uuid>",
    "name": "Consumer Electronics",
    "slug": "consumer-electronics",
    ...
  }
}
```

**✅ Success Criteria:**
- Returns correct category by slug

---

### Test 8: Create Product in Category

**Endpoint:** `POST /api/admin/products`

**Request Body:**
```json
{
  "categoryId": "<paste-mobile-phones-category-id>",
  "name": "iPhone 15 Pro",
  "description": "Latest Apple flagship smartphone",
  "basePrice": 15999000,
  "sku": "IPHONE-15-PRO",
  "moq": 5
}
```

**Expected Response (201):**
```json
{
  "message": "Product created successfully",
  "data": {
    "id": "<uuid>",
    "category_id": "<mobile-phones-id>",
    "name": "iPhone 15 Pro",
    "slug": "iphone-15-pro",
    "description": "Latest Apple flagship smartphone",
    "base_price": 15999000,
    "sku": "IPHONE-15-PRO",
    "moq": 5,
    "status": "draft",
    "is_active": true,
    "created_at": "<timestamp>",
    "updated_at": "<timestamp>"
  }
}
```

**✅ Success Criteria:**
- Product created successfully
- category_id is correct
- Slug auto-generated
- Status defaults to "draft"

**❌ Copy the product ID for next tests!**

---

### Test 9: Create Product Variant

**Endpoint:** `POST /api/admin/products/{productId}/variants`

**Path Parameter:** Use the iPhone product ID

**Request Body:**
```json
{
  "sku": "IPHONE-15-PRO-256GB-BLUE",
  "variantName": "256GB Blue Titanium",
  "priceAdjustment": 0,
  "attributes": {
    "storage": "256GB",
    "color": "Blue Titanium"
  }
}
```

**Expected Response (201):**
```json
{
  "message": "Variant created successfully",
  "data": {
    "id": "<uuid>",
    "product_id": "<iphone-id>",
    "sku": "IPHONE-15-PRO-256GB-BLUE",
    "variant_name": "256GB Blue Titanium",
    "price_adjustment": 0,
    "attributes": {
      "storage": "256GB",
      "color": "Blue Titanium"
    },
    "is_active": true,
    "created_at": "<timestamp>"
  }
}
```

**✅ Success Criteria:**
- Variant created successfully
- Attributes stored as JSON

---

### Test 10: Get Product with Variants

**Endpoint:** `GET /api/products/{id}`

**Path Parameter:** Use the iPhone product ID

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "<iphone-id>",
    "name": "iPhone 15 Pro",
    "slug": "iphone-15-pro",
    "base_price": 15999000,
    "moq": 5,
    "category": {
      "id": "<mobile-phones-id>",
      "name": "Mobile Phones",
      "slug": "mobile-phones"
    },
    "variants": [
      {
        "id": "<variant-id>",
        "sku": "IPHONE-15-PRO-256GB-BLUE",
        "variant_name": "256GB Blue Titanium",
        "price_adjustment": 0,
        "final_price": 15999000,
        "attributes": {
          "storage": "256GB",
          "color": "Blue Titanium"
        }
      }
    ]
  }
}
```

**✅ Success Criteria:**
- Product includes category details
- Variants array is populated
- final_price = base_price + price_adjustment

---

### Test 11: Update Product Status to Active

**Endpoint:** `PUT /api/admin/products/{id}/status`

**Path Parameter:** Use the iPhone product ID

**Request Body:**
```json
{
  "status": "active"
}
```

**Expected Response (200):**
```json
{
  "message": "Product status updated successfully",
  "data": {
    "id": "<iphone-id>",
    "status": "active",
    "updated_at": "<new-timestamp>"
  }
}
```

**✅ Success Criteria:**
- Status changed to "active"
- Updated timestamp is newer

---

### Test 12: List Active Products

**Endpoint:** `GET /api/products`

**Query Parameters:**
- `status=active`
- `page=1`
- `limit=10`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "<iphone-id>",
      "name": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "base_price": 15999000,
      "status": "active",
      "category": {
        "name": "Mobile Phones"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

**✅ Success Criteria:**
- Only active products returned
- Pagination info included

---

### Test 13: Delete Category (Should Fail - Has Products)

**Endpoint:** `DELETE /api/admin/categories/{id}`

**Path Parameter:** Mobile Phones category ID

**Expected Response (400):**
```json
{
  "error": "Cannot delete category with existing products"
}
```

**✅ Success Criteria:**
- Deletion prevented
- Appropriate error message

---

### Test 14: Delete Product First

**Endpoint:** `DELETE /api/admin/products/{id}`

**Path Parameter:** iPhone product ID

**Expected Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

**✅ Success Criteria:**
- Product deleted
- Variants automatically deleted (cascade)

---

### Test 15: Delete Category

**Endpoint:** `DELETE /api/admin/categories/{id}`

**Path Parameter:** Mobile Phones category ID

**Expected Response (200):**
```json
{
  "message": "Category deleted successfully"
}
```

**✅ Success Criteria:**
- Category deleted successfully

---

## Error Cases to Test

### Test E1: Invalid UUID Format

**Endpoint:** `GET /api/products/invalid-uuid`

**Expected:** 400 Bad Request with validation error

---

### Test E2: Non-existent Product

**Endpoint:** `GET /api/products/00000000-0000-0000-0000-000000000000`

**Expected:** 404 Not Found

---

### Test E3: Invalid Status Value

**Endpoint:** `PUT /api/admin/products/{id}/status`

**Request Body:**
```json
{
  "status": "invalid_status"
}
```

**Expected:** 400 Bad Request with validation error

---

### Test E4: Missing Required Fields

**Endpoint:** `POST /api/admin/products`

**Request Body:**
```json
{
  "name": "Test Product"
}
```

**Expected:** 400 Bad Request (missing categoryId, basePrice, sku, moq)

---

## Performance Tests

### Test P1: List Products with Pagination

**Test various page sizes:**
- `GET /api/products?limit=10`
- `GET /api/products?limit=50`
- `GET /api/products?limit=100`

**Verify:** Response time < 500ms

---

### Test P2: Search Products

**Endpoint:** `GET /api/products?search=iphone`

**Verify:** Returns products matching search term

---

## Test Results Template

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Create Root Category | ⏳ | |
| 2 | Create Sub-Category | ⏳ | |
| 3 | Duplicate Category | ⏳ | |
| 4 | Update Category | ⏳ | |
| 5 | Get All Categories | ⏳ | |
| 6 | Get Root Categories | ⏳ | |
| 7 | Get Category by Slug | ⏳ | |
| 8 | Create Product | ⏳ | |
| 9 | Create Variant | ⏳ | |
| 10 | Get Product with Variants | ⏳ | |
| 11 | Update Product Status | ⏳ | |
| 12 | List Active Products | ⏳ | |
| 13 | Delete Category (Fail) | ⏳ | |
| 14 | Delete Product | ⏳ | |
| 15 | Delete Category | ⏳ | |

**Legend:**
- ⏳ Not tested
- ✅ Passed
- ❌ Failed

---

## Issues to Report

If any test fails, please provide:
1. Test number and name
2. Request you sent (endpoint, method, body)
3. Response received (status code, body)
4. Expected vs actual difference
5. Any error messages in console/logs

Example:
```
Test #3 Failed

Request:
POST /api/admin/categories
{
  "name": "Electronics"
}

Response (500):
{
  "error": "P2002 Unique constraint failed on the fields: (`slug`)"
}

Expected: 409 status with friendly error message
Actual: 500 status with Prisma error

Console error: [paste error from terminal]
```

---

## Next Steps After Testing

Once all tests pass:
1. I'll add authentication middleware
2. I'll fix any issues you find
3. We'll move to the next service

**Start with Test 1 and work sequentially!**
