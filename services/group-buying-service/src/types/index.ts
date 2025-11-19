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