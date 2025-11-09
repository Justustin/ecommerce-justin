import { prisma } from '@repo/database';
import { CreateProductDTO, UpdateProductDTO, ProductQuery, CreateVariantDTO } from '../types';
import slugify from 'slugify';

export class ProductRepository {
  async create(data: CreateProductDTO) {
    const slug = slugify(data.name, { lower: true, strict: true });
    
    return prisma.products.create({
      data: {
        factory_id: data.factoryId,
        category_id: data.categoryId,
        sku: data.sku,
        name: data.name,
        slug,
        description: data.description,
        base_price: data.basePrice,
        cost_price: data.costPrice,
        min_order_quantity: data.moq,
        group_duration_hours: data.groupDurationHours || 48,
        stock_quantity: data.stockQuantity,
        weight_grams: data.weight,
        length_cm: data.lengthCm,
        width_cm: data.widthCm,
        height_cm: data.heightCm,
        status: 'draft', // Start as draft, factory can publish later
        primary_image_url: data.primaryImageUrl
      },
      include: {
        categories: true,
        factories: {
          select: {
            id: true,
            factory_name: true,
            city: true
          }
        }
      }
    });
  }

  async findAll(query: ProductQuery) {
    const { factoryId, categoryId, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (factoryId) where.factory_id = factoryId;
    if (categoryId) where.category_id = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take: limit,
        include: {
          categories: true,
          factories: {
            select: {
              id: true,
              factory_name: true,
              city: true
            }
          },
          product_images: {
            orderBy: { display_order: 'asc' }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.products.count({ where })
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findBySlug(slug: string) {
    return prisma.products.findUnique({
      where: { slug },
      include: {
        categories: true,
        factories: {
          select: {
            id: true,
            factory_name: true,
            city: true,
            province: true
          }
        },
        product_images: {
          orderBy: { display_order: 'asc' }
        },
        product_variants: true
      }
    });
  }

  async findById(id: string) {
    return prisma.products.findUnique({
      where: { id },
      include: {
        categories: true,
        factories: true,
        product_images: {
          orderBy: { display_order: 'asc' }
        },
        product_variants: true
      }
    });
  }

  async update(id: string, data: UpdateProductDTO) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.base_price = data.basePrice;
    if (data.costPrice !== undefined) updateData.cost_price = data.costPrice;
    if (data.moq !== undefined) updateData.min_order_quantity = data.moq;
    if (data.stockQuantity !== undefined) updateData.stock_quantity = data.stockQuantity;
    if (data.weight !== undefined) updateData.weight_grams = data.weight;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.primaryImageUrl !== undefined) updateData.primary_image_url = data.primaryImageUrl;
    if (data.lengthCm !== undefined) updateData.length_cm = data.lengthCm;
    if (data.widthCm !== undefined) updateData.width_cm = data.widthCm;
    if (data.heightCm !== undefined) updateData.height_cm = data.heightCm;
    if (data.groupDurationHours !== undefined) updateData.group_duration_hours = data.groupDurationHours;
    
    // Update timestamp
    updateData.updated_at = new Date();
    
    return prisma.products.update({
      where: { id },
      data: updateData,
      include: {
        categories: true,
        factories: true,
        product_images: true
      }
    });
  }

  async delete(id: string) {
    return prisma.products.update({
      where: { id },
      data: { 
        status: 'inactive',
        updated_at: new Date()
      }
    });
  }

  async publish(id: string) {
    return prisma.products.update({
      where: { id },
      data: { 
        status: 'active',
        published_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async addImages(productId: string, images: { imageUrl: string; sortOrder: number }[]) {
    return prisma.product_images.createMany({
      data: images.map(img => ({
        product_id: productId,
        image_url: img.imageUrl,
        display_order: img.sortOrder
      }))
    });
  }

  async createVariant(data: CreateVariantDTO) {
    return prisma.product_variants.create({
      data: {
        product_id: data.productId,
        sku: data.sku,
        variant_name: data.variantName,
        price_adjustment: data.priceAdjustment || 0,
        stock_quantity: data.stockQuantity || 0,
        is_active: true
      }
    });
  }

  async updateVariant(variantId: string, data: Partial<CreateVariantDTO>) {
    return prisma.product_variants.update({
      where: { id: variantId },
      data: {
        sku: data.sku,
        variant_name: data.variantName,
        price_adjustment: data.priceAdjustment,
        stock_quantity: data.stockQuantity,
        updated_at: new Date()
      }
    });
  }

  async deleteVariant(variantId: string) {
    return prisma.product_variants.update({
      where: { id: variantId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });
  }

  async findVariantById(variantId: string) {
    return prisma.product_variants.findUnique({
      where: { id: variantId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            factory_id: true,
            base_price: true
          }
        }
      }
    });
  }
}