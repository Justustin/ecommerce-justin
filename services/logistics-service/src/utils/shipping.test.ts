import {
  calculateVolumetricWeight,
  getBillableWeight,
  calculateInsuranceFee,
  calculateCODFee,
  findCheapestRate,
  findFastestRate,
  parseDurationToDays,
  calculateEstimatedDeliveryDate,
  validatePostalCode,
  normalizeTrackingStatus,
  calculateTotalShippingCost,
  filterRatesByFeatures,
  isShipmentOverdue,
  validateShippingPhone,
  CourierRate,
} from './shipping';

describe('shipping utilities', () => {
  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight correctly', () => {
      // 30cm x 20cm x 10cm / 6000 = 1 kg
      expect(calculateVolumetricWeight(30, 20, 10)).toBe(1);
    });

    it('should use custom divisor', () => {
      // 30cm x 20cm x 10cm / 5000 = 1.2 kg
      expect(calculateVolumetricWeight(30, 20, 10, 5000)).toBe(1.2);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateVolumetricWeight(25, 15, 10)).toBe(0.63);
    });

    it('should throw error for zero dimensions', () => {
      expect(() => calculateVolumetricWeight(0, 20, 10)).toThrow(
        'Dimensions must be greater than 0'
      );
    });

    it('should throw error for zero divisor', () => {
      expect(() => calculateVolumetricWeight(30, 20, 10, 0)).toThrow(
        'Divisor must be greater than 0'
      );
    });
  });

  describe('getBillableWeight', () => {
    it('should return actual weight when higher', () => {
      expect(getBillableWeight(5, 2)).toBe(5);
    });

    it('should return volumetric weight when higher', () => {
      expect(getBillableWeight(2, 5)).toBe(5);
    });

    it('should return same weight when equal', () => {
      expect(getBillableWeight(5, 5)).toBe(5);
    });

    it('should throw error for negative weights', () => {
      expect(() => getBillableWeight(-1, 5)).toThrow('Weight cannot be negative');
    });
  });

  describe('calculateInsuranceFee', () => {
    it('should calculate insurance fee with default rate (0.2%)', () => {
      expect(calculateInsuranceFee(1000000)).toBe(2000);
    });

    it('should calculate insurance fee with custom rate', () => {
      expect(calculateInsuranceFee(1000000, 0.5)).toBe(5000);
    });

    it('should round to nearest integer', () => {
      expect(calculateInsuranceFee(1234567, 0.2)).toBe(2469);
    });

    it('should return 0 for zero item value', () => {
      expect(calculateInsuranceFee(0)).toBe(0);
    });

    it('should throw error for negative item value', () => {
      expect(() => calculateInsuranceFee(-1000)).toThrow('Item value cannot be negative');
    });

    it('should throw error for invalid insurance rate', () => {
      expect(() => calculateInsuranceFee(1000000, -0.5)).toThrow(
        'Insurance rate must be between 0 and 100'
      );
      expect(() => calculateInsuranceFee(1000000, 150)).toThrow(
        'Insurance rate must be between 0 and 100'
      );
    });
  });

  describe('calculateCODFee', () => {
    it('should calculate COD fee with default rate (2%)', () => {
      expect(calculateCODFee(500000)).toBe(10000);
    });

    it('should apply minimum fee when calculated fee is lower', () => {
      expect(calculateCODFee(100000, 2, 5000)).toBe(5000); // 2% of 100k = 2000, min is 5000
    });

    it('should use calculated fee when higher than minimum', () => {
      expect(calculateCODFee(500000, 2, 5000)).toBe(10000); // 2% of 500k = 10000
    });

    it('should calculate COD fee with custom rate', () => {
      expect(calculateCODFee(1000000, 3)).toBe(30000);
    });

    it('should throw error for negative COD amount', () => {
      expect(() => calculateCODFee(-1000)).toThrow('COD amount cannot be negative');
    });

    it('should throw error for invalid COD rate', () => {
      expect(() => calculateCODFee(100000, -1)).toThrow(
        'COD rate must be between 0 and 100'
      );
    });
  });

  describe('findCheapestRate', () => {
    const mockRates: CourierRate[] = [
      {
        courier_code: 'jne',
        courier_name: 'JNE',
        courier_service_name: 'REG',
        duration: '2-3 days',
        price: 15000,
        available_for_cash_on_delivery: true,
        available_for_insurance: true,
      },
      {
        courier_code: 'jnt',
        courier_name: 'J&T',
        courier_service_name: 'EZ',
        duration: '3-4 days',
        price: 12000,
        available_for_cash_on_delivery: true,
        available_for_insurance: false,
      },
      {
        courier_code: 'sicepat',
        courier_name: 'SiCepat',
        courier_service_name: 'REG',
        duration: '2-3 days',
        price: 18000,
        available_for_cash_on_delivery: false,
        available_for_insurance: true,
      },
    ];

    it('should find cheapest rate', () => {
      const cheapest = findCheapestRate(mockRates);
      expect(cheapest?.courier_code).toBe('jnt');
      expect(cheapest?.price).toBe(12000);
    });

    it('should return null for empty rates', () => {
      expect(findCheapestRate([])).toBeNull();
    });

    it('should return null for undefined rates', () => {
      expect(findCheapestRate(null as any)).toBeNull();
    });

    it('should handle single rate', () => {
      const cheapest = findCheapestRate([mockRates[0]]);
      expect(cheapest?.courier_code).toBe('jne');
    });
  });

  describe('findFastestRate', () => {
    const mockRates: CourierRate[] = [
      {
        courier_code: 'jne',
        courier_name: 'JNE',
        courier_service_name: 'YES',
        duration: '1-2 days',
        price: 25000,
        available_for_cash_on_delivery: true,
        available_for_insurance: true,
      },
      {
        courier_code: 'jnt',
        courier_name: 'J&T',
        courier_service_name: 'EZ',
        duration: '3-4 days',
        price: 12000,
        available_for_cash_on_delivery: true,
        available_for_insurance: false,
      },
      {
        courier_code: 'sicepat',
        courier_name: 'SiCepat',
        courier_service_name: 'BEST',
        duration: '2-3 days',
        price: 18000,
        available_for_cash_on_delivery: false,
        available_for_insurance: true,
      },
    ];

    it('should find fastest rate', () => {
      const fastest = findFastestRate(mockRates);
      expect(fastest?.courier_code).toBe('jne');
      expect(fastest?.duration).toBe('1-2 days');
    });

    it('should return null for empty rates', () => {
      expect(findFastestRate([])).toBeNull();
    });

    it('should handle single rate', () => {
      const fastest = findFastestRate([mockRates[0]]);
      expect(fastest?.courier_code).toBe('jne');
    });
  });

  describe('parseDurationToDays', () => {
    it('should parse "1-2 days" to 1', () => {
      expect(parseDurationToDays('1-2 days')).toBe(1);
    });

    it('should parse "3-4 hari" to 3', () => {
      expect(parseDurationToDays('3-4 hari')).toBe(3);
    });

    it('should parse "2 days" to 2', () => {
      expect(parseDurationToDays('2 days')).toBe(2);
    });

    it('should return 999 for invalid duration', () => {
      expect(parseDurationToDays('')).toBe(999);
      expect(parseDurationToDays('unknown')).toBe(999);
    });

    it('should extract first number only', () => {
      expect(parseDurationToDays('1-2 days')).toBe(1);
      expect(parseDurationToDays('5-7 business days')).toBe(5);
    });
  });

  describe('calculateEstimatedDeliveryDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-20T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate delivery date for "1-2 days"', () => {
      const deliveryDate = calculateEstimatedDeliveryDate('1-2 days');
      expect(deliveryDate.getDate()).toBe(21); // Jan 20 + 1 day
    });

    it('should calculate delivery date for "3-4 days"', () => {
      const deliveryDate = calculateEstimatedDeliveryDate('3-4 days');
      expect(deliveryDate.getDate()).toBe(23); // Jan 20 + 3 days
    });

    it('should use custom order date', () => {
      const orderDate = new Date('2025-01-15T10:00:00Z');
      const deliveryDate = calculateEstimatedDeliveryDate('2-3 days', orderDate);
      expect(deliveryDate.getDate()).toBe(17); // Jan 15 + 2 days
    });
  });

  describe('validatePostalCode', () => {
    it('should pass for valid 5-digit postal code', () => {
      const result = validatePostalCode('12345');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty postal code', () => {
      const result = validatePostalCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Postal code is required');
    });

    it('should fail for postal code too short', () => {
      const result = validatePostalCode('1234');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 digits');
    });

    it('should fail for postal code too long', () => {
      const result = validatePostalCode('123456');
      expect(result.valid).toBe(false);
    });

    it('should fail for postal code with letters', () => {
      const result = validatePostalCode('1234A');
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizeTrackingStatus', () => {
    it('should normalize "DELIVERED" to delivered', () => {
      expect(normalizeTrackingStatus('DELIVERED')).toBe('delivered');
      expect(normalizeTrackingStatus('Package delivered')).toBe('delivered');
      expect(normalizeTrackingStatus('received')).toBe('delivered');
    });

    it('should normalize to out_for_delivery', () => {
      expect(normalizeTrackingStatus('Out for delivery')).toBe('out_for_delivery');
      expect(normalizeTrackingStatus('On delivery')).toBe('out_for_delivery');
    });

    it('should normalize to in_transit', () => {
      expect(normalizeTrackingStatus('In transit')).toBe('in_transit');
      expect(normalizeTrackingStatus('On the way')).toBe('in_transit');
    });

    it('should normalize to picked_up', () => {
      expect(normalizeTrackingStatus('Picked up')).toBe('picked_up');
      expect(normalizeTrackingStatus('Package picked')).toBe('picked_up');
    });

    it('should normalize to failed', () => {
      expect(normalizeTrackingStatus('Failed')).toBe('failed');
      expect(normalizeTrackingStatus('Failed delivery')).toBe('failed');
    });

    it('should normalize to returned', () => {
      expect(normalizeTrackingStatus('Returned')).toBe('returned');
      expect(normalizeTrackingStatus('Return to sender')).toBe('returned');
    });

    it('should default to pending for unknown status', () => {
      expect(normalizeTrackingStatus('Unknown status')).toBe('pending');
      expect(normalizeTrackingStatus('')).toBe('pending');
    });
  });

  describe('calculateTotalShippingCost', () => {
    it('should calculate total with base cost only', () => {
      expect(calculateTotalShippingCost(15000)).toBe(15000);
    });

    it('should calculate total with insurance', () => {
      expect(calculateTotalShippingCost(15000, 2000)).toBe(17000);
    });

    it('should calculate total with COD fee', () => {
      expect(calculateTotalShippingCost(15000, 0, 5000)).toBe(20000);
    });

    it('should calculate total with all fees', () => {
      expect(calculateTotalShippingCost(15000, 2000, 5000)).toBe(22000);
    });

    it('should throw error for negative base cost', () => {
      expect(() => calculateTotalShippingCost(-1000)).toThrow(
        'Base shipping cost cannot be negative'
      );
    });

    it('should throw error for negative insurance', () => {
      expect(() => calculateTotalShippingCost(15000, -100)).toThrow(
        'Insurance fee cannot be negative'
      );
    });

    it('should throw error for negative COD fee', () => {
      expect(() => calculateTotalShippingCost(15000, 0, -100)).toThrow(
        'COD fee cannot be negative'
      );
    });
  });

  describe('filterRatesByFeatures', () => {
    const mockRates: CourierRate[] = [
      {
        courier_code: 'jne',
        courier_name: 'JNE',
        courier_service_name: 'REG',
        duration: '2-3 days',
        price: 15000,
        available_for_cash_on_delivery: true,
        available_for_insurance: true,
      },
      {
        courier_code: 'jnt',
        courier_name: 'J&T',
        courier_service_name: 'EZ',
        duration: '3-4 days',
        price: 12000,
        available_for_cash_on_delivery: true,
        available_for_insurance: false,
      },
      {
        courier_code: 'sicepat',
        courier_name: 'SiCepat',
        courier_service_name: 'REG',
        duration: '2-3 days',
        price: 18000,
        available_for_cash_on_delivery: false,
        available_for_insurance: true,
      },
    ];

    it('should return all rates when no filters', () => {
      const filtered = filterRatesByFeatures(mockRates);
      expect(filtered).toHaveLength(3);
    });

    it('should filter by COD availability', () => {
      const filtered = filterRatesByFeatures(mockRates, true, false);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.courier_code)).toEqual(['jne', 'jnt']);
    });

    it('should filter by insurance availability', () => {
      const filtered = filterRatesByFeatures(mockRates, false, true);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.courier_code)).toEqual(['jne', 'sicepat']);
    });

    it('should filter by both COD and insurance', () => {
      const filtered = filterRatesByFeatures(mockRates, true, true);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].courier_code).toBe('jne');
    });

    it('should return empty array when no matches', () => {
      const ratesNoCOD: CourierRate[] = [mockRates[2]]; // Only sicepat (no COD)
      const filtered = filterRatesByFeatures(ratesNoCOD, true, false);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('isShipmentOverdue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-25T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return not overdue for future delivery', () => {
      const estimatedDate = new Date('2025-01-27T10:00:00Z');
      const result = isShipmentOverdue(estimatedDate);
      expect(result.isOverdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
    });

    it('should return not overdue for today', () => {
      const estimatedDate = new Date('2025-01-25T10:00:00Z');
      const result = isShipmentOverdue(estimatedDate);
      expect(result.isOverdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
    });

    it('should return overdue for past delivery by 1 day', () => {
      const estimatedDate = new Date('2025-01-24T10:00:00Z');
      const result = isShipmentOverdue(estimatedDate);
      expect(result.isOverdue).toBe(true);
      expect(result.daysOverdue).toBe(1);
    });

    it('should return overdue for past delivery by multiple days', () => {
      const estimatedDate = new Date('2025-01-20T10:00:00Z');
      const result = isShipmentOverdue(estimatedDate);
      expect(result.isOverdue).toBe(true);
      expect(result.daysOverdue).toBe(5);
    });

    it('should use custom current date', () => {
      const estimatedDate = new Date('2025-01-20T10:00:00Z');
      const currentDate = new Date('2025-01-23T10:00:00Z');
      const result = isShipmentOverdue(estimatedDate, currentDate);
      expect(result.isOverdue).toBe(true);
      expect(result.daysOverdue).toBe(3);
    });
  });

  describe('validateShippingPhone', () => {
    it('should pass for +62 format', () => {
      const result = validateShippingPhone('+628123456789');
      expect(result.valid).toBe(true);
    });

    it('should pass for 08 format', () => {
      const result = validateShippingPhone('081234567890');
      expect(result.valid).toBe(true);
    });

    it('should pass for phone with spaces', () => {
      const result = validateShippingPhone('+62 812 3456 7890');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty phone', () => {
      const result = validateShippingPhone('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should fail for non-Indonesian number', () => {
      const result = validateShippingPhone('+1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid Indonesian number');
    });
  });
});
