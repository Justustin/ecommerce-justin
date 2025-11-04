# Seller Service Implementation Guide

## ✅ Completed So Far

### 1. Prisma Schema Updated
- ✅ Added enums: `product_source`, `seller_type`, `seller_status`, `stock_movement_type`, `order_source`
- ✅ Added models: `sellers`, `seller_inventory`, `seller_inventory_variants`, `seller_stock_movements`, `seller_settlements`
- ✅ Updated `products` model: Added `product_source`, `seller_id`, made `factory_id` nullable
- ✅ Updated `product_variants` model: Added relations to `seller_inventory_variants` and `seller_stock_movements`
- ✅ Updated `orders` model: Added `order_source`, `seller_id`
- ✅ Updated `users` model: Added `sellers`, `sellers_verified_by`, `seller_stock_movements` relations
- ✅ Updated `user_role` enum: Added `seller`

### 2. Migration SQL Created
- ✅ File: `packages/database/migrations/001_add_seller_inventory_system.sql`
- ✅ Creates all new tables with proper indexes and constraints
- ✅ Non-breaking migration (existing data marked as `factory_group_buying`)
- ✅ Helper functions for stock management

### 3. Architecture Documentation
- ✅ File: `ARCHITECTURE_GROUP_BUYING_VS_SELLER_INVENTORY.md`
- ✅ Explains dual inventory system
- ✅ Complete flows for both admin (group buying) and sellers
- ✅ Business rules and differences

### 4. Seller Service Structure
- ✅ Created directory structure: `services/seller-service/src/{types,repositories,services,controllers,routes,utils,config}`
- ✅ Created `package.json`
- ✅ Created `tsconfig.json`
- ✅ Created `.env.example`

---

## 🚧 TODO: Complete Seller Service Implementation

### Step 1: Create TypeScript Types (`src/types/index.ts`)

```typescript
// src/types/index.ts
import { seller_type, seller_status, stock_movement_type } from '@repo/database';

export interface CreateSellerDTO {
  userId: string;
  sellerType: seller_type;
  storeName: string;
  storeSlug?: string;  // Auto-generated if not provided
  storeDescription?: string;
  phoneNumber: string;
  email?: string;
  province: string;
  city: string;
  district: string;
  postalCode?: string;
  addressLine: string;
  businessLicenseNumber?: string;
  businessLicenseUrl?: string;
  taxId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface UpdateSellerDTO {
  storeName?: string;
  storeDescription?: string;
  storeLogo Url?: string;
  storeBannerUrl?: string;
  phoneNumber?: string;
  email?: string;
  province?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  addressLine?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface CreateInventoryDTO {
  sellerId: string;
  productId: string;
  sellerPrice: number;
  costPrice?: number;
  stockQuantity: number;
  warehouseLocation?: string;
  lowStockThreshold?: number;
}

export interface UpdateInventoryDTO {
  sellerPrice?: number;
  costPrice?: number;
  warehouseLocation?: string;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface AddStockDTO {
  inventoryId: string;
  variantId?: string;  // null for base product
  quantity: number;
  movementType: stock_movement_type;
  notes?: string;
  performedBy: string;
  referenceType?: string;
  referenceId?: string;
}

export interface CreateVariantInventoryDTO {
  inventoryId: string;
  variantId: string;
  stockQuantity: number;
  priceAdjustment?: number;
}

export interface SellerFilters {
  status?: seller_status;
  sellerType?: seller_type;
  verificationStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

### Step 2: Create Repository (`src/repositories/seller.repository.ts`)

```typescript
import { prisma, seller_status, stock_movement_type } from '@repo/database';
import {
  CreateSellerDTO,
  UpdateSellerDTO,
  CreateInventoryDTO,
  UpdateInventoryDTO,
  CreateVariantInventoryDTO,
  AddStockDTO,
  SellerFilters
} from '../types';

