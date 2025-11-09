import { PrismaClient } from '@repo/database';
import {
  CreateFactoryDTO,
  UpdateFactoryDTO,
  VerifyFactoryDTO,
  UpdateFactoryStatusDTO,
  AssignOfficeDTO,
  FactoryFilters,
  PaginatedResponse
} from '../types';

export class FactoryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: CreateFactoryDTO) {
    return this.prisma.factories.create({
      data: {
        owner_id: data.ownerId,
        office_id: data.officeId || null,
        factory_code: data.factoryCode,
        factory_name: data.factoryName,
        business_license_number: data.businessLicenseNumber || null,
        business_license_photo_url: data.businessLicensePhotoUrl || null,
        tax_id: data.taxId || null,
        phone_number: data.phoneNumber,
        email: data.email || null,
        province: data.province,
        city: data.city,
        district: data.district,
        postal_code: data.postalCode || null,
        address_line: data.addressLine,
        logo_url: data.logoUrl || null,
        description: data.description || null,
      },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            role: true,
          }
        }
      }
    });
  }

  async findAll(filters: FactoryFilters): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.verificationStatus) {
      where.verification_status = filters.verificationStatus;
    }

    if (filters.city) {
      where.city = {
        contains: filters.city,
        mode: 'insensitive'
      };
    }

    if (filters.province) {
      where.province = {
        contains: filters.province,
        mode: 'insensitive'
      };
    }

    if (filters.district) {
      where.district = {
        contains: filters.district,
        mode: 'insensitive'
      };
    }

    if (filters.officeId) {
      where.office_id = filters.officeId;
    }

    if (filters.search) {
      where.OR = [
        {
          factory_name: {
            contains: filters.search,
            mode: 'insensitive'
          }
        },
        {
          factory_code: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.factories.count({ where }),
      this.prisma.factories.findMany({
        where,
        skip,
        take: limit,
        include: {
          users_factories_owner_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string) {
    return this.prisma.factories.findUnique({
      where: { id },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            role: true,
          }
        },
        users_factories_verified_byTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          }
        }
      }
    });
  }

  async findByCode(factoryCode: string) {
    return this.prisma.factories.findUnique({
      where: { factory_code: factoryCode },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        },
      }
    });
  }

  async findByOwnerId(ownerId: string) {
    return this.prisma.factories.findMany({
      where: { owner_id: ownerId },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        },
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  async update(id: string, data: UpdateFactoryDTO) {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.factoryName !== undefined) updateData.factory_name = data.factoryName;
    if (data.businessLicenseNumber !== undefined) updateData.business_license_number = data.businessLicenseNumber;
    if (data.businessLicensePhotoUrl !== undefined) updateData.business_license_photo_url = data.businessLicensePhotoUrl;
    if (data.taxId !== undefined) updateData.tax_id = data.taxId;
    if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
    if (data.addressLine !== undefined) updateData.address_line = data.addressLine;
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
    if (data.description !== undefined) updateData.description = data.description;

    return this.prisma.factories.update({
      where: { id },
      data: updateData,
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        }
      }
    });
  }

  async verify(id: string, data: VerifyFactoryDTO) {
    return this.prisma.factories.update({
      where: { id },
      data: {
        verification_status: data.verificationStatus,
        verified_at: data.verificationStatus === 'verified' ? new Date() : null,
        verified_by: data.verifiedBy || null,
        updated_at: new Date(),
      },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        },
        users_factories_verified_byTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          }
        }
      }
    });
  }

  async updateStatus(id: string, data: UpdateFactoryStatusDTO) {
    return this.prisma.factories.update({
      where: { id },
      data: {
        status: data.status,
        updated_at: new Date(),
      },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        }
      }
    });
  }

  async assignOffice(id: string, data: AssignOfficeDTO) {
    return this.prisma.factories.update({
      where: { id },
      data: {
        office_id: data.officeId,
        assigned_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        users_factories_owner_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          }
        }
      }
    });
  }

  async delete(id: string) {
    // Hard delete - permanently removes from database
    return this.prisma.factories.delete({
      where: { id }
    });
  }

  async checkFactoryCodeExists(factoryCode: string): Promise<boolean> {
    const count = await this.prisma.factories.count({
      where: { factory_code: factoryCode }
    });
    return count > 0;
  }

  async checkBusinessLicenseExists(businessLicenseNumber: string): Promise<boolean> {
    const count = await this.prisma.factories.count({
      where: { business_license_number: businessLicenseNumber }
    });
    return count > 0;
  }
}