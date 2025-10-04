// Factory DTOs - FIXED to match actual database schema
export interface CreateFactoryDTO {
  ownerId: string;
  officeId?: string; // Optional office assignment
  factoryCode: string;
  factoryName: string;
  businessLicenseNumber?: string;
  businessLicensePhotoUrl?: string;
  taxId?: string;
  phoneNumber: string;
  email?: string;
  province: string;
  city: string;
  district: string;
  postalCode?: string;
  addressLine: string;
  logoUrl?: string;
  description?: string;
}

export interface UpdateFactoryDTO {
  factoryName?: string;
  businessLicenseNumber?: string;
  businessLicensePhotoUrl?: string;
  taxId?: string;
  phoneNumber?: string;
  email?: string;
  province?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  addressLine?: string;
  logoUrl?: string;
  description?: string;
}

export interface VerifyFactoryDTO {
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedBy?: string; // Admin user ID
  verificationNotes?: string;
}

export interface UpdateFactoryStatusDTO {
  status: 'pending' | 'active' | 'suspended' | 'inactive';
}

export interface AssignOfficeDTO {
  officeId: string;
}

export interface FactoryFilters {
  status?: 'pending' | 'active' | 'suspended' | 'inactive';
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  city?: string;
  province?: string;
  district?: string;
  officeId?: string;
  search?: string; // Search by name or code
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