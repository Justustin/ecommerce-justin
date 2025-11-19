// Order processing utilities

export function calculateOrderTotal(
  items: Array<{ price: number; quantity: number }>,
  shippingCost: number = 0
): number {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return subtotal + shippingCost;
}

export function validateOrderItems(
  items: Array<{ quantity: number; stock: number }>
): { valid: boolean; error?: string } {
  if (!items || items.length === 0) {
    return { valid: false, error: 'Order must contain at least one item' };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.quantity <= 0) {
      return { valid: false, error: `Item ${i + 1}: quantity must be positive` };
    }

    if (item.quantity > item.stock) {
      return {
        valid: false,
        error: `Item ${i + 1}: requested ${item.quantity} but only ${item.stock} in stock`,
      };
    }
  }

  return { valid: true };
}

export function canCancelOrder(
  orderStatus: string,
  createdAt: Date,
  cancelWindowHours: number = 24
): { canCancel: boolean; reason?: string } {
  const validCancelStatuses = ['pending', 'confirmed', 'payment_pending'];

  if (!validCancelStatuses.includes(orderStatus)) {
    return {
      canCancel: false,
      reason: `Cannot cancel order with status: ${orderStatus}`,
    };
  }

  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > cancelWindowHours) {
    return {
      canCancel: false,
      reason: `Cancel window expired (${cancelWindowHours} hours)`,
    };
  }

  return { canCancel: true };
}

export function calculateRefundAmount(
  orderTotal: number,
  cancellationFeePercentage: number = 0
): number {
  if (orderTotal < 0) return 0;
  if (cancellationFeePercentage < 0) return orderTotal;
  if (cancellationFeePercentage > 100) return 0;

  const fee = orderTotal * (cancellationFeePercentage / 100);
  return Math.round(orderTotal - fee);
}

export function getEstimatedDeliveryDays(
  shippingMethod: string
): number {
  const deliveryTimes: Record<string, number> = {
    'express': 1,
    'regular': 3,
    'economy': 7,
    'same-day': 0,
  };

  return deliveryTimes[shippingMethod.toLowerCase()] || 3;
}
