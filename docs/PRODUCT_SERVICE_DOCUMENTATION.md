# Product Service - API Documentation

**Service:** Product Service
**Port:** 3002
**Base URL:** http://localhost:3002
**Swagger URL:** http://localhost:3002/api-docs

---

## Overview

The Product Service manages the product catalog for the e-commerce platform, including products, categories, variants, and product images. Products can be created by factories and managed through both public and admin interfaces.

### Key Features
- Product catalog management (CRUD operations)
- Category hierarchy with parent-child relationships
- Product variants (SKU-based) with price adjustments
- Product image management with display ordering
- Product status workflow (draft, active, inactive)
- Bulk operations for admin efficiency
- Slug-based URLs for SEO

---

## API Endpoints

### Total Endpoints: 32
- **Public Product Endpoints:** 10
- **Public Category Endpoints:** 7
- **Admin Product Endpoints:** 13
- **Admin Category Endpoints:** 4

---

## Public Product Endpoints

### 1. Create Product
```
POST /api/products
```

**Purpose:** Create a new product

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "sku": "IPHONE-15-PRO",
  "description": "Latest iPhone model with A17 Pro chip",
  "categoryId": "uuid",
  "factoryId": "uuid",
  "basePrice": 15000000,
  "costPrice": 12000000,
  "moq": 50,
  "stockQuantity": 100,
  "weight": 500,
  "lengthCm": 15.5,
  "widthCm": 7.5,
  "heightCm": 0.8,
  "groupDurationHours": 48,
  "primaryImageUrl": "https://example.com/iphone15.jpg"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "iPhone 15 Pro",
  "slug": "iphone-15-pro",
  "sku": "IPHONE-15-PRO",
  "status": "draft",
  "base_price": 15000000,
  "created_at": "timestamp"
}
```

---

### 2. List Products
```
GET /api/products
```

**Purpose:** Get all products with filtering and pagination

**Query Parameters:**
- `factoryId` (string, optional) - Filter by factory UUID
- `categoryId` (string, optional) - Filter by category UUID
- `status` (string, optional) - Filter by status: draft, active, inactive, out_of_stock
- `search` (string, optional) - Search in product name and description
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20)

**Example:**
```
GET /api/products?categoryId=uuid&status=active&page=1&limit=10
```

**Response:** `200 OK`
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "sku": "IPHONE-15-PRO",
      "base_price": 15000000,
      "status": "active",
      "primary_image_url": "https://example.com/iphone15.jpg",
      "categories": {
        "id": "uuid",
        "name": "Electronics",
        "slug": "electronics"
      },
      "factories": {
        "id": "uuid",
        "factory_name": "Tech Factory",
        "city": "Jakarta"
      },
      "product_images": [...]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 3. Get Product by Slug
```
GET /api/products/{slug}
```

**Purpose:** Get product details by URL-friendly slug

**Example:**
```
GET /api/products/iphone-15-pro
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "iPhone 15 Pro",
  "slug": "iphone-15-pro",
  "sku": "IPHONE-15-PRO",
  "description": "Latest iPhone model with A17 Pro chip",
  "base_price": 15000000,
  "cost_price": 12000000,
  "min_order_quantity": 50,
  "stock_quantity": 100,
  "status": "active",
  "published_at": "timestamp",
  "categories": {
    "id": "uuid",
    "name": "Electronics",
    "slug": "electronics"
  },
  "factories": {
    "id": "uuid",
    "factory_name": "Tech Factory",
    "city": "Jakarta",
    "province": "DKI Jakarta"
  },
  "product_images": [
    {
      "id": "uuid",
      "image_url": "https://example.com/image1.jpg",
      "display_order": 1
    }
  ],
  "product_variants": [
    {
      "id": "uuid",
      "sku": "IPHONE-15-PRO-256GB",
      "variant_name": "256GB Blue Titanium",
      "price_adjustment": 2000000,
      "stock_quantity": 50
    }
  ]
}
```

---

### 4. Get Product by ID
```
GET /api/products/id/{id}
```

**Purpose:** Get product details by UUID

**Response:** Same as Get by Slug

---

### 5. Update Product
```
PATCH /api/products/{id}
```

**Purpose:** Update product details

**Request Body:** (all optional)
```json
{
  "name": "iPhone 15 Pro Max",
  "description": "Updated description",
  "basePrice": 16000000,
  "stockQuantity": 150,
  "status": "active"
}
```

**Response:** `200 OK`

---

### 6. Publish Product
```
PATCH /api/products/{id}/publish
```

**Purpose:** Change product status from draft to active

**Request Body:** None

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "iPhone 15 Pro",
  "status": "active",
  "published_at": "timestamp"
}
```

---

### 7. Delete Product (Soft Delete)
```
DELETE /api/products/{id}
```

**Purpose:** Soft delete product (sets status to inactive)

**Response:** `204 No Content`

---

### 8. Add Product Images
```
POST /api/products/{id}/images
```

**Purpose:** Add multiple images to a product

**Request Body:**
```json
{
  "images": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "sortOrder": 1
    },
    {
      "imageUrl": "https://example.com/image2.jpg",
      "sortOrder": 2
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Images added successfully"
}
```

---

### 9. Create Product Variant
```
POST /api/products/{id}/variants
```

**Purpose:** Add a variant to a product

**Request Body:**
```json
{
  "sku": "IPHONE-15-PRO-256GB-BLUE",
  "variantName": "256GB Blue Titanium",
  "priceAdjustment": 2000000,
  "stockQuantity": 50,
  "attributes": {
    "color": "Blue Titanium",
    "storage": "256GB"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "sku": "IPHONE-15-PRO-256GB-BLUE",
  "variant_name": "256GB Blue Titanium",
  "price_adjustment": 2000000,
  "stock_quantity": 50,
  "is_active": true
}
```

---

### 10. Get Variant by ID
```
GET /api/products/variants/{variantId}
```

**Purpose:** Get variant details

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "variant_name": "256GB Blue Titanium",
    "sku": "IPHONE-15-PRO-256GB-BLUE",
    "price_adjustment": 2000000,
    "stock_quantity": 50,
    "products": {
      "id": "uuid",
      "name": "iPhone 15 Pro",
      "base_price": 15000000
    }
  }
}
```

---

## Public Category Endpoints

### 1. List Categories
```
GET /api/categories
```

**Purpose:** Get all categories with optional filtering

**Query Parameters:**
- `parentId` (string, optional) - Filter by parent category UUID
- `isActive` (boolean, optional) - Filter active/inactive categories

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "icon_url": "https://example.com/icon.png",
      "parent_id": null,
      "is_active": true,
      "display_order": 1,
      "_count": {
        "products": 150,
        "other_categories": 5
      }
    }
  ]
}
```

---

### 2. Get Root Categories
```
GET /api/categories/root
```

**Purpose:** Get only root-level categories (parent_id is null)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "parent_id": null,
      "is_active": true,
      "_count": {
        "products": 150,
        "other_categories": 5
      }
    }
  ]
}
```

---

### 3. Get Category by Slug
```
GET /api/categories/slug/{slug}
```

**Purpose:** Get category details by slug

**Example:**
```
GET /api/categories/slug/electronics
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "slug": "electronics",
    "icon_url": "https://example.com/icon.png",
    "parent_id": null,
    "is_active": true,
    "other_categories": [
      {
        "id": "uuid",
        "name": "Smartphones",
        "slug": "smartphones",
        "is_active": true
      }
    ],
    "_count": {
      "products": 150
    }
  }
}
```

---

### 4. Get Category by ID
```
GET /api/categories/{id}
```

**Purpose:** Get category details with subcategories

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "slug": "electronics",
    "other_categories": [
      {
        "id": "uuid",
        "name": "Smartphones",
        "slug": "smartphones"
      }
    ],
    "_count": {
      "products": 150
    }
  }
}
```

---

### 5. Create Category
```
POST /api/categories
```

**Purpose:** Create a new category

**Request Body:**
```json
{
  "name": "Smartphones",
  "slug": "smartphones",
  "parentId": "uuid-of-electronics",
  "iconUrl": "https://example.com/icon.png"
}
```

**Validation:**
- `name` - Required
- `slug` - Required, unique
- `parentId` - Optional, valid UUID
- `iconUrl` - Optional, valid URL

**Response:** `201 Created`

---

### 6. Update Category
```
PATCH /api/categories/{id}
```

**Purpose:** Update category details

**Request Body:** (all optional)
```json
{
  "name": "Updated Name",
  "slug": "updated-slug",
  "iconUrl": "https://example.com/new-icon.png"
}
```

**Response:** `200 OK`

---

### 7. Delete Category (Soft Delete)
```
DELETE /api/categories/{id}
```

**Purpose:** Soft delete category (sets is_active to false)

**Response:** `204 No Content`

---

## Admin Product Endpoints

### 1. Admin Create Product
```
POST /api/admin/products
```

**Purpose:** Admin create product with full validation

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "sku": "IPHONE-15-PRO",
  "description": "Latest iPhone model",
  "categoryId": "uuid",
  "factoryId": "uuid",
  "basePrice": 15000000,
  "costPrice": 12000000,
  "moq": 50,
  "stockQuantity": 100,
  "weight": 500,
  "lengthCm": 15.5,
  "widthCm": 7.5,
  "heightCm": 0.8,
  "groupDurationHours": 48
}
```

**Validation:**
- `name` - Required, trimmed
- `sku` - Required, trimmed, unique
- `categoryId` - Required, valid UUID
- `factoryId` - Required, valid UUID
- `basePrice` - Required, numeric, min: 0
- `moq` - Required, integer, min: 1

**Response:** `201 Created`
```json
{
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "name": "iPhone 15 Pro",
    "slug": "iphone-15-pro",
    "status": "draft"
  }
}
```

**Errors:**
- `409 Conflict` - SKU already exists

---

### 2. Admin Update Product
```
PUT /api/admin/products/{id}
```

**Purpose:** Admin update product

**Request Body:** (all optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "basePrice": 16000000,
  "costPrice": 13000000,
  "status": "active",
  "stockQuantity": 150
}
```

**Response:** `200 OK`

---

### 3. Admin Update Product Status
```
PUT /api/admin/products/{id}/status
```

**Purpose:** Update only product status

**Request Body:**
```json
{
  "status": "active"
}
```

**Valid status values:** draft, active, inactive, out_of_stock

**Response:** `200 OK`

---

### 4. Admin Delete Product (Soft Delete)
```
DELETE /api/admin/products/{id}
```

**Purpose:** Admin soft delete product (sets status to inactive)

**Response:** `200 OK`

---

### 5. Admin Create Variant
```
POST /api/admin/products/{id}/variants
```

**Purpose:** Admin add variant to product

**Request Body:**
```json
{
  "sku": "IPHONE-15-PRO-256GB-BLUE",
  "variantName": "256GB Blue Titanium",
  "priceAdjustment": 2000000,
  "stockQuantity": 50
}
```

**Validation:**
- `sku` - Required, trimmed
- `variantName` - Required, trimmed
- `priceAdjustment` - Optional, numeric
- `stockQuantity` - Optional, integer, min: 0

**Response:** `201 Created`

---

### 6. Admin Update Variant
```
PUT /api/admin/products/{id}/variants/{variantId}
```

**Purpose:** Admin update variant

**Request Body:** (all optional)
```json
{
  "sku": "UPDATED-SKU",
  "variantName": "Updated Name",
  "priceAdjustment": 2500000,
  "stockQuantity": 75
}
```

**Response:** `200 OK`

---

### 7. Admin Delete Variant (Soft Delete)
```
DELETE /api/admin/products/{id}/variants/{variantId}
```

