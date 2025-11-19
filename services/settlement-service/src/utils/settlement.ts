// Settlement calculation utilities

export function calculateFactoryPayout(
  orderTotal: number,
  platformFeePercentage: number = 10
): { factoryAmount: number; platformFee: number } {
  if (orderTotal < 0) {
    return { factoryAmount: 0, platformFee: 0 };
  }

  if (platformFeePercentage < 0 || platformFeePercentage > 100) {
    return { factoryAmount: orderTotal, platformFee: 0 };
  }

  const platformFee = Math.round(orderTotal * (platformFeePercentage / 100));
  const factoryAmount = orderTotal - platformFee;

  return { factoryAmount, platformFee };
}

export function canProcessSettlement(
  settlementStatus: string,
  orderStatus: string,
  daysSinceCompletion: number,
  minDays: number = 7
): { canProcess: boolean; reason?: string } {
  if (settlementStatus === 'paid') {
    return { canProcess: false, reason: 'Settlement already paid' };
  }

  if (settlementStatus === 'processing') {
    return { canProcess: false, reason: 'Settlement already processing' };
  }

  if (orderStatus !== 'completed' && orderStatus !== 'delivered') {
    return {
      canProcess: false,
      reason: `Order must be completed/delivered, current status: ${orderStatus}`,
    };
  }

  if (daysSinceCompletion < minDays) {
    return {
      canProcess: false,
      reason: `Must wait ${minDays} days after completion (currently ${daysSinceCompletion} days)`,
    };
  }

  return { canProcess: true };
}

export function calculateBatchSettlementTotal(
  settlements: Array<{ amount: number; status: string }>
): number {
  return settlements
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);
}

export function validateBankDetails(bank: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}): { valid: boolean; error?: string } {
  if (!bank.bankCode || bank.bankCode.trim() === '') {
    return { valid: false, error: 'Bank code is required' };
  }

  if (!bank.accountNumber || bank.accountNumber.trim() === '') {
    return { valid: false, error: 'Account number is required' };
  }

  if (!/^\d+$/.test(bank.accountNumber)) {
    return { valid: false, error: 'Account number must contain only digits' };
  }

  if (bank.accountNumber.length < 8 || bank.accountNumber.length > 20) {
    return { valid: false, error: 'Account number must be 8-20 digits' };
  }

  if (!bank.accountName || bank.accountName.trim() === '') {
    return { valid: false, error: 'Account name is required' };
  }

  if (bank.accountName.length < 3) {
    return { valid: false, error: 'Account name too short' };
  }

  return { valid: true };
}

export function getNextSettlementDate(lastSettlementDate: Date): Date {
  // Settlements are processed weekly (every Friday)
  const nextDate = new Date(lastSettlementDate);
  nextDate.setDate(nextDate.getDate() + 7);

  // If it falls on weekend, move to next Friday
  const dayOfWeek = nextDate.getDay();
  if (dayOfWeek !== 5) {
    // 5 = Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    nextDate.setDate(nextDate.getDate() + daysUntilFriday);
  }

  return nextDate;
}
