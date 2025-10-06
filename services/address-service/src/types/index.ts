export interface CreateAddressDTO {
  userId: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  addressLine: string;
  notes?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDTO {
  label?: string;
  recipientName?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  addressLine?: string;
  notes?: string;
  isDefault?: boolean;
}