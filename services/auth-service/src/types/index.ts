

export interface UserResponseDTO {
    userId: string;
    phoneNumber: string;
    firstName: string;
    lastName: string | null;
    role: string;
}

export interface SendOTPResult{
    success: boolean;
    message?: string;
    error?: string;
}
