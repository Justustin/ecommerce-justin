import {
  calculateVariantPrice,
  calculateProfitMargin,
  calculateDiscountPercentage,
  checkStockAvailability,
  calculateVolumetricWeight,
  getShippingWeight,
  validateSKU,
  validateProductPricing,
  validateMOQ,
  generateProductSlug,
} from './product';

describe('product utilities', () => {
  describe('calculateVariantPrice', () => {
    it('should calculate variant price with positive adjustment', () => {
      expect(calculateVariantPrice(100000, 20000)).toBe(120000);
    });

    it('should calculate variant price with negative adjustment', () => {
      expect(calculateVariantPrice(100000, -10000)).toBe(90000);
    });

    it('should calculate variant price with zero adjustment', () => {
      expect(calculateVariantPrice(100000, 0)).toBe(100000);
    });

    it('should throw error for negative base price', () => {
      expect(() => calculateVariantPrice(-100, 50)).toThrow('Base price cannot be negative');
    });

    it('should throw error when final price is negative', () => {
      expect(() => calculateVariantPrice(50000, -60000)).toThrow(
        'Variant price cannot be negative'
      );
    });

    it('should handle large price adjustments', () => {
      expect(calculateVariantPrice(1000000, 500000)).toBe(1500000);
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate profit and margin correctly', () => {
      const result = calculateProfitMargin(150000, 100000);
      expect(result.profit).toBe(50000);
      expect(result.marginPercentage).toBe(50);
    });

    it('should return 0% margin when cost equals base price', () => {
      const result = calculateProfitMargin(100000, 100000);
      expect(result.profit).toBe(0);
      expect(result.marginPercentage).toBe(0);
    });

    it('should handle negative margin (selling at loss)', () => {
      const result = calculateProfitMargin(80000, 100000);
      expect(result.profit).toBe(-20000);
      expect(result.marginPercentage).toBe(-20);
    });

    it('should return 0 for negative base price', () => {
      const result = calculateProfitMargin(-100, 50);
      expect(result.profit).toBe(0);
      expect(result.marginPercentage).toBe(0);
    });

    it('should return 0 for negative cost price', () => {
      const result = calculateProfitMargin(100, -50);
      expect(result.profit).toBe(0);
      expect(result.marginPercentage).toBe(0);
    });

    it('should handle zero cost price', () => {
      const result = calculateProfitMargin(100000, 0);
      expect(result.profit).toBe(100000);
      expect(result.marginPercentage).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateProfitMargin(100000, 33333);
      expect(result.marginPercentage).toBe(200.01);
    });
  });

  describe('calculateDiscountPercentage', () => {
    it('should calculate discount percentage correctly', () => {
      expect(calculateDiscountPercentage(100000, 75000)).toBe(25);
    });

    it('should return 0 when no discount', () => {
      expect(calculateDiscountPercentage(100000, 100000)).toBe(0);
    });

    it('should return 0 when discounted price is higher', () => {
      expect(calculateDiscountPercentage(100000, 150000)).toBe(0);
    });

    it('should return 0 for zero or negative original price', () => {
      expect(calculateDiscountPercentage(0, 50)).toBe(0);
      expect(calculateDiscountPercentage(-100, 50)).toBe(0);
    });

    it('should return 0 for negative discounted price', () => {
      expect(calculateDiscountPercentage(100000, -50000)).toBe(0);
    });

    it('should calculate 50% discount', () => {
      expect(calculateDiscountPercentage(200000, 100000)).toBe(50);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateDiscountPercentage(100000, 66666)).toBe(33.33);
    });

    it('should handle 100% discount (free)', () => {
      expect(calculateDiscountPercentage(100000, 0)).toBe(100);
    });
  });

  describe('checkStockAvailability', () => {
    it('should return in stock when quantity available', () => {
      const result = checkStockAvailability(100, 10);
      expect(result.inStock).toBe(true);
      expect(result.availableQuantity).toBe(100);
      expect(result.canFulfillMOQ).toBe(true);
    });

    it('should return out of stock when quantity is 0', () => {
      const result = checkStockAvailability(0, 10);
      expect(result.inStock).toBe(false);
      expect(result.availableQuantity).toBe(0);
      expect(result.canFulfillMOQ).toBe(false);
    });

    it('should indicate cannot fulfill MOQ when stock is less than MOQ', () => {
      const result = checkStockAvailability(5, 10);
      expect(result.inStock).toBe(true);
      expect(result.availableQuantity).toBe(5);
      expect(result.canFulfillMOQ).toBe(false);
    });

    it('should handle exact MOQ match', () => {
      const result = checkStockAvailability(10, 10);
      expect(result.inStock).toBe(true);
      expect(result.availableQuantity).toBe(10);
      expect(result.canFulfillMOQ).toBe(true);
    });

    it('should handle negative stock as 0 available', () => {
      const result = checkStockAvailability(-5, 10);
      expect(result.inStock).toBe(false);
      expect(result.availableQuantity).toBe(0);
    });

    it('should handle large stock quantities', () => {
      const result = checkStockAvailability(10000, 100);
      expect(result.inStock).toBe(true);
      expect(result.availableQuantity).toBe(10000);
      expect(result.canFulfillMOQ).toBe(true);
    });
  });

  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight correctly', () => {
      // 30cm x 20cm x 10cm / 6000 = 1 kg
      expect(calculateVolumetricWeight(30, 20, 10)).toBe(1);
    });

    it('should use custom divisor', () => {
      // 30cm x 20cm x 10cm / 5000 = 1.2 kg
      expect(calculateVolumetricWeight(30, 20, 10, 5000)).toBe(1.2);
    });

    it('should round to 2 decimal places', () => {
      // 25cm x 15cm x 10cm / 6000 = 0.625 kg
      expect(calculateVolumetricWeight(25, 15, 10)).toBe(0.63);
    });

    it('should throw error for zero length', () => {
      expect(() => calculateVolumetricWeight(0, 20, 10)).toThrow(
        'Dimensions must be greater than 0'
      );
    });

    it('should throw error for zero width', () => {
      expect(() => calculateVolumetricWeight(30, 0, 10)).toThrow(
        'Dimensions must be greater than 0'
      );
    });

    it('should throw error for zero height', () => {
      expect(() => calculateVolumetricWeight(30, 20, 0)).toThrow(
        'Dimensions must be greater than 0'
      );
    });

    it('should throw error for negative dimensions', () => {
      expect(() => calculateVolumetricWeight(-30, 20, 10)).toThrow(
        'Dimensions must be greater than 0'
      );
    });

    it('should throw error for zero or negative divisor', () => {
      expect(() => calculateVolumetricWeight(30, 20, 10, 0)).toThrow(
        'Divisor must be greater than 0'
      );
      expect(() => calculateVolumetricWeight(30, 20, 10, -6000)).toThrow(
        'Divisor must be greater than 0'
      );
    });

    it('should handle small packages', () => {
      // 10cm x 10cm x 10cm / 6000 = 0.17 kg
      expect(calculateVolumetricWeight(10, 10, 10)).toBe(0.17);
    });

    it('should handle large packages', () => {
      // 100cm x 100cm x 100cm / 6000 = 166.67 kg
      expect(calculateVolumetricWeight(100, 100, 100)).toBe(166.67);
    });
  });

  describe('getShippingWeight', () => {
    it('should return actual weight when higher than volumetric', () => {
      expect(getShippingWeight(5, 2)).toBe(5);
    });

    it('should return volumetric weight when higher than actual', () => {
      expect(getShippingWeight(2, 5)).toBe(5);
    });

    it('should return same weight when equal', () => {
      expect(getShippingWeight(5, 5)).toBe(5);
    });

    it('should handle zero weights', () => {
      expect(getShippingWeight(0, 5)).toBe(5);
      expect(getShippingWeight(5, 0)).toBe(5);
      expect(getShippingWeight(0, 0)).toBe(0);
    });

    it('should throw error for negative actual weight', () => {
      expect(() => getShippingWeight(-1, 5)).toThrow('Weight cannot be negative');
    });

    it('should throw error for negative volumetric weight', () => {
      expect(() => getShippingWeight(5, -1)).toThrow('Weight cannot be negative');
    });

    it('should handle decimal weights', () => {
      expect(getShippingWeight(2.5, 3.7)).toBe(3.7);
    });
  });

  describe('validateSKU', () => {
    it('should pass for valid alphanumeric SKU', () => {
      const result = validateSKU('ABC123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for SKU with hyphens', () => {
      const result = validateSKU('ABC-123-XYZ');
      expect(result.valid).toBe(true);
    });

    it('should pass for numbers only', () => {
      const result = validateSKU('123456');
      expect(result.valid).toBe(true);
    });

    it('should pass for letters only', () => {
      const result = validateSKU('ABCDEF');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty SKU', () => {
      const result = validateSKU('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU is required');
    });

    it('should fail for whitespace only', () => {
      const result = validateSKU('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU is required');
    });

    it('should fail for SKU too short', () => {
      const result = validateSKU('AB');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU must be at least 3 characters');
    });

    it('should fail for SKU too long', () => {
      const result = validateSKU('A'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU must be at most 50 characters');
    });

    it('should fail for SKU with special characters', () => {
      const result = validateSKU('ABC@123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU must contain only letters, numbers, and hyphens');
    });

    it('should fail for SKU with spaces', () => {
      const result = validateSKU('ABC 123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU must contain only letters, numbers, and hyphens');
    });

    it('should fail for SKU with underscores', () => {
      const result = validateSKU('ABC_123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SKU must contain only letters, numbers, and hyphens');
    });
  });

  describe('validateProductPricing', () => {
    it('should pass for valid pricing', () => {
      const result = validateProductPricing(100000, 50000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass when base price equals cost price', () => {
      const result = validateProductPricing(100000, 100000);
      expect(result.valid).toBe(true);
    });

    it('should pass when cost price is undefined', () => {
      const result = validateProductPricing(100000);
      expect(result.valid).toBe(true);
    });

    it('should pass for zero cost price', () => {
      const result = validateProductPricing(100000, 0);
      expect(result.valid).toBe(true);
    });

    it('should fail for zero base price', () => {
      const result = validateProductPricing(0, 50000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Base price must be greater than 0');
    });

    it('should fail for negative base price', () => {
      const result = validateProductPricing(-100, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Base price must be greater than 0');
    });

    it('should fail for negative cost price', () => {
      const result = validateProductPricing(100000, -50000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cost price cannot be negative');
    });

    it('should fail when base price is less than cost price', () => {
      const result = validateProductPricing(50000, 100000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'Base price should be greater than or equal to cost price'
      );
    });
  });

  describe('validateMOQ', () => {
    it('should pass for valid MOQ', () => {
      const result = validateMOQ(10, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass when MOQ equals stock', () => {
      const result = validateMOQ(10, 10);
      expect(result.valid).toBe(true);
    });

    it('should pass when stock is undefined', () => {
      const result = validateMOQ(10);
      expect(result.valid).toBe(true);
    });

    it('should pass when stock is 0', () => {
      const result = validateMOQ(10, 0);
      expect(result.valid).toBe(true);
    });

    it('should fail for zero MOQ', () => {
      const result = validateMOQ(0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MOQ must be greater than 0');
    });

    it('should fail for negative MOQ', () => {
      const result = validateMOQ(-5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MOQ must be greater than 0');
    });

    it('should fail for non-integer MOQ', () => {
      const result = validateMOQ(10.5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MOQ must be a whole number');
    });

    it('should fail when MOQ exceeds stock', () => {
      const result = validateMOQ(100, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MOQ (100) cannot exceed available stock (50)');
    });

    it('should handle large MOQ values', () => {
      const result = validateMOQ(10000, 50000);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateProductSlug', () => {
    it('should generate slug from simple name', () => {
      expect(generateProductSlug('T-Shirt Cotton')).toBe('t-shirt-cotton');
    });

    it('should remove special characters', () => {
      expect(generateProductSlug('Product @ 50% off!')).toBe('product-50-off');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateProductSlug('My Product Name')).toBe('my-product-name');
    });

    it('should handle multiple spaces', () => {
      expect(generateProductSlug('Product   With   Spaces')).toBe('product-with-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateProductSlug('-Product Name-')).toBe('product-name');
    });

    it('should collapse multiple hyphens', () => {
      expect(generateProductSlug('Product---Name')).toBe('product-name');
    });

    it('should append SKU when provided', () => {
      expect(generateProductSlug('T-Shirt Cotton', 'ABC123')).toBe('t-shirt-cotton-abc123');
    });

    it('should handle SKU with hyphens', () => {
      expect(generateProductSlug('Product Name', 'ABC-123-XYZ')).toBe(
        'product-name-abc-123-xyz'
      );
    });

    it('should trim whitespace from name', () => {
      expect(generateProductSlug('  Product Name  ')).toBe('product-name');
    });

    it('should throw error for empty name', () => {
      expect(() => generateProductSlug('')).toThrow(
        'Product name is required for slug generation'
      );
    });

    it('should throw error for whitespace only name', () => {
      expect(() => generateProductSlug('   ')).toThrow(
        'Product name is required for slug generation'
      );
    });

    it('should handle Indonesian product names', () => {
      expect(generateProductSlug('Kaos Katun Premium')).toBe('kaos-katun-premium');
    });

    it('should handle names with numbers', () => {
      expect(generateProductSlug('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
    });

    it('should handle complex product names', () => {
      expect(generateProductSlug('Men\'s 100% Cotton T-Shirt (Blue)')).toBe(
        'mens-100-cotton-t-shirt-blue'
      );
    });
  });
});
