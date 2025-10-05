export interface CreateGroupSessionDTO {
  productId: string;
  factoryId: string;
  sessionCode?: string;            
  targetMoq: number;
  groupPrice: number;               
  startTime?: Date;                
  endTime: Date;                     
  estimatedCompletionDate?: Date;    
}

export interface UpdateGroupSessionDTO {
  endTime?: Date;
  groupPrice?: number;
  targetMoq?: number;
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