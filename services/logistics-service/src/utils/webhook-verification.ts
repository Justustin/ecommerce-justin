import crypto from 'crypto';

/**
 * Biteship Webhook Verification Utility
 *
 * IMPORTANT: Configure based on Biteship's official documentation
 * https://biteship.com/en/docs/api/webhook
 *
 * Common webhook verification methods:
 * 1. HMAC-SHA256 signature (like Xendit, Stripe)
 * 2. API key/secret in header
 * 3. IP whitelisting
 *
 * This implementation supports HMAC-SHA256 verification.
 * If Biteship uses a different method, update this file accordingly.
 */

export class BiteshipWebhookVerification {
  /**
   * Verify Biteship webhook using HMAC-SHA256
   *
   * @param payload - The webhook payload as JSON string
   * @param signature - The signature from webhook header (e.g., x-biteship-signature)
   * @param secret - Your Biteship webhook secret
   * @returns boolean indicating if signature is valid
   *
   * Usage in controller:
   * ```typescript
   * const payload = JSON.stringify(req.body);
   * const signature = req.headers['x-biteship-signature'] as string;
   * const secret = process.env.BITESHIP_WEBHOOK_SECRET;
   *
   * if (!BiteshipWebhookVerification.verifySignature(payload, signature, secret)) {
   *   return res.status(403).json({ error: 'Invalid signature' });
   * }
   * ```
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!secret || !signature) {
      console.warn('⚠️  Webhook verification: Missing secret or signature');
      return false;
    }

    try {
      // Generate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify using API key/token (alternative method)
   *
   * Some services send a static token in header instead of HMAC.
   * Use this if Biteship webhook documentation specifies this method.
   *
   * @param headerToken - Token from webhook header
   * @param expectedToken - Your configured webhook token
   */
  static verifyToken(headerToken: string, expectedToken: string): boolean {
    if (!expectedToken || !headerToken) {
      return false;
    }

    try {
      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(headerToken),
        Buffer.from(expectedToken)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify webhook timestamp to prevent replay attacks
   *
   * @param timestamp - Timestamp from webhook header (Unix timestamp or ISO string)
   * @param tolerance - Maximum age in seconds (default: 5 minutes)
   */
  static verifyTimestamp(timestamp: string | number, tolerance: number = 300): boolean {
    try {
      const webhookTime = typeof timestamp === 'string'
        ? new Date(timestamp).getTime()
        : timestamp * 1000;

      const currentTime = Date.now();
      const diff = Math.abs(currentTime - webhookTime) / 1000; // difference in seconds

      return diff <= tolerance;
    } catch (error) {
      console.error('Timestamp verification error:', error);
      return false;
    }
  }

  /**
   * Check if webhook comes from allowed IP addresses
   *
   * Configure BITESHIP_WEBHOOK_IPS in .env:
   * BITESHIP_WEBHOOK_IPS=1.2.3.4,5.6.7.8
   *
   * @param requestIp - IP address from request
   * @param allowedIps - Array of allowed IP addresses
   */
  static verifyIP(requestIp: string, allowedIps: string[]): boolean {
    if (!allowedIps || allowedIps.length === 0) {
      console.warn('⚠️  No allowed IPs configured for webhook verification');
      return true; // Skip IP check if not configured
    }

    return allowedIps.includes(requestIp);
  }
}

/**
 * Helper to get client IP from request
 * Handles various proxy headers
 */
export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    'unknown'
  );
}
