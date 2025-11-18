// Bot participant logic utilities

export function shouldBotJoin(
  currentQuantity: number,
  moq: number,
  minutesUntilExpiry: number
): boolean {
  const percentage = (currentQuantity / moq) * 100;
  return percentage < 25 && minutesUntilExpiry <= 10;
}

export function calculateBotQuantity(
  currentQuantity: number,
  moq: number
): number {
  const targetQuantity = Math.ceil(moq * 0.25);
  const needed = targetQuantity - currentQuantity;
  return Math.max(0, needed);
}

export function isSessionNearExpiration(expiresAt: Date): boolean {
  const now = new Date();
  const minutesRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
  return minutesRemaining <= 10 && minutesRemaining > 0;
}

export function getMinutesUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  return Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
}
