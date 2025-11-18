// Withdrawal fee calculation utilities
export const WITHDRAWAL_FEE = 2500; // Flat fee in IDR

export function calculateWithdrawalFee(amount: number): number {
  return WITHDRAWAL_FEE;
}

export function calculateNetAmount(amount: number): number {
  return amount - WITHDRAWAL_FEE;
}

export function validateWithdrawalAmount(amount: number, balance: number): {
  valid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < 10000) {
    return { valid: false, error: 'Minimum withdrawal is Rp 10,000' };
  }

  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  const netAmount = calculateNetAmount(amount);
  if (netAmount <= 0) {
    return { valid: false, error: 'Amount must cover withdrawal fee' };
  }

  return { valid: true };
}
