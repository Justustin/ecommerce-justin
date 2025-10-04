import { FactoryRepository } from '../repositories/factory.repository';
import {
  CreateFactoryDTO,
  UpdateFactoryDTO,
  VerifyFactoryDTO,
  UpdateFactoryStatusDTO,
  AssignOfficeDTO,
  FactoryFilters
} from '../types';

export class FactoryService {
  private repository: FactoryRepository;

  constructor() {
    this.repository = new FactoryRepository();
  }

  async createFactory(data: CreateFactoryDTO) {
    // Validate factory code is unique
    const codeExists = await this.repository.checkFactoryCodeExists(data.factoryCode);
    if (codeExists) {
      throw new Error(`Factory code ${data.factoryCode} already exists`);
    }

    // Validate business license is unique if provided
    if (data.businessLicenseNumber) {
      const licenseExists = await this.repository.checkBusinessLicenseExists(data.businessLicenseNumber);
      if (licenseExists) {
        throw new Error(`Business license ${data.businessLicenseNumber} already registered`);
      }
    }

    return this.repository.create(data);
  }

  async getFactories(filters: FactoryFilters) {
    return this.repository.findAll(filters);
  }

  async getFactoryById(id: string) {
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }
    return factory;
  }

  async getFactoryByCode(factoryCode: string) {
    const factory = await this.repository.findByCode(factoryCode);
    if (!factory) {
      throw new Error('Factory not found');
    }
    return factory;
  }

  async getFactoriesByOwner(ownerId: string) {
    return this.repository.findByOwnerId(ownerId);
  }

  async updateFactory(id: string, data: UpdateFactoryDTO) {
    // Check factory exists
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }

    // Validate business license is unique if being updated
    if (data.businessLicenseNumber && data.businessLicenseNumber !== factory.business_license_number) {
      const licenseExists = await this.repository.checkBusinessLicenseExists(data.businessLicenseNumber);
      if (licenseExists) {
        throw new Error(`Business license ${data.businessLicenseNumber} already registered`);
      }
    }

    return this.repository.update(id, data);
  }

  async verifyFactory(id: string, data: VerifyFactoryDTO) {
    // Check factory exists
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }

    // If verifying, also set status to active
    if (data.verificationStatus === 'verified') {
      await this.repository.updateStatus(id, { status: 'active' });
    }

    return this.repository.verify(id, data);
  }

  async updateFactoryStatus(id: string, data: UpdateFactoryStatusDTO) {
    // Check factory exists
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }

    // Don't allow activating unverified factories
    if (data.status === 'active' && factory.verification_status !== 'verified') {
      throw new Error('Cannot activate unverified factory. Factory must be verified first.');
    }

    return this.repository.updateStatus(id, data);
  }

  async assignOffice(id: string, data: AssignOfficeDTO) {
    // Check factory exists
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }

    return this.repository.assignOffice(id, data);
  }

  async deleteFactory(id: string) {
    // Check factory exists
    const factory = await this.repository.findById(id);
    if (!factory) {
      throw new Error('Factory not found');
    }

    // Warning: This is a HARD delete
    return this.repository.delete(id);
  }

  // Utility method to generate factory code
  static generateFactoryCode(city: string, ownerName: string): string {
    const cityCode = city.substring(0, 3).toUpperCase();
    const nameCode = ownerName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `FACT-${cityCode}-${nameCode}-${timestamp}`;
  }
}