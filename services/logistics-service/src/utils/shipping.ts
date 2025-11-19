/**
 * Shipping and logistics utility functions
 */

export interface CourierRate {
  courier_code: string;
  courier_name: string;
  courier_service_name: string;
  duration: string;
  price: number;
  available_for_cash_on_delivery: boolean;
  available_for_insurance: boolean;
}

/**
 * Calculate volumetric weight for shipping
 * @param lengthCm - Length in centimeters
 * @param widthCm - Width in centimeters
 * @param heightCm - Height in centimeters
 * @param divisor - Volumetric divisor (default 6000 for most couriers in Indonesia)
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
  return Math.round(volumetricWeight * 100) / 100;
}

/**
 * Determine billable shipping weight (higher of actual or volumetric)
 * @param actualWeightKg - Actual weight in kilograms
 * @param volumetricWeightKg - Volumetric weight in kilograms
 * @returns The billable shipping weight
 */
export function getBillableWeight(
  actualWeightKg: number,
  volumetricWeightKg: number
): number {
  if (actualWeightKg < 0 || volumetricWeightKg < 0) {
    throw new Error('Weight cannot be negative');
  }
  return Math.max(actualWeightKg, volumetricWeightKg);
}

/**
 * Calculate insurance fee based on item value
 * @param itemValue - Total value of items in IDR
 * @param insuranceRate - Insurance rate as percentage (default 0.2%)
 * @returns Insurance fee in IDR
 */
export function calculateInsuranceFee(
  itemValue: number,
  insuranceRate: number = 0.2
): number {
  if (itemValue < 0) {
    throw new Error('Item value cannot be negative');
  }
  if (insuranceRate < 0 || insuranceRate > 100) {
    throw new Error('Insurance rate must be between 0 and 100');
  }

  const fee = (itemValue * insuranceRate) / 100;
  return Math.round(fee);
}

/**
 * Calculate COD (Cash on Delivery) fee
 * @param codAmount - COD amount in IDR
 * @param codRate - COD rate as percentage (default 2%)
 * @param minFee - Minimum COD fee (default 5000 IDR)
 * @returns COD fee in IDR
 */
export function calculateCODFee(
  codAmount: number,
  codRate: number = 2,
  minFee: number = 5000
): number {
  if (codAmount < 0) {
    throw new Error('COD amount cannot be negative');
  }
  if (codRate < 0 || codRate > 100) {
    throw new Error('COD rate must be between 0 and 100');
  }

  const fee = (codAmount * codRate) / 100;
  return Math.max(Math.round(fee), minFee);
}

/**
 * Find the cheapest courier option from rates
 * @param rates - Array of courier rates
 * @returns Cheapest rate option or null if no rates
 */
export function findCheapestRate(rates: CourierRate[]): CourierRate | null {
  if (!rates || rates.length === 0) {
    return null;
  }

  return rates.reduce((cheapest, current) => {
    return current.price < cheapest.price ? current : cheapest;
  });
}

/**
 * Find the fastest courier option from rates
 * @param rates - Array of courier rates
 * @returns Fastest rate option or null if no rates
 */
export function findFastestRate(rates: CourierRate[]): CourierRate | null {
  if (!rates || rates.length === 0) {
    return null;
  }

  return rates.reduce((fastest, current) => {
    const currentDays = parseDurationToDays(current.duration);
    const fastestDays = parseDurationToDays(fastest.duration);
    return currentDays < fastestDays ? current : fastest;
  });
}

/**
 * Parse duration string to days (for comparison)
 * @param duration - Duration string like "1-2 days", "2-3 hari", "3 days"
 * @returns Minimum number of days
 */
export function parseDurationToDays(duration: string): number {
  if (!duration) return 999; // Return high value for invalid duration

  // Extract first number from string
  const match = duration.match(/\d+/);
  return match ? parseInt(match[0]) : 999;
}

/**
 * Calculate estimated delivery date
 * @param durationString - Duration string like "1-2 days"
 * @param orderDate - Order date (default: now)
 * @returns Estimated delivery date
 */
export function calculateEstimatedDeliveryDate(
  durationString: string,
  orderDate: Date = new Date()
): Date {
  const days = parseDurationToDays(durationString);
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + days);
  return deliveryDate;
}

/**
 * Validate Indonesian postal code
 * @param postalCode - Postal code to validate
 * @returns Validation result
 */
export function validatePostalCode(postalCode: string): { valid: boolean; error?: string } {
  if (!postalCode || postalCode.trim().length === 0) {
    return { valid: false, error: 'Postal code is required' };
  }

  // Indonesian postal codes are 5 digits
  if (!/^\d{5}$/.test(postalCode)) {
    return { valid: false, error: 'Postal code must be 5 digits' };
  }

  return { valid: true };
}

/**
 * Normalize tracking status from different couriers
 * @param status - Raw status from courier
 * @returns Normalized status
 */
export function normalizeTrackingStatus(status: string):
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned' {
  const lowerStatus = status.toLowerCase();

  if (lowerStatus.includes('delivered') || lowerStatus.includes('received')) {
    return 'delivered';
  }
  if (lowerStatus.includes('out for delivery') || lowerStatus.includes('on delivery')) {
    return 'out_for_delivery';
  }
  if (lowerStatus.includes('in transit') || lowerStatus.includes('on the way')) {
    return 'in_transit';
  }
  if (lowerStatus.includes('picked') || lowerStatus.includes('picked up')) {
    return 'picked_up';
  }
  if (lowerStatus.includes('failed') || lowerStatus.includes('failed delivery')) {
    return 'failed';
  }
  if (lowerStatus.includes('returned') || lowerStatus.includes('return')) {
    return 'returned';
  }

  return 'pending';
}

/**
 * Calculate total shipping cost including fees
 * @param baseShippingCost - Base shipping cost from courier
 * @param insuranceFee - Insurance fee (optional)
 * @param codFee - COD fee (optional)
 * @returns Total shipping cost
 */
export function calculateTotalShippingCost(
  baseShippingCost: number,
  insuranceFee: number = 0,
  codFee: number = 0
): number {
  if (baseShippingCost < 0) {
    throw new Error('Base shipping cost cannot be negative');
  }
  if (insuranceFee < 0) {
    throw new Error('Insurance fee cannot be negative');
  }
  if (codFee < 0) {
    throw new Error('COD fee cannot be negative');
  }

  return baseShippingCost + insuranceFee + codFee;
}

/**
 * Filter courier rates by available features
 * @param rates - Array of courier rates
 * @param requireCOD - Require COD availability
 * @param requireInsurance - Require insurance availability
 * @returns Filtered rates
 */
export function filterRatesByFeatures(
  rates: CourierRate[],
  requireCOD: boolean = false,
  requireInsurance: boolean = false
): CourierRate[] {
  return rates.filter(rate => {
    if (requireCOD && !rate.available_for_cash_on_delivery) {
      return false;
    }
    if (requireInsurance && !rate.available_for_insurance) {
      return false;
    }
    return true;
  });
}

/**
 * Check if shipment is overdue based on estimated delivery
 * @param estimatedDeliveryDate - Estimated delivery date
 * @param currentDate - Current date (default: now)
 * @returns Object indicating if overdue and by how many days
 */
export function isShipmentOverdue(
  estimatedDeliveryDate: Date,
  currentDate: Date = new Date()
): { isOverdue: boolean; daysOverdue: number } {
  const timeDiff = currentDate.getTime() - estimatedDeliveryDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return {
    isOverdue: daysDiff > 0,
    daysOverdue: daysDiff > 0 ? daysDiff : 0,
  };
}

/**
 * Validate phone number for shipping contact
 * @param phoneNumber - Phone number to validate
 * @returns Validation result
 */
export function validateShippingPhone(phoneNumber: string): { valid: boolean; error?: string } {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove spaces and hyphens
  const cleaned = phoneNumber.replace(/[\s-]/g, '');

  // Check Indonesian formats
  if (!/^(\+62|62|0)8\d{8,11}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Phone number must be a valid Indonesian number (e.g., +628xxx, 08xxx)',
    };
  }

  return { valid: true };
}
