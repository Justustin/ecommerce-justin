/**
 * Product utility functions for business logic
 */

/**
 * Calculate the final price of a product variant
 * @param basePrice - The base price of the main product
 * @param priceAdjustment - The price adjustment for the variant (can be positive or negative)
 * @returns The final price of the variant
 */
export function calculateVariantPrice(
  basePrice: number,
  priceAdjustment: number
): number {
  if (basePrice < 0) {
    throw new Error('Base price cannot be negative');
  }
  const finalPrice = basePrice + priceAdjustment;
  if (finalPrice < 0) {
    throw new Error('Variant price cannot be negative');
  }
  return finalPrice;
}

/**
 * Calculate profit margin for a product
 * @param basePrice - The selling price
 * @param costPrice - The cost price
 * @returns Object with profit amount and margin percentage
 */
export function calculateProfitMargin(
  basePrice: number,
  costPrice: number
): { profit: number; marginPercentage: number } {
  if (basePrice < 0 || costPrice < 0) {
    return { profit: 0, marginPercentage: 0 };
  }

  const profit = basePrice - costPrice;
  const marginPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return {
    profit: Math.round(profit),
    marginPercentage: Math.round(marginPercentage * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Calculate discount percentage between two prices
 * @param originalPrice - The original price
 * @param discountedPrice - The discounted price
 * @returns The discount percentage
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  discountedPrice: number
): number {
  if (originalPrice <= 0) return 0;
  if (discountedPrice < 0) return 0;
  if (discountedPrice >= originalPrice) return 0;

  const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
  return Math.round(discount * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if a product is in stock
 * @param stockQuantity - Current stock quantity
 * @param moq - Minimum order quantity
 * @returns Object indicating if in stock and available quantity
 */
export function checkStockAvailability(
  stockQuantity: number,
  moq: number
): { inStock: boolean; availableQuantity: number; canFulfillMOQ: boolean } {
  const inStock = stockQuantity > 0;
  const canFulfillMOQ = stockQuantity >= moq;

  return {
    inStock,
    availableQuantity: Math.max(0, stockQuantity),
    canFulfillMOQ,
  };
}

/**
 * Calculate volumetric weight for shipping
 * @param lengthCm - Length in centimeters
 * @param widthCm - Width in centimeters
 * @param heightCm - Height in centimeters
 * @param divisor - Volumetric divisor (default 6000 for domestic shipping)
 * @returns Volumetric weight in kilograms
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number = 6000
): number {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    throw new Error('Dimensions must be greater than 0');
  }
  if (divisor <= 0) {
    throw new Error('Divisor must be greater than 0');
  }

  const volumetricWeight = (lengthCm * widthCm * heightCm) / divisor;
  return Math.round(volumetricWeight * 100) / 100; // Round to 2 decimal places
}

/**
 * Determine shipping weight (higher of actual or volumetric weight)
 * @param actualWeightKg - Actual weight in kilograms
 * @param volumetricWeightKg - Volumetric weight in kilograms
 * @returns The billable shipping weight
 */
export function getShippingWeight(
  actualWeightKg: number,
  volumetricWeightKg: number
): number {
  if (actualWeightKg < 0 || volumetricWeightKg < 0) {
    throw new Error('Weight cannot be negative');
  }
  return Math.max(actualWeightKg, volumetricWeightKg);
}

/**
 * Validate SKU format (alphanumeric with optional hyphens)
 * @param sku - The SKU to validate
 * @returns Validation result
 */
export function validateSKU(sku: string): { valid: boolean; error?: string } {
  if (!sku || sku.trim().length === 0) {
    return { valid: false, error: 'SKU is required' };
  }

  if (sku.length < 3) {
    return { valid: false, error: 'SKU must be at least 3 characters' };
  }

  if (sku.length > 50) {
    return { valid: false, error: 'SKU must be at most 50 characters' };
  }

  // Allow alphanumeric and hyphens only
  if (!/^[A-Za-z0-9-]+$/.test(sku)) {
    return { valid: false, error: 'SKU must contain only letters, numbers, and hyphens' };
  }

  return { valid: true };
}

/**
 * Validate product pricing
 * @param basePrice - The base selling price
 * @param costPrice - The cost price (optional)
 * @returns Validation result
 */
export function validateProductPricing(
  basePrice: number,
  costPrice?: number
): { valid: boolean; error?: string } {
  if (basePrice <= 0) {
    return { valid: false, error: 'Base price must be greater than 0' };
  }

  if (costPrice !== undefined && costPrice < 0) {
    return { valid: false, error: 'Cost price cannot be negative' };
  }

  if (costPrice !== undefined && basePrice < costPrice) {
    return { valid: false, error: 'Base price should be greater than or equal to cost price' };
  }

  return { valid: true };
}

/**
 * Validate minimum order quantity
 * @param moq - Minimum order quantity
 * @param stockQuantity - Available stock quantity
 * @returns Validation result
 */
export function validateMOQ(
  moq: number,
  stockQuantity?: number
): { valid: boolean; error?: string } {
  if (moq <= 0) {
    return { valid: false, error: 'MOQ must be greater than 0' };
  }

  if (!Number.isInteger(moq)) {
    return { valid: false, error: 'MOQ must be a whole number' };
  }

  if (stockQuantity !== undefined && stockQuantity > 0 && moq > stockQuantity) {
    return {
      valid: false,
      error: `MOQ (${moq}) cannot exceed available stock (${stockQuantity})`
    };
  }

  return { valid: true };
}

/**
 * Generate a URL-friendly slug from product name
 * @param name - The product name
 * @param sku - Optional SKU to append for uniqueness
 * @returns URL-friendly slug
 */
export function generateProductSlug(name: string, sku?: string): string {
  if (!name || name.trim().length === 0) {
    throw new Error('Product name is required for slug generation');
  }

  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  if (sku) {
    slug += `-${sku.toLowerCase()}`;
  }

  return slug;
}
