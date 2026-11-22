import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { AdminQueryProductDto } from './dto/admin-query-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.categoriesService.findOne(dto.categoryId);
    this.validateDiscount(dto.price, dto.discountPrice);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: this.generateSlug(dto.name),
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice ?? null,
        discountExpiresAt: dto.discountExpiresAt
          ? new Date(dto.discountExpiresAt)
          : null,
        stock: dto.stock,
        size: dto.size,
        concentration: dto.concentration,
        notes: dto.notes
          ? (dto.notes as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        images: dto.images,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return this.formatProduct(product);
  }

  async findAll(query: AdminQueryProductDto) {
    const {
      page = 1,
      limit = 12,
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      isFeatured,
      onSale,
      isActive,
      lowStock,
    } = query;

    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.ProductWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(lowStock && { stock: { lte: 5 } }),
      ...(categoryId && { categoryId }),
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(onSale && {
        discountPrice: { not: null },
        OR: [{ discountExpiresAt: null }, { discountExpiresAt: { gt: now } }],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: lowStock ? { stock: 'asc' } : { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatProduct(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const product = await this.prisma.product.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }

    const finalPrice = dto.price ?? existing.price;
    const finalDiscount =
      dto.discountPrice !== undefined
        ? dto.discountPrice
        : existing.discountPrice;

    this.validateDiscount(finalPrice, finalDiscount);

    const data: Prisma.ProductUpdateInput = {
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
      ...(dto.stock !== undefined && { stock: dto.stock }),
      ...(dto.size && { size: dto.size }),
      ...(dto.concentration !== undefined && {
        concentration: dto.concentration,
      }),
      ...(dto.notes !== undefined && {
        notes: dto.notes as unknown as Prisma.InputJsonValue,
      }),
      ...(dto.images && { images: dto.images }),
      ...(dto.categoryId && {
        category: { connect: { id: dto.categoryId } },
      }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return this.formatProduct(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const linkedPackagesCount = await this.prisma.packageItem.count({
      where: { productId: id },
    });

    if (linkedPackagesCount > 0) {
      throw new BadRequestException(
        'Cannot delete product because it is included in one or more gift packages. Remove it from packages or deactivate it instead.',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully', data: null };
  }

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

  private validateDiscount(price: number, discountPrice?: number | null) {
    if (discountPrice !== undefined && discountPrice !== null) {
      if (discountPrice >= price) {
        throw new BadRequestException(
          'Discount price must be less than the original price',
        );
      }
    }
  }

  formatProduct(product: Product) {
    const now = new Date();
    const price = Number(product.price);
    const discountPrice = product.discountPrice
      ? Number(product.discountPrice)
      : null;

    const isDiscountNotExpired =
      !product.discountExpiresAt || new Date(product.discountExpiresAt) > now;

    const hasActiveDiscount =
      discountPrice !== null && discountPrice < price && isDiscountNotExpired;

    const effectivePrice = hasActiveDiscount ? discountPrice : price;

    return {
      ...product,
      price,
      discountPrice,
      effectivePrice,
      hasActiveDiscount,
      inStock: product.stock > 0,
    };
  }
}
