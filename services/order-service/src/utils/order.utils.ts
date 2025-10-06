// services/order-service/src/utils/order.utils.ts

import { ProductSnapshot } from '../types';

export class OrderUtils {
  private productServiceUrl: string;

  constructor() {
    this.productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
  }

  generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `ORD-${date}-${random}`;
  }

  async buildProductSnapshot(
    productId: string, 
    variantId?: string
  ): Promise<ProductSnapshot> {
    const response = await fetch(`${this.productServiceUrl}/api/products/id/${productId}`);
    
    if (!response.ok) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = await response.json();

    const snapshot: ProductSnapshot = {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description || undefined,
        primary_image_url: product.primary_image_url || undefined,
        factory_id: product.factory_id,
        base_price: Number(product.base_price),
        weight_grams: product.weight_grams || undefined,
        length_cm: product.length_cm ? Number(product.length_cm) : undefined,
        width_cm: product.width_cm ? Number(product.width_cm) : undefined,
        height_cm: product.height_cm ? Number(product.height_cm) : undefined
      },
      category: {
        id: product.categories.id,
        name: product.categories.name,
        slug: product.categories.slug
      },
      factory: {
        id: product.factories.id,
        factory_name: product.factories.factory_name,
        city: product.factories.city || undefined
      }
    };

    if (variantId && product.product_variants) {
      const variant = product.product_variants.find((v: any) => v.id === variantId);
      
      if (variant) {
        snapshot.variant = {
          id: variant.id,
          variant_name: variant.variant_name,
          sku: variant.sku,
          variant_price: variant.variant_price ? Number(variant.variant_price) : undefined
        };
      }
    }

    return snapshot;
  }

  async getProductPrice(productId: string, variantId?: string): Promise<number> {
    const response = await fetch(`${this.productServiceUrl}/api/products/id/${productId}`);
    
    if (!response.ok) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = await response.json();
    let price = Number(product.base_price);

    if (variantId && product.product_variants) {
      const variant = product.product_variants.find((v: any) => v.id === variantId);
      
      if (variant && variant.variant_price) {
        price += Number(variant.variant_price);
      }
    }

    return price;
  }

  async getProductFactoryId(productId: string): Promise<string> {
    const response = await fetch(`${this.productServiceUrl}/api/products/id/${productId}`);
    
    if (!response.ok) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = await response.json();
    return product.factory_id;
  }

  async getProductDetails(productId: string) {
    const response = await fetch(`${this.productServiceUrl}/api/products/id/${productId}`);
    
    if (!response.ok) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = await response.json();
    return {
      sku: product.sku,
      name: product.name,
      factoryId: product.factory_id
    };
  }

  async getVariantDetails(variantId: string) {
    const response = await fetch(`${this.productServiceUrl}/api/products/variants/${variantId}`);
    
    if (!response.ok) {
      return null;
    }

    const responseData = await response.json();
    const variant = responseData.data || responseData;
    
    return {
      variant_name: variant.variant_name
    };
  }

  async getUserDefaultAddress(userId: string) {
    const addressServiceUrl = process.env.ADDRESS_SERVICE_URL || 'http://localhost:3009';
    
    const response = await fetch(
      `${addressServiceUrl}/api/addresses/user/${userId}/default`
    );
    
    if (!response.ok) {
      throw new Error(`No default address found for user ${userId}`);
    }

    const { data } = await response.json();
    return data;
  }
}