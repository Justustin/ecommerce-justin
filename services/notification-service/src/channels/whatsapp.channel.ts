// src/channels/whatsapp.channel.ts
import twilio from 'twilio';
import axios from 'axios';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

interface WhatsAppMessage {
  userId: string;
  phoneNumber: string; // Now we expect phoneNumber to be provided
  message: string;
}

interface BulkWhatsAppPayload {
  messages: WhatsAppMessage[]; // Updated to accept phone numbers
}

export class WhatsAppChannel {
  private twilioWhatsAppNumber: string;

  constructor() {
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  }

  /**
   * Send WhatsApp message to a single user
   */
  async send(payload: WhatsAppMessage): Promise<void> {
    try {
      if (!payload.phoneNumber) {
        console.log(`No phone number provided for user ${payload.userId}`);
        return;
      }

      // Format phone number for WhatsApp (must start with country code)
      const formattedPhone = this.formatPhoneNumber(payload.phoneNumber);
        console.log(`Attempting to send WhatsApp to: ${formattedPhone}`);
      console.log(`Message: ${payload.message}`);
      console.log(`From Twilio number: ${this.twilioWhatsAppNumber}`);

      // Send WhatsApp message via Twilio
      const result = await twilioClient.messages.create({
        from: this.twilioWhatsAppNumber,
        to: `whatsapp:${formattedPhone}`,
        body: payload.message
      });

      console.log(`WhatsApp sent to ${formattedPhone}`);
            console.log(`Twilio message SID: ${result.sid}`);
      console.log(`Twilio status: ${result.status}`);

    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error.message);
      console.error('Twilio error details:', error);
      // Don't throw - WhatsApp failures shouldn't break the flow
    }
  }

  /**
   * Send WhatsApp message to multiple users (bulk)
   */
  async sendBulk(payload: BulkWhatsAppPayload): Promise<void> {
    try {
      // Send to each user (Twilio doesn't support true bulk sending)
      const promises = payload.messages.map(async (message) => {
        if (!message.phoneNumber) return;

        const formattedPhone = this.formatPhoneNumber(message.phoneNumber);

        try {
          await twilioClient.messages.create({
            from: this.twilioWhatsAppNumber,
            to: `whatsapp:${formattedPhone}`,
            body: message.message
          });
          console.log(`WhatsApp sent to ${formattedPhone}`);
        } catch (error: any) {
          console.error(`Failed to send WhatsApp to ${formattedPhone}:`, error.message);
        }
      });

      await Promise.allSettled(promises);

      console.log(`Bulk WhatsApp sent to ${payload.messages.length} users`);

    } catch (error) {
      console.error('Failed to send bulk WhatsApp:', error);
    }
  }

  /**
   * Format phone number to international format
   * Indonesian numbers: +62xxx
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 62 (Indonesia country code)
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }

    // If doesn't start with country code, add 62
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    return '+' + cleaned;
  }
}