import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VariantsService } from '../variants/variants.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { AdminQueryProductDto } from './dto/admin-query-product.dto.js';
import {
  FormattedProduct,
  PRODUCT_INCLUDE,
  ProductWithRelations,
} from './interfaces/product.interface.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantsService: VariantsService,
  ) {}

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

  formatProduct(product: ProductWithRelations): FormattedProduct {
    const formattedVariants = product.variants.map((variant) =>
      this.variantsService.formatVariant(variant),
    );

    const activeVariants = formattedVariants.filter((v) => v.isActive);
    const priceSource =
      activeVariants.length > 0 ? activeVariants : formattedVariants;

    const startingPrice =
      priceSource.length > 0
        ? Math.min(...priceSource.map((v) => v.effectivePrice))
        : 0;

    return {
      ...product,
      variants: formattedVariants,
      startingPrice,
      hasActiveDiscount: activeVariants.some((v) => v.hasActiveDiscount),
      inStock: formattedVariants.some((v) => v.inStock),
    };
  }

  async create(dto: CreateProductDto): Promise<FormattedProduct> {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Selected category does not exist');
    }

    const normalizedSizes = new Set<string>();
    for (const variant of dto.variants) {
      const size = variant.size.trim();
      if (normalizedSizes.has(size.toLowerCase())) {
        throw new BadRequestException(
          `Duplicate size "${size}" in variants list`,
        );
      }
      normalizedSizes.add(size.toLowerCase());
      this.variantsService.validateDiscount(
        variant.price,
        variant.discountPrice,
      );
    }

    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: this.generateSlug(dto.name),
        description: dto.description,
        concentration: dto.concentration ?? null,
        notes: dto.notes
          ? (dto.notes as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        images: dto.images,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
        variants: {
          create: dto.variants.map((v) => ({
            size: v.size.trim(),
            price: v.price,
            discountPrice: v.discountPrice ?? null,
            discountExpiresAt: v.discountExpiresAt
              ? new Date(v.discountExpiresAt)
              : null,
            stock: v.stock ?? 0,
            isActive: v.isActive ?? true,
          })),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    return this.formatProduct(created);
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

    const variantFilter: Prisma.ProductVariantWhereInput = {
      ...(lowStock && { stock: { lte: 5 } }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(onSale && {
        isActive: true,
        discountPrice: { not: null },
        OR: [{ discountExpiresAt: null }, { discountExpiresAt: { gt: now } }],
      }),
    };

    const hasVariantFilter = Object.keys(variantFilter).length > 0;

    const where: Prisma.ProductWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(categoryId && { categoryId }),
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(hasVariantFilter && { variants: { some: variantFilter } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PRODUCT_INCLUDE,
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

  async findOne(idOrSlug: string): Promise<FormattedProduct> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const product = await this.prisma.product.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<FormattedProduct> {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException('Selected category does not exist');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.concentration !== undefined && {
          concentration: dto.concentration,
        }),
        ...(dto.notes !== undefined && {
          notes: dto.notes
            ? (dto.notes as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        }),
        ...(dto.images && { images: dto.images }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: PRODUCT_INCLUDE,
    });

    return this.formatProduct(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const linkedPackageItem = await this.prisma.packageItem.findFirst({
      where: { variant: { productId: id } },
      select: { id: true },
    });

    if (linkedPackageItem) {
      throw new BadRequestException(
        'Cannot delete product because one of its sizes is included in a gift package',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully', data: null };
  }
}
