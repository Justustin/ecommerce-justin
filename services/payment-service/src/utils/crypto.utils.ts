import crypto from 'crypto';

export class CryptoUtils {
  /**
   * Verify Xendit callback using HMAC-SHA256
   * CRITICAL: Uses Xendit's official webhook validation method
   *
   * @param payload - The webhook payload as JSON string
   * @param webhookToken - The x-callback-token header from Xendit
   * @param secret - Your Xendit webhook verification token
   * @returns boolean indicating if signature is valid
   */
  static verifyXenditCallback(
    payload: string,
    webhookToken: string,
    secret: string
  ): boolean {
    if (!secret || !webhookToken) {
      return false;
    }

    // Xendit uses HMAC-SHA256 for webhook verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(webhookToken),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      // timingSafeEqual throws if lengths don't match
      return false;
    }
  }

  /**
   * Generate a unique payment code
   * Format: PAY-YYYYMMDD-XXXXXX
   */
  static generatePaymentCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `PAY-${date}-${random}`;
  }

  /**
   * Generate a unique refund code
   * Format: REF-YYYYMMDD-XXXXXX
   */
  static generateRefundCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `REF-${date}-${random}`;
  }

  /**
   * Generate a unique settlement code
   * Format: SET-YYYYMMDD-XXXXXX
   */
  static generateSettlementCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SET-${date}-${random}`;
  }

  /**
   * Generate a unique transaction code with custom prefix
   */
  static generateCode(prefix: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  /**
   * Hash a string using SHA256
   */
  static hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Generate a random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify HMAC signature (useful for webhook verification)
   */
  static verifyHmac(
    data: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate HMAC signature
   */
  static generateHmac(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }
}