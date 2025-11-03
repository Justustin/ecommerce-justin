import axios, { AxiosInstance } from 'axios';
import { biteshipConfig } from '../config/biteship';

class BiteshipAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: biteshipConfig.baseUrl,
      headers: {
        'Authorization': biteshipConfig.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Get shipping rates from multiple couriers
   * https://biteship.com/en/docs/api/rates
   */
  async getRates(params: {
    origin_postal_code?: number;
    origin_latitude?: number;
    origin_longitude?: number;
    origin_area_id?: string;
    destination_postal_code?: number;
    destination_latitude?: number;
    destination_longitude?: number;
    destination_area_id?: string;
    couriers?: string; // comma-separated: "jne,jnt,sicepat"
    items: Array<{
      name: string;
      description?: string;
      value: number; // item value in IDR
      length: number; // cm
      width: number; // cm
      height: number; // cm
      weight: number; // grams
      quantity: number;
    }>;
  }) {
    try {
      const response = await this.client.post('/rates/couriers', params);
      return response.data;
    } catch (error: any) {
      console.error('Biteship getRates error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to get shipping rates');
    }
  }

  /**
   * Create a shipment order
   * https://biteship.com/en/docs/api/order
   */
  async createOrder(params: {
    shipper_contact_name: string;
    shipper_contact_phone: string;
    shipper_contact_email?: string;
    shipper_organization?: string;
    origin_contact_name: string;
    origin_contact_phone: string;
    origin_address: string;
    origin_note?: string;
    origin_postal_code: number;
    origin_coordinate?: {
      latitude: number;
      longitude: number;
    };
    destination_contact_name: string;
    destination_contact_phone: string;
    destination_contact_email?: string;
    destination_address: string;
    destination_postal_code: number;
    destination_note?: string;
    destination_coordinate?: {
      latitude: number;
      longitude: number;
    };
    courier_company: string; // e.g., "jne", "jnt", "sicepat"
    courier_type: string; // e.g., "reg", "express", "oke"
    courier_insurance?: number; // insurance amount
    delivery_type: string; // "now" or "scheduled"
    delivery_date?: string; // ISO date for scheduled
    delivery_time?: string; // "09:00-12:00"
    order_note?: string;
    items: Array<{
      id?: string;
      name: string;
      description?: string;
      value: number;
      length: number;
      width: number;
      height: number;
      weight: number;
      quantity: number;
    }>;
    reference_id?: string; // your internal order ID
  }) {
    try {
      const response = await this.client.post('/orders', params);
      return response.data;
    } catch (error: any) {
      console.error('Biteship createOrder error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to create shipment');
    }
  }

  /**
   * Track a shipment
   * https://biteship.com/en/docs/api/tracking
   */
  async trackOrder(orderId: string) {
    try {
      const response = await this.client.get(`/trackings/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Biteship trackOrder error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to track shipment');
    }
  }

  /**
   * Track by waybill/tracking number
   */
  async trackByWaybill(params: {
    waybill_id: string;
    courier_company: string;
  }) {
    try {
      const response = await this.client.post('/trackings', params);
      return response.data;
    } catch (error: any) {
      console.error('Biteship trackByWaybill error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to track shipment');
    }
  }

  /**
   * Retrieve areas (for address validation)
   */
  async searchAreas(query: {
    countries?: string; // "ID" for Indonesia
    input: string; // search term
    type?: 'single' | 'double';
  }) {
    try {
      const response = await this.client.get('/maps/areas', { params: query });
      return response.data;
    } catch (error: any) {
      console.error('Biteship searchAreas error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to search areas');
    }
  }

  /**
   * Get postal code information
   */
  async getPostalCode(areaId: string) {
    try {
      const response = await this.client.get(`/maps/areas/${areaId}`);
      return response.data;
    } catch (error: any) {
      console.error('Biteship getPostalCode error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to get postal code');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string) {
    try {
      const response = await this.client.post(`/orders/${orderId}/cancel`, {
        cancellation_reason: reason || 'Customer request'
      });
      return response.data;
    } catch (error: any) {
      console.error('Biteship cancelOrder error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to cancel order');
    }
  }
}

export const biteshipAPI = new BiteshipAPI();