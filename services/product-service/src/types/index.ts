export type ProductStatus = 'draft' | 'active' | 'inactive';

export interface CreateProductDTO {
  factoryId: string;
  categoryId: string;
  sku: string;
  name: string;
  description?: string;
  basePrice: number;
  costPrice?: number;
  moq: number;
  groupDurationHours?: number;
  stockQuantity?: number;
  weight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  primaryImageUrl?: string;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  basePrice?: number;
  costPrice?: number;
  moq?: number;
  stockQuantity?: number;
  weight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  status?: ProductStatus;
  primaryImageUrl?: string;
  groupDurationHours?: number;
}

export interface CreateVariantDTO {
  productId: string;
  sku: string;
  variantName: string;
  priceAdjustment: number;
  stockQuantity: number;
}

export interface ProductQuery {
  factoryId?: string;
  categoryId?: string;
  status?: ProductStatus;
  search?: string;
  page?: number;
  limit?: number;
}