import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePackageDto, PackageItemDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { AdminQueryPackageDto } from './dto/admin-query-package.dto.js';
import {
  FormattedPackage,
  PACKAGE_INCLUDE,
  PackageWithItems,
} from './interfaces/package.interface.js';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${baseSlug}-${suffix}`;
  }

  private validateDiscount(price: number, discountPrice?: number | null): void {
    if (discountPrice !== undefined && discountPrice !== null) {
      if (discountPrice >= price) {
        throw new BadRequestException(
          'Discount price must be less than the original price',
        );
      }
    }
  }

  private async validatePackageVariants(items: PackageItemDto[]): Promise<void> {
    const variantIds = items.map((item) => item.variantId);
    const uniqueIds = new Set(variantIds);

    if (uniqueIds.size !== variantIds.length) {
      throw new BadRequestException(
        'Duplicate size variants in package items. Increase quantity instead.',
      );
    }

    const existingVariants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true },
    });

    if (existingVariants.length !== variantIds.length) {
      throw new BadRequestException(
        'One or more selected product variants do not exist',
      );
    }
  }

  formatPackage(pkg: PackageWithItems): FormattedPackage {
    const now = new Date();
    const price = Number(pkg.price);
    const discountPrice = pkg.discountPrice ? Number(pkg.discountPrice) : null;

    const isDiscountNotExpired =
      !pkg.discountExpiresAt || new Date(pkg.discountExpiresAt) > now;

    const hasActiveDiscount =
      discountPrice !== null && discountPrice < price && isDiscountNotExpired;

    const effectivePrice = hasActiveDiscount ? discountPrice : price;

    let availableStock = 0;
    if (pkg.items.length > 0) {
      const stocksPerItem = pkg.items.map((item) => {
        if (!item.variant.isActive || !item.variant.product.isActive) {
          return 0;
        }
        return Math.floor(item.variant.stock / item.quantity);
      });
      availableStock = Math.min(...stocksPerItem);
    }

    return {
      ...pkg,
      price,
      discountPrice,
      effectivePrice,
      hasActiveDiscount,
      availableStock,
      inStock: availableStock > 0,
    };
  }

  async create(dto: CreatePackageDto): Promise<FormattedPackage> {
    this.validateDiscount(dto.price, dto.discountPrice);
    await this.validatePackageVariants(dto.items);

    const created = await this.prisma.package.create({
      data: {
        name: dto.name,
        slug: this.generateSlug(dto.name),
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice ?? null,
        discountExpiresAt: dto.discountExpiresAt
          ? new Date(dto.discountExpiresAt)
          : null,
        images: dto.images,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      },
      include: PACKAGE_INCLUDE,
    });

    return this.formatPackage(created);
  }

  async findAll(query: AdminQueryPackageDto) {
    const {
      page = 1,
      limit = 12,
      search,
      isFeatured,
      onSale,
      isActive,
    } = query;

    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.PackageWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(onSale && {
        discountPrice: { not: null },
        OR: [
          { discountExpiresAt: null },
          { discountExpiresAt: { gt: now } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.package.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PACKAGE_INCLUDE,
      }),
      this.prisma.package.count({ where }),
    ]);

    return {
      items: items.map((pkg) => this.formatPackage(pkg)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string): Promise<FormattedPackage> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const pkg = await this.prisma.package.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: PACKAGE_INCLUDE,
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return this.formatPackage(pkg);
  }

  async update(id: string, dto: UpdatePackageDto): Promise<FormattedPackage> {
    const existing = await this.findOne(id);

    const finalPrice = dto.price ?? existing.price;
    const finalDiscount =
      dto.discountPrice !== undefined
        ? dto.discountPrice
        : existing.discountPrice;

    this.validateDiscount(finalPrice, finalDiscount);

    if (dto.items) {
      await this.validatePackageVariants(dto.items);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.packageItem.deleteMany({ where: { packageId: id } });
      }

      return tx.package.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description && { description: dto.description }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.discountPrice !== undefined && {
            discountPrice: dto.discountPrice,
          }),
          ...(dto.discountExpiresAt !== undefined && {
            discountExpiresAt: dto.discountExpiresAt
              ? new Date(dto.discountExpiresAt)
              : null,
          }),
          ...(dto.images && { images: dto.images }),
          ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.items && {
            items: {
              create: dto.items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
              })),
            },
          }),
        },
        include: PACKAGE_INCLUDE,
      });
    });

    return this.formatPackage(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.package.delete({ where: { id } });
    return { message: 'Package deleted successfully', data: null };
  }
}