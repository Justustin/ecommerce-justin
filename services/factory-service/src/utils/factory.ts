/**
 * Factory utility functions for business logic
 */

export type FactoryStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/**
 * Generate a unique factory code
 * @param city - City name
 * @param ownerName - Owner name
 * @returns Factory code in format FACT-{CITY}-{OWNER}-{TIMESTAMP}
 */
export function generateFactoryCode(city: string, ownerName: string): string {
  if (!city || city.trim().length === 0) {
    throw new Error('City is required for factory code generation');
  }
  if (!ownerName || ownerName.trim().length === 0) {
    throw new Error('Owner name is required for factory code generation');
  }

  const cityCode = city.substring(0, 3).toUpperCase();
  const nameCode = ownerName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);

  return `FACT-${cityCode}-${nameCode}-${timestamp}`;
}

/**
 * Validate factory code format
 * @param factoryCode - The factory code to validate
 * @returns Validation result
 */
export function validateFactoryCode(factoryCode: string): { valid: boolean; error?: string } {
  if (!factoryCode || factoryCode.trim().length === 0) {
    return { valid: false, error: 'Factory code is required' };
  }

  // Expected format: FACT-XXX-XXX-XXXXXX
  const pattern = /^FACT-[A-Z]{1,3}-[A-Z]{1,3}-\d{6}$/;
  if (!pattern.test(factoryCode)) {
    return {
      valid: false,
      error: 'Factory code must match format: FACT-{CITY}-{OWNER}-{TIMESTAMP}',
    };
  }

  return { valid: true };
}

/**
 * Validate Indonesian business license number (NIB format)
 * NIB (Nomor Induk Berusaha) is 13 digits
 * @param licenseNumber - Business license number
 * @returns Validation result
 */
export function validateBusinessLicense(licenseNumber: string): { valid: boolean; error?: string } {
  if (!licenseNumber || licenseNumber.trim().length === 0) {
    return { valid: false, error: 'Business license number is required' };
  }

  // Remove spaces and hyphens
  const cleaned = licenseNumber.replace(/[\s-]/g, '');

  // NIB should be 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Business license (NIB) must be 13 digits',
    };
  }

  return { valid: true };
}

/**
 * Validate Indonesian tax ID (NPWP)
 * NPWP format: XX.XXX.XXX.X-XXX.XXX (15 digits)
 * @param taxId - Tax ID to validate
 * @returns Validation result
 */
export function validateTaxId(taxId: string): { valid: boolean; error?: string } {
  if (!taxId || taxId.trim().length === 0) {
    return { valid: false, error: 'Tax ID is required' };
  }

  // Remove dots and hyphens
  const cleaned = taxId.replace(/[.-]/g, '');

  // NPWP should be 15 digits
  if (!/^\d{15}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Tax ID (NPWP) must be 15 digits',
    };
  }

  return { valid: true };
}

/**
 * Validate Indonesian phone number
 * Formats: +62xxx, 08xxx, 62xxx
 * @param phoneNumber - Phone number to validate
 * @returns Validation result
 */
export function validatePhoneNumber(phoneNumber: string): { valid: boolean; error?: string } {
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

/**
 * Check if factory can be activated based on verification status
 * @param verificationStatus - Current verification status
 * @returns Object indicating if activation is allowed
 */
export function canActivateFactory(verificationStatus: VerificationStatus): {
  canActivate: boolean;
  reason?: string;
} {
  if (verificationStatus === 'verified') {
    return { canActivate: true };
  }

  return {
    canActivate: false,
    reason: `Factory must be verified before activation (current status: ${verificationStatus})`,
  };
}

/**
 * Validate factory status transition
 * @param currentStatus - Current factory status
 * @param newStatus - Desired new status
 * @param verificationStatus - Current verification status
 * @returns Validation result
 */
export function validateStatusTransition(
  currentStatus: FactoryStatus,
  newStatus: FactoryStatus,
  verificationStatus: VerificationStatus
): { valid: boolean; error?: string } {
  // Can't activate unverified factories
  if (newStatus === 'active' && verificationStatus !== 'verified') {
    return {
      valid: false,
      error: 'Cannot activate unverified factory. Factory must be verified first.',
    };
  }

  // Can't transition from suspended to active directly (must go through pending review)
  if (currentStatus === 'suspended' && newStatus === 'active') {
    return {
      valid: false,
      error: 'Suspended factories must be reviewed (set to pending) before reactivation',
    };
  }

  // Can't suspend pending factories (must activate or reject first)
  if (currentStatus === 'pending' && newStatus === 'suspended') {
    return {
      valid: false,
      error: 'Pending factories cannot be suspended. Activate or set to inactive instead.',
    };
  }

  return { valid: true };
}

/**
 * Calculate factory performance rating based on metrics
 * @param orderFulfillmentRate - Percentage of orders fulfilled on time (0-100)
 * @param qualityScore - Quality rating from reviews (0-5)
 * @param responseTimeHours - Average response time in hours
 * @returns Performance rating (0-5 stars) and category
 */
export function calculatePerformanceRating(
  orderFulfillmentRate: number,
  qualityScore: number,
  responseTimeHours: number
): { rating: number; category: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent' } {
  if (orderFulfillmentRate < 0 || orderFulfillmentRate > 100) {
    throw new Error('Order fulfillment rate must be between 0 and 100');
  }
  if (qualityScore < 0 || qualityScore > 5) {
    throw new Error('Quality score must be between 0 and 5');
  }
  if (responseTimeHours < 0) {
    throw new Error('Response time cannot be negative');
  }

  // Weighted scoring:
  // - Order fulfillment: 40%
  // - Quality score: 40%
  // - Response time: 20%

  const fulfillmentScore = (orderFulfillmentRate / 100) * 5; // Convert to 0-5 scale
  const responseScore = calculateResponseScore(responseTimeHours);

  const rating =
    fulfillmentScore * 0.4 +
    qualityScore * 0.4 +
    responseScore * 0.2;

  const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal

  let category: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  if (roundedRating >= 4.5) category = 'Excellent';
  else if (roundedRating >= 3.5) category = 'Very Good';
  else if (roundedRating >= 2.5) category = 'Good';
  else if (roundedRating >= 1.5) category = 'Fair';
  else category = 'Poor';

  return { rating: roundedRating, category };
}

/**
 * Calculate response time score (0-5)
 * @param responseTimeHours - Average response time in hours
 * @returns Score from 0 to 5
 */
function calculateResponseScore(responseTimeHours: number): number {
  if (responseTimeHours <= 1) return 5;
  if (responseTimeHours <= 3) return 4;
  if (responseTimeHours <= 6) return 3;
  if (responseTimeHours <= 12) return 2;
  if (responseTimeHours <= 24) return 1;
  return 0;
}

/**
 * Validate factory postal code (Indonesian format)
 * @param postalCode - Postal code to validate
 * @returns Validation result
 */
export function validatePostalCode(postalCode: string): { valid: boolean; error?: string } {
  if (!postalCode || postalCode.trim().length === 0) {
    return { valid: false, error: 'Postal code is required' };
  }

  // Indonesian postal codes are 5 digits
  if (!/^\d{5}$/.test(postalCode)) {
    return {
      valid: false,
      error: 'Postal code must be 5 digits',
    };
  }

  return { valid: true };
}

/**
 * Check if factory meets verification requirements
 * @param hasBusinessLicense - Whether business license is provided
 * @param hasTaxId - Whether tax ID is provided
 * @param hasLogoUrl - Whether logo is uploaded
 * @returns Object indicating if factory can be verified
 */
export function meetsVerificationRequirements(
  hasBusinessLicense: boolean,
  hasTaxId: boolean,
  hasLogoUrl: boolean
): { meetsRequirements: boolean; missingItems: string[] } {
  const missingItems: string[] = [];

  if (!hasBusinessLicense) missingItems.push('Business license');
  if (!hasTaxId) missingItems.push('Tax ID (NPWP)');
  if (!hasLogoUrl) missingItems.push('Factory logo');

  return {
    meetsRequirements: missingItems.length === 0,
    missingItems,
  };
}