export class SellerRepository {
  async createSeller(data: CreateSellerDTO) {
    return await prisma.sellers.create({
      data: {
        ...data,
        verification_status: 'pending',
        status: 'pending'
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        }
      }
    });
  }

  async findById(id: string) {
    return await prisma.sellers.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            role: true
          }
        },
        seller_inventory: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                base_price: true
              }
            }
          }
        }
      }
    });
  }

  async findByUserId(userId: string) {
    return await prisma.sellers.findFirst({
      where: { user_id: userId }
    });
  }

  async findBySlug(slug: string) {
    return await prisma.sellers.findUnique({
      where: { store_slug: slug }
    });
  }

  async update(id: string, data: UpdateSellerDTO) {
    return await prisma.sellers.update({
      where: { id },
      data
    });
  }

  async verifySeller(id: string, verifiedBy: string) {
    return await prisma.sellers.update({
      where: { id },
      data: {
        verification_status: 'verified',
        verified_at: new Date(),
        verified_by: verifiedBy,
        status: 'active'
      }
    });
  }

  async list(filters: SellerFilters) {
    const { status, sellerType, verificationStatus, search, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (sellerType) where.seller_type = sellerType;
    if (verificationStatus) where.verification_status = verificationStatus;
    if (search) {
      where.OR = [
        { store_name: { contains: search, mode: 'insensitive' } },
        { store_slug: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [sellers, total] = await Promise.all([
      prisma.sellers.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      }),
      prisma.sellers.count({ where })
    ]);

    return { sellers, total, page, limit };
  }

  // Inventory methods
  async createInventory(data: CreateInventoryDTO) {
    return await prisma.seller_inventory.create({
      data: {
        seller_id: data.sellerId,
        product_id: data.productId,
        seller_price: data.sellerPrice,
        cost_price: data.costPrice,
        stock_quantity: data.stockQuantity,
        reserved_quantity: 0,
        warehouse_location: data.warehouseLocation,
        low_stock_threshold: data.lowStockThreshold || 10
      },
      include: {
        products: true,
        sellers: true
      }
    });
  }

  async findInventoryById(id: string) {
    return await prisma.seller_inventory.findUnique({
      where: { id },
      include: {
        products: true,
        sellers: true,
        inventory_variants: {
          include: {
            product_variants: true
          }
        }
      }
    });
  }

  async findInventoryBySeller(sellerId: string) {
    return await prisma.seller_inventory.findMany({
      where: { seller_id: sellerId, is_active: true },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            primary_image_url: true
          }
        },
        inventory_variants: {
          where: { is_active: true },
          include: {
            product_variants: true
          }
        }
      }
    });
  }

  async updateInventory(id: string, data: UpdateInventoryDTO) {
    return await prisma.seller_inventory.update({
      where: { id },
      data
    });
  }

  async addStock(data: AddStockDTO) {
    const { inventoryId, variantId, quantity, movementType, notes, performedBy } = data;

    return await prisma.$transaction(async (tx) => {
      // Update stock quantity
      if (variantId) {
        // Variant stock
        const variant = await tx.seller_inventory_variants.update({
          where: {
            inventory_id_variant_id: {
              inventory_id: inventoryId,
              variant_id: variantId
            }
          },
          data: {
            stock_quantity: { increment: quantity }
          }
        });

        // Log movement
        await tx.seller_stock_movements.create({
          data: {
            inventory_id: inventoryId,
            variant_id: variantId,
            movement_type: movementType,
            quantity,
            stock_after: variant.stock_quantity,
            notes,
            performed_by: performedBy,
            reference_type: data.referenceType,
            reference_id: data.referenceId
          }
        });

        return variant;
      } else {
        // Base product stock
        const inventory = await tx.seller_inventory.update({
          where: { id: inventoryId },
          data: {
            stock_quantity: { increment: quantity }
          }
        });

        // Log movement
        await tx.seller_stock_movements.create({
          data: {
            inventory_id: inventoryId,
            movement_type: movementType,
            quantity,
            stock_after: inventory.stock_quantity,
            notes,
            performed_by: performedBy,
            reference_type: data.referenceType,
            reference_id: data.referenceId
          }
        });

        return inventory;
      }
    });
  }

  async createVariantInventory(data: CreateVariantInventoryDTO) {
    return await prisma.seller_inventory_variants.create({
      data: {
        inventory_id: data.inventoryId,
        variant_id: data.variantId,
        stock_quantity: data.stockQuantity,
        reserved_quantity: 0,
        price_adjustment: data.priceAdjustment || 0
      },
      include: {
        product_variants: true
      }
    });
  }

  async getStockMovements(inventoryId: string) {
    return await prisma.seller_stock_movements.findMany({
      where: { inventory_id: inventoryId },
      orderBy: { created_at: 'desc' },
      include: {
        product_variants: true,
        users: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });
  }
}
```

### Step 3: Create Service (`src/services/seller.service.ts`)

```typescript
import { SellerRepository } from '../repositories/seller.repository';
import { CreateSellerDTO, UpdateSellerDTO, CreateInventoryDTO, AddStockDTO, SellerFilters } from '../types';
import slugify from 'slugify';

export class SellerService {
  private repository: SellerRepository;

  constructor() {
    this.repository = new SellerRepository();
  }

  async registerSeller(data: CreateSellerDTO) {
    // Auto-generate slug if not provided
    if (!data.storeSlug) {
      data.storeSlug = slugify(data.storeName, { lower: true, strict: true });
    }

    // Check if slug already exists
    const existingSeller = await this.repository.findBySlug(data.storeSlug);
    if (existingSeller) {
      throw new Error(`Store slug "${data.storeSlug}" is already taken`);
    }

    // Check if user already has a seller account
    const userSeller = await this.repository.findByUserId(data.userId);
    if (userSeller) {
      throw new Error('User already has a seller account');
    }

    return await this.repository.createSeller(data);
  }

  async getSellerById(id: string) {
    const seller = await this.repository.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }
    return seller;
  }

  async getSellerBySlug(slug: string) {
    const seller = await this.repository.findBySlug(slug);
    if (!seller) {
      throw new Error('Seller not found');
    }
    return seller;
  }

  async updateSeller(id: string, data: UpdateSellerDTO) {
    const seller = await this.repository.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }
    return await this.repository.update(id, data);
  }

  async verifySeller(id: string, verifiedBy: string) {
    const seller = await this.repository.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }
    if (seller.verification_status === 'verified') {
      throw new Error('Seller is already verified');
    }
    return await this.repository.verifySeller(id, verifiedBy);
  }

  async listSellers(filters: SellerFilters) {
    return await this.repository.list(filters);
  }

  // Inventory management
  async createInventory(data: CreateInventoryDTO) {
    // Validate seller exists
    const seller = await this.repository.findById(data.sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (seller.status !== 'active') {
      throw new Error('Seller account must be active to manage inventory');
    }

    // TODO: Validate product exists and is eligible for seller inventory
    // Product should have product_source = 'seller_inventory' OR
    // Factory products can be resold by sellers

    return await this.repository.createInventory(data);
  }

  async getInventory(id: string) {
    const inventory = await this.repository.findInventoryById(id);
    if (!inventory) {
      throw new Error('Inventory not found');
    }
    return inventory;
  }

  async getSellerInventory(sellerId: string) {
    return await this.repository.findInventoryBySeller(sellerId);
  }

  async addStock(data: AddStockDTO) {
    const inventory = await this.repository.findInventoryById(data.inventoryId);
    if (!inventory) {
      throw new Error('Inventory not found');
    }

    if (!inventory.is_active) {
      throw new Error('Cannot modify inactive inventory');
    }

    return await this.repository.addStock(data);
  }

  async getStockHistory(inventoryId: string) {
    return await this.repository.getStockMovements(inventoryId);
  }
}
```

### Step 4: Create Controller (`src/controllers/seller.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { SellerService } from '../services/seller.service';

export class SellerController {
  private service: SellerService;

  constructor() {
    this.service = new SellerService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const seller = await this.service.registerSeller(req.body);
      res.status(201).json({
        message: 'Seller registered successfully',
        data: seller
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const seller = await this.service.getSellerById(req.params.id);
      res.json({ data: seller });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      const seller = await this.service.getSellerBySlug(req.params.slug);
      res.json({ data: seller });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const seller = await this.service.updateSeller(req.params.id, req.body);
      res.json({
        message: 'Seller updated successfully',
        data: seller
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  verify = async (req: Request, res: Response) => {
    try {
      const { verifiedBy } = req.body;
      const seller = await this.service.verifySeller(req.params.id, verifiedBy);
      res.json({
        message: 'Seller verified successfully',
        data: seller
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as any,
        sellerType: req.query.sellerType as any,
        verificationStatus: req.query.verificationStatus as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      const result = await this.service.listSellers(filters);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // Inventory endpoints
  createInventory = async (req: Request, res: Response) => {
    try {
      const inventory = await this.service.createInventory(req.body);
      res.status(201).json({
        message: 'Inventory created successfully',
        data: inventory
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getInventory = async (req: Request, res: Response) => {
    try {
      const inventory = await this.service.getInventory(req.params.id);
      res.json({ data: inventory });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getSellerInventory = async (req: Request, res: Response) => {
    try {
      const inventory = await this.service.getSellerInventory(req.params.sellerId);
      res.json({ data: inventory });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  addStock = async (req: Request, res: Response) => {
    try {
      const result = await this.service.addStock(req.body);
      res.json({
        message: 'Stock updated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getStockHistory = async (req: Request, res: Response) => {
    try {
      const history = await this.service.getStockHistory(req.params.inventoryId);
      res.json({ data: history });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
```

### Step 5: Create Routes (`src/routes/seller.routes.ts`)

```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { SellerController } from '../controllers/seller.controller';

const router = Router();
const controller = new SellerController();

// Seller management
router.post(
  '/register',
  [
    body('userId').isUUID(),
    body('sellerType').isIn(['individual', 'business']),
    body('storeName').notEmpty().isLength({ min: 3, max: 255 }),
    body('storeSlug').optional().isSlug(),
    body('phoneNumber').isMobilePhone('any'),
    body('province').notEmpty(),
    body('city').notEmpty(),
    body('district').notEmpty(),
    body('addressLine').notEmpty()
  ],
  controller.register
);

router.get('/:id', [param('id').isUUID()], controller.getById);
router.get('/slug/:slug', [param('slug').notEmpty()], controller.getBySlug);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('storeName').optional().isLength({ min: 3, max: 255 }),
    body('phoneNumber').optional().isMobilePhone('any')
  ],
  controller.update
);

router.post(
  '/:id/verify',
  [
    param('id').isUUID(),
    body('verifiedBy').isUUID()
  ],
  controller.verify
);

router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'active', 'suspended', 'inactive']),
    query('sellerType').optional().isIn(['individual', 'business']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  controller.list
);

// Inventory management
router.post(
  '/inventory',
  [
    body('sellerId').isUUID(),
    body('productId').isUUID(),
    body('sellerPrice').isFloat({ gt: 0 }),
    body('stockQuantity').isInt({ min: 0 })
  ],
  controller.createInventory
);

router.get('/inventory/:id', [param('id').isUUID()], controller.getInventory);
router.get('/:sellerId/inventory', [param('sellerId').isUUID()], controller.getSellerInventory);

router.post(
  '/inventory/stock',
  [
    body('inventoryId').isUUID(),
    body('quantity').isInt(),
    body('movementType').isIn(['purchase', 'sale', 'return', 'damaged', 'lost', 'adjustment', 'reserved', 'released']),
    body('performedBy').isUUID()
  ],
  controller.addStock
);

router.get('/inventory/:inventoryId/history', [param('inventoryId').isUUID()], controller.getStockHistory);

export default router;
```

### Step 6: Create Index (`src/index.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sellerRoutes from './routes/seller.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'seller-service' });
});

// Routes
app.use('/api/sellers', sellerRoutes);

app.listen(PORT, () => {
  console.log(`🛍️  Seller Service running on port ${PORT}`);
});
```

---

## 🔄 Services That Need Updates

### 1. Group Buying Service
**Why**: Should only work with factory products

**Changes Needed**:
- In `joinSession()`: Validate that `product.product_source === 'factory_group_buying'`
- Add check to ensure product has a factory_id

**File**: `services/group-buying- service/src/services/group.buying.service.ts`

```typescript
// In joinSession method, after getting session:
const product = await prisma.products.findUnique({
  where: { id: session.product_id }
});

if (product?.product_source !== 'factory_group_buying') {
  throw new Error('Group buying is only available for factory products');
}

if (!product.factory_id) {
  throw new Error('Invalid factory product configuration');
}
```

### 2. Product Service
**Why**: Needs to handle product_source when creating/updating products

**Changes Needed**:
- Add `product_source` to create/update DTOs
- Add validation: if `product_source === 'factory_group_buying'`, require `factory_id`
- Add validation: if `product_source === 'seller_inventory'`, require `seller_id`
- Add filtering by `product_source` in list endpoint

**Files**:
- `services/product-service/src/types/index.ts`
- `services/product-service/src/services/product.service.ts`

### 3. Order Service
**Why**: Needs to handle order_source and different fulfillment flows

**Changes Needed**:
- Add `order_source` to order creation
- If `order_source === 'seller_store'`:
  - Call seller-service to reserve stock
  - Use seller_id instead of group_session_id
  - Direct payment (not escrow)
- If `order_source === 'group_buying'`:
  - Existing flow with escrow
- Add stock release on order cancellation for seller orders

**Files**:
- `services/order-service/src/types/index.ts`
- `services/order-service/src/services/order.service.ts`

### 4. Payment Service
**Why**: Different payment flow for sellers (no escrow)

**Changes Needed**:
- Check `order.order_source` before creating payment
- If `order_source === 'group_buying'`: Use escrow
- If `order_source === 'seller_store'`: Direct payment
- On payment success for seller orders: Release payment to seller wallet/bank

**Files**:
- `services/payment-service/src/services/payment.service.ts`

---

## 📦 Running the Migration

```bash
# 1. Run the migration SQL
cd packages/database
psql -U your_user -d your_db -f migrations/001_add_seller_inventory_system.sql

# 2. Generate Prisma client with new schema
npx prisma generate

# 3. Install dependencies for seller-service
cd ../../services/seller-service
npm install

# 4. Start seller-service
npm run dev
```

---

## 🧪 Testing the Seller Flow

```powershell
# 1. Register a seller
$registerSeller = @{
    userId = "eb093914-48d9-4b32-bd76-96c99bbdb1a5"
    sellerType = "individual"
    storeName = "My Fashion Store"
    phoneNumber = "+6281234567890"
    province = "DKI Jakarta"
    city = "Jakarta Selatan"
    district = "Kebayoran Baru"
    addressLine = "Jl. Senopati No. 123"
    bankName = "BCA"
    bankAccountNumber = "1234567890"
    bankAccountName = "John Doe"
} | ConvertTo-Json

$seller = Invoke-RestMethod -Uri "http://localhost:3009/api/sellers/register" `
  -Method Post -Body $registerSeller -ContentType "application/json"

$sellerId = $seller.data.id
Write-Host "Seller created: $sellerId"

# 2. Admin verifies seller
$verify = @{
    verifiedBy = "admin-user-id"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3009/api/sellers/$sellerId/verify" `
  -Method Post -Body $verify -ContentType "application/json"

# 3. Seller creates inventory for a product
$createInventory = @{
    sellerId = $sellerId
    productId = "9d0280b8-fb12-48c9-8727-4f1572b5fe40"
    sellerPrice = 180000
    costPrice = 150000
    stockQuantity = 50
    warehouseLocation = "Jakarta Warehouse A"
    lowStockThreshold = 10
} | ConvertTo-Json

$inventory = Invoke-RestMethod -Uri "http://localhost:3009/api/sellers/inventory" `
  -Method Post -Body $createInventory -ContentType "application/json"

$inventoryId = $inventory.data.id
Write-Host "Inventory created: $inventoryId"

# 4. Add stock
$addStock = @{
    inventoryId = $inventoryId
    quantity = 20
    movementType = "purchase"
    notes = "Purchased from supplier"
    performedBy = "eb093914-48d9-4b32-bd76-96c99bbdb1a5"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3009/api/sellers/inventory/stock" `
  -Method Post -Body $addStock -ContentType "application/json"

# 5. Customer browses seller inventory
$sellerInventory = Invoke-RestMethod -Uri "http://localhost:3009/api/sellers/$sellerId/inventory"
$sellerInventory.data | Format-Table

# 6. Customer orders from seller (through order-service)
# This would use order-service with order_source='seller_store'
```

---

## 📋 Summary

You now have:
1. ✅ Complete architecture documentation
2. ✅ Migration SQL ready to run
3. ✅ Updated Prisma schema
4. ✅ Seller service structure and complete implementation guide
5. ✅ Clear list of which services need updates and what changes

**Next Steps:**
1. Run the migration SQL
2. Implement the seller-service using the code templates above
3. Update the affected services (group-buying, product, order, payment)
4. Test the complete flow

All files have been committed and pushed to your branch!
