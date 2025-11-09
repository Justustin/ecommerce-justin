import { group_status } from "@repo/database";

export interface CreateGroupSessionDTO {
  productId: string;
  factoryId: string;
  sessionCode?: string;
  targetMoq: number;
  groupPrice: number;
  startTime?: Date;
  endTime: Date;
  estimatedCompletionDate?: Date;
  // TIERING SYSTEM: Price tiers at different MOQ fill percentages
  priceTier25?: number;             // Price at 25% MOQ (highest)
  priceTier50?: number;             // Price at 50% MOQ
  priceTier75?: number;             // Price at 75% MOQ
  priceTier100?: number;            // Price at 100% MOQ (lowest)
  currentTier?: number;             // Current active tier: 25, 50, 75, or 100
}

export interface UpdateGroupSessionDTO {
  endTime?: Date;
  groupPrice?: number;
  targetMoq?: number;
  status?: group_status;
  estimatedCompletionDate?: Date | null;
}

export interface JoinGroupDTO {
  groupSessionId: string;
  userId: string;
  quantity: number;
  variantId?: string;              
  unitPrice: number;              
  totalPrice: number;               
}

export interface GroupSessionFilters {
  status?: 'forming' | 'active' | 'moq_reached' | 'success' | 'failed' | 'cancelled';
  factoryId?: string;
  productId?: string;
  activeOnly?: boolean;             
  search?: string;                  
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ParticipantStats {
  participantCount: number;
  totalQuantity: number;
  totalRevenue: number;
}

// ============================================================================
// NEW: Grosir Bundle-Based Allocation System
// ============================================================================

export interface GrosirBundleConfig {
  id: string;
  productId: string;
  variantId: string | null;
  unitsPerBundle: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrosirWarehouseTolerance {
  id: string;
  productId: string;
  variantId: string | null;
  maxExcessUnits: number;
  clearanceRateEstimate: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantAvailabilityResult {
  variantId: string | null;
  unitsPerBundle: number;
  maxExcessUnits: number;
  currentOrdered: number;
  totalOrderedAllVariants: number;
  bundlesNeeded: number;
  maxBundlesAllowed: number;
  maxCanOrder: number;
  available: number;
  isLocked: boolean;
  constrainingVariant: string | null;
  excessIfOrdered: Record<string, number>;  // Excess per variant if order is placed
  moqProgress: number;  // Percentage of MOQ filled (0-100)
}

export interface BundleConstraintInfo {
  variantId: string | null;
  currentOrdered: number;
  bundlesNeeded: number;
  willProduce: number;
  excess: number;
  exceedsTolerance: boolean;
}

// Request DTOs for admin configuration
export interface CreateBundleConfigDTO {
  productId: string;
  variants: Array<{
    variantId: string | null;  // null for base product
    unitsPerBundle: number;
    notes?: string;
  }>;
}

export interface CreateWarehouseToleranceDTO {
  productId: string;
  variants: Array<{
    variantId: string | null;
    maxExcessUnits: number;
    clearanceRateEstimate?: number;
    notes?: string;
  }>;
}