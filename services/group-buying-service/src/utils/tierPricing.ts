// Tier pricing calculation utilities

export function calculateTierPrice(
  basePrice: number,
  tier1Price: number,
  tier2Price: number,
  tier3Price: number,
  currentQuantity: number,
  moq: number
): number {
  const percentage = (currentQuantity / moq) * 100;

  if (percentage >= 100) return tier3Price;
  if (percentage >= 75) return tier2Price;
  if (percentage >= 50) return tier1Price;
  return basePrice;
}

export function calculateRefundAmount(
  oldPrice: number,
  newPrice: number,
  quantity: number
): number {
  return (oldPrice - newPrice) * quantity;
}

export function getTierPercentage(currentQuantity: number, moq: number): number {
  return (currentQuantity / moq) * 100;
}

export function determineCurrentTier(percentage: number): string {
  if (percentage >= 100) return 'tier_3';
  if (percentage >= 75) return 'tier_2';
  if (percentage >= 50) return 'tier_1';
  return 'base';
}