**Purpose:** Admin soft delete variant (sets is_active to false)

**Response:** `200 OK`

---

### 8. Admin Add Images
```
POST /api/admin/products/{id}/images
```

**Purpose:** Admin add images to product

**Request Body:**
```json
{
  "images": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "displayOrder": 1
    },
    {
      "imageUrl": "https://example.com/image2.jpg",
      "displayOrder": 2
    }
  ]
}
```

**Validation:**
- `images` - Required, array
- `imageUrl` - Required, valid URL
- `displayOrder` - Required, integer

**Response:** `201 Created`

---

### 9. Admin Reorder Images
```
PUT /api/admin/products/{id}/images/reorder
```

**Purpose:** Admin reorder product images

**Request Body:**
```json
{
  "imageId": "uuid",
  "newOrder": 3
}
```

**Response:** `200 OK`

---

### 10. Admin Delete Image
```
DELETE /api/admin/products/{id}/images/{imageId}
```

**Purpose:** Admin delete product image

**Response:** `200 OK`

---

### 11. Admin Bulk Update
```
POST /api/admin/products/bulk/update
```

**Purpose:** Admin bulk update multiple products

**Request Body:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"],
  "updateData": {
    "status": "active",
    "stockQuantity": 100
  }
}
```

**Response:** `200 OK`
```json
{
  "message": "3 products updated successfully"
}
```

---

### 12. Admin Bulk Delete
```
POST /api/admin/products/bulk/delete
```

**Purpose:** Admin bulk soft delete products

**Request Body:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** `200 OK`
```json
{
  "message": "3 products deleted successfully"
}
```

---

### 13. Admin Bulk Import
```
POST /api/admin/products/bulk/import
```

**Purpose:** Admin import products from CSV/Excel

**Status:** Not yet implemented

**Response:** `501 Not Implemented`

---

## Admin Category Endpoints

### 1. Admin Create Category
```
POST /api/admin/categories
```

**Purpose:** Admin create category

**Request Body:**
```json
{
  "name": "Smartphones",
  "parentCategoryId": "uuid-of-electronics",
  "iconUrl": "https://example.com/icon.png"
}
```

**Validation:**
- `name` - Required, trimmed
- `parentCategoryId` - Optional, valid UUID
- `iconUrl` - Optional, valid URL

**Response:** `201 Created`
```json
{
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Smartphones",
    "slug": "smartphones",
    "parent_id": "uuid-of-electronics",
    "icon_url": "https://example.com/icon.png",
    "is_active": true
  }
}
```

**Features:**
- Auto-generates slug from name
- Handles unique constraint errors

**Errors:**
- `409 Conflict` - Category name already exists

---

### 2. Admin Update Category
```
PUT /api/admin/categories/{id}
```

**Purpose:** Admin update category

**Request Body:** (all optional)
```json
{
  "name": "Updated Category Name",
  "iconUrl": "https://example.com/new-icon.png"
}
```

**Response:** `200 OK`

**Features:**
- Auto-regenerates slug when name changes

---

### 3. Admin Delete Category (Soft Delete)
```
DELETE /api/admin/categories/{id}
```

**Purpose:** Admin soft delete category (sets is_active to false)

**Response:** `200 OK`

---

## Database Schema

### products Table
```prisma
model products {
  id                    String          @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  factory_id            String?         @db.Uuid
  category_id           String          @db.Uuid
  sku                   String          @unique @db.VarChar(100)
  name                  String          @db.VarChar(255)
  slug                  String          @unique @db.VarChar(255)
  description           String?
  status                product_status  @default(draft)
  primary_image_url     String?
  base_price            Decimal         @db.Decimal(15, 2)
  cost_price            Decimal?        @db.Decimal(15, 2)
  min_order_quantity    Int             @default(50)
  group_duration_hours  Int?            @default(48)
  weight_grams          Int?
  length_cm             Decimal?        @db.Decimal(10, 2)
  width_cm              Decimal?        @db.Decimal(10, 2)
  height_cm             Decimal?        @db.Decimal(10, 2)
  stock_quantity        Int?            @default(0)
  meta_title            String?         @db.VarChar(255)
  meta_description      String?
  published_at          DateTime?       @db.Timestamptz(6)
  created_at            DateTime        @default(now()) @db.Timestamptz(6)
  updated_at            DateTime        @default(now()) @db.Timestamptz(6)

  // Relations
  categories            categories      @relation(fields: [category_id], references: [id])
  factories             factories?      @relation(fields: [factory_id], references: [id])
  product_images        product_images[]
  product_variants      product_variants[]
}

