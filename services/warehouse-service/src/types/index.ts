export interface FulfillDemandDTO {
    productId: string;
    variantId?: string;
    quantity: number; // The total demand from the group buy session
    wholesaleUnit: number; // DEPRECATED: Use bundle-based system instead
}

/**
 * NEW: Bundle-based demand fulfillment
 * Handles all variants together considering factory bundle constraints
 */
export interface FulfillBundleDemandDTO {
    productId: string;
    sessionId: string;
    variantDemands: {
        variantId: string | null;
        quantity: number;
    }[];
}

export interface BundleConfig {
    variantId: string | null;
    unitsPerBundle: number;
}

export interface WarehouseTolerance {
    variantId: string | null;
    maxExcessUnits: number;
}
