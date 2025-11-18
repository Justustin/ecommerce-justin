// Bundle allocation calculation utilities

export function calculateBundlesNeeded(
  quantity: number,
  bundleSize: number,
  tolerancePercentage: number
): number {
  const exactBundles = quantity / bundleSize;
  const tolerance = (tolerancePercentage / 100) * bundleSize;
  const adjustedQuantity = quantity + tolerance;

  return Math.ceil(adjustedQuantity / bundleSize);
}

export function canFulfillDemand(
  requestedQuantity: number,
  bundleSize: number,
  availableBundles: number,
  tolerancePercentage: number
): boolean {
  const bundlesNeeded = calculateBundlesNeeded(requestedQuantity, bundleSize, tolerancePercentage);
  return bundlesNeeded <= availableBundles;
}

export function calculateActualQuantityReceived(
  bundlesAllocated: number,
  bundleSize: number
): number {
  return bundlesAllocated * bundleSize;
}

export function calculateWastage(
  requestedQuantity: number,
  bundlesAllocated: number,
  bundleSize: number
): number {
  const actualReceived = calculateActualQuantityReceived(bundlesAllocated, bundleSize);
  return actualReceived - requestedQuantity;
}
