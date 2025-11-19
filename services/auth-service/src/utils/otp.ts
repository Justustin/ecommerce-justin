// OTP generation and validation utilities

export function generateOTP(length: number = 6): string {
  if (length < 4 || length > 8) {
    throw new Error('OTP length must be between 4 and 8');
  }

  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    otp += digits[randomIndex];
  }

  return otp;
}

export function isOTPExpired(createdAt: Date, expiryMinutes: number = 5): boolean {
  const now = new Date();
  const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  return now > expiryTime;
}

export function validateOTPFormat(otp: string): { valid: boolean; error?: string } {
  if (!otp) {
    return { valid: false, error: 'OTP is required' };
  }

  if (!/^\d+$/.test(otp)) {
    return { valid: false, error: 'OTP must contain only digits' };
  }

  if (otp.length < 4 || otp.length > 8) {
    return { valid: false, error: 'OTP must be 4-8 digits' };
  }

  return { valid: true };
}

export function getOTPExpirySeconds(createdAt: Date, expiryMinutes: number = 5): number {
  const now = new Date();
  const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  const diff = expiryTime.getTime() - now.getTime();
  return Math.floor(diff / 1000);
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 4) return phoneNumber;

  const countryCode = phoneNumber.substring(0, 3); // +62
  const lastFour = phoneNumber.substring(phoneNumber.length - 4);
  const masked = '*'.repeat(phoneNumber.length - 7);

  return `${countryCode}${masked}${lastFour}`;
}
