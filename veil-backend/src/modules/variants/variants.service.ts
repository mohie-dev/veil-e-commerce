import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { FormattedVariant } from './interfaces/variant.interface.js';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  validateDiscount(price: number, discountPrice?: number | null): void {
    if (discountPrice !== undefined && discountPrice !== null) {
      if (discountPrice >= price) {
        throw new BadRequestException(
          'Discount price must be less than the original price',
        );
      }
    }
  }

  formatVariant(variant: ProductVariant): FormattedVariant {
    const now = new Date();
    const price = Number(variant.price);
    const discountPrice = variant.discountPrice
      ? Number(variant.discountPrice)
      : null;

    const isDiscountNotExpired =
      !variant.discountExpiresAt || new Date(variant.discountExpiresAt) > now;

    const hasActiveDiscount =
      discountPrice !== null && discountPrice < price && isDiscountNotExpired;

    const effectivePrice = hasActiveDiscount ? discountPrice : price;

    return {
      ...variant,
      price,
      discountPrice,
      effectivePrice,
      hasActiveDiscount,
      inStock: variant.isActive && variant.stock > 0,
    };
  }

  async create(dto: CreateVariantDto): Promise<FormattedVariant> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const normalizedSize = dto.size.trim();

    const duplicate = await this.prisma.productVariant.findUnique({
      where: {
        productId_size: {
          productId: dto.productId,
          size: normalizedSize,
        },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `Size "${normalizedSize}" already exists for this product`,
      );
    }

    this.validateDiscount(dto.price, dto.discountPrice);

    const created = await this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        size: normalizedSize,
        price: dto.price,
        discountPrice: dto.discountPrice ?? null,
        discountExpiresAt: dto.discountExpiresAt
          ? new Date(dto.discountExpiresAt)
          : null,
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return this.formatVariant(created);
  }

  async update(id: string, dto: UpdateVariantDto): Promise<FormattedVariant> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Product variant not found');
    }

    const normalizedSize = dto.size?.trim();
    if (normalizedSize && normalizedSize !== existing.size) {
      const duplicate = await this.prisma.productVariant.findUnique({
        where: {
          productId_size: {
            productId: existing.productId,
            size: normalizedSize,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Size "${normalizedSize}" already exists for this product`,
        );
      }
    }

    const finalPrice = dto.price ?? Number(existing.price);
    const finalDiscount =
      dto.discountPrice !== undefined
        ? dto.discountPrice
        : existing.discountPrice
          ? Number(existing.discountPrice)
          : null;

    this.validateDiscount(finalPrice, finalDiscount);

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(normalizedSize && { size: normalizedSize }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.discountPrice !== undefined && {
          discountPrice: dto.discountPrice,
        }),
        ...(dto.discountExpiresAt !== undefined && {
          discountExpiresAt: dto.discountExpiresAt
            ? new Date(dto.discountExpiresAt)
            : null,
        }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.formatVariant(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            packageItems: true,
            orderItems: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product variant not found');
    }

    if (existing._count.packageItems > 0) {
      throw new BadRequestException(
        'Cannot delete this size because it is included in one or more gift packages',
      );
    }

    if (existing._count.orderItems > 0) {
      throw new BadRequestException(
        'Cannot delete this size because it is linked to existing orders. Deactivate it instead.',
      );
    }

    const siblingCount = await this.prisma.productVariant.count({
      where: { productId: existing.productId },
    });

    if (siblingCount <= 1) {
      throw new BadRequestException(
        'A product must have at least one size variant',
      );
    }

    await this.prisma.productVariant.delete({ where: { id } });
    return { message: 'Variant deleted successfully', data: null };
  }
}