enum product_status {
  draft
  active
  inactive
  out_of_stock
}
```

### categories Table
```prisma
model categories {
  id               String       @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  parent_id        String?      @db.Uuid
  name             String       @db.VarChar(255)
  slug             String       @unique @db.VarChar(255)
  icon_url         String?
  display_order    Int?         @default(0)
  is_active        Boolean?     @default(true)
  created_at       DateTime     @default(now()) @db.Timestamptz(6)
  updated_at       DateTime     @default(now()) @db.Timestamptz(6)

  // Relations
  categories       categories?  @relation("categoriesTocategories", fields: [parent_id], references: [id])
  other_categories categories[] @relation("categoriesTocategories")
  products         products[]

  @@index([parent_id])
  @@index([slug])
}
```

### product_variants Table
```prisma
model product_variants {
  id               String    @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  product_id       String    @db.Uuid
  sku              String    @unique @db.VarChar(100)
  variant_name     String    @db.VarChar(255)
  color            String?   @db.VarChar(50)
  size             String?   @db.VarChar(50)
  material         String?   @db.VarChar(100)
  price_adjustment Decimal?  @default(0.00) @db.Decimal(15, 2)
  stock_quantity   Int?      @default(0)
  weight_grams     Int?
  image_url        String?
  is_active        Boolean?  @default(true)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  // Relations
  products         products  @relation(fields: [product_id], references: [id], onDelete: Cascade)
}
```

### product_images Table
```prisma
model product_images {
  id            String    @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  product_id    String    @db.Uuid
  image_url     String
  display_order Int       @default(0)
  created_at    DateTime  @default(now()) @db.Timestamptz(6)

  // Relations
  products      products  @relation(fields: [product_id], references: [id], onDelete: Cascade)
}
```

---

## Business Logic

### Product Lifecycle
1. Product created with status: `draft`
2. Factory/Admin adds images and variants
3. Admin publishes → status: `active`, sets `published_at`
4. Product visible to customers
5. If out of stock → status: `out_of_stock`
6. If discontinued → status: `inactive` (soft delete)

### Category Hierarchy
- Categories can have parent-child relationships
- Root categories have `parent_id: null`
- Subcategories reference parent via `parent_id`
- Slug auto-generated from name for SEO-friendly URLs
- Soft delete preserves hierarchy (sets `is_active: false`)

### Product Variants
- Multiple variants per product (e.g., sizes, colors)
- Each variant has unique SKU
- Price adjustment added to base price
- Independent stock tracking per variant
- Soft delete (sets `is_active: false`)

---

## Authentication

**Current State:** No authentication implemented
**Planned:** JWT-based authentication with role-based access control

**Future Access Control:**
- Public endpoints: GET /api/products, GET /api/categories (read-only)
- Factory Owner: POST, PATCH, DELETE for their own products
- Admin: All endpoints including bulk operations

---

## Error Responses

### 400 Bad Request
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "basePrice",
      "location": "body"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Product not found"
}
```

### 409 Conflict
```json
{
  "error": "Category with this name already exists",
  "field": "name"
}
```

---

## Environment Variables

```env
PORT=3002
DATABASE_URL=postgresql://...
NODE_ENV=development
```

---

**Last Updated:** 2025-11-09
**API Version:** 1.0.0
