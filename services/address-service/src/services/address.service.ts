import { AddressRepository } from '../repositories/address.repository';
import { CreateAddressDTO, UpdateAddressDTO } from '../types';

export class AddressService {
  private repository: AddressRepository;

  constructor() {
    this.repository = new AddressRepository();
  }

  async createAddress(data: CreateAddressDTO) {
    return this.repository.create(data);
  }

  async getAddress(id: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new Error('Address not found');
    }
    return address;
  }

  async getUserAddresses(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async getDefaultAddress(userId: string) {
    const address = await this.repository.findDefaultByUserId(userId);
    if (!address) {
      throw new Error('No default address found');
    }
    return address;
  }

  async updateAddress(id: string, data: UpdateAddressDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Address not found');
    }

    // If setting as default, handle the switch
    if (data.isDefault) {
      await this.repository.setAsDefault(id, existing.user_id);
      // Remove isDefault from update data since we handled it
      const { isDefault, ...updateData } = data;
      if (Object.keys(updateData).length > 0) {
        return this.repository.update(id, updateData);
      }
      return this.repository.findById(id);
    }

    return this.repository.update(id, data);
  }

  async setDefaultAddress(id: string, userId: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new Error('Address not found');
    }

    if (address.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    return this.repository.setAsDefault(id, userId);
  }

  async deleteAddress(id: string, userId: string) {
    const address = await this.repository.findById(id);
    if (!address) {
      throw new Error('Address not found');
    }

    if (address.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Prevent deleting default address if it's the only one
    if (address.is_default) {
      const allAddresses = await this.repository.findByUserId(userId);
      if (allAddresses.length === 1) {
        throw new Error('Cannot delete the only address');
      }
      
      // Set another address as default before deleting
      const otherAddress = allAddresses.find(a => a.id !== id);
      if (otherAddress) {
        await this.repository.setAsDefault(otherAddress.id, userId);
      }
    }

    return this.repository.delete(id);
  }
}