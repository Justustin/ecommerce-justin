import { prisma } from '@repo/database';
import { CreateAddressDTO, UpdateAddressDTO } from '../types';

export class AddressRepository {
  async create(data: CreateAddressDTO) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await prisma.user_addresses.updateMany({
        where: { user_id: data.userId },
        data: { is_default: false }
      });
    }

    return prisma.user_addresses.create({
      data: {
        user_id: data.userId,
        label: data.label,
        recipient_name: data.recipientName,
        phone_number: data.phoneNumber,
        province: data.province,
        city: data.city,
        district: data.district,
        postal_code: data.postalCode,
        address_line: data.addressLine,
        notes: data.notes,
        is_default: data.isDefault || false
      }
    });
  }

  async findById(id: string) {
    return prisma.user_addresses.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string) {
    return prisma.user_addresses.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async findDefaultByUserId(userId: string) {
    return prisma.user_addresses.findFirst({
      where: { 
        user_id: userId,
        is_default: true 
      }
    });
  }

  async update(id: string, data: UpdateAddressDTO) {
    return prisma.user_addresses.update({
      where: { id },
      data: {
        label: data.label,
        recipient_name: data.recipientName,
        phone_number: data.phoneNumber,
        province: data.province,
        city: data.city,
        district: data.district,
        postal_code: data.postalCode,
        address_line: data.addressLine,
        notes: data.notes,
        is_default: data.isDefault,
        updated_at: new Date()
      }
    });
  }

  async setAsDefault(id: string, userId: string) {
    // Unset all other defaults for this user
    await prisma.user_addresses.updateMany({
      where: { user_id: userId },
      data: { is_default: false }
    });

    // Set this one as default
    return prisma.user_addresses.update({
      where: { id },
      data: { is_default: true }
    });
  }

  async delete(id: string) {
    return prisma.user_addresses.delete({
      where: { id }
    });
  }
}