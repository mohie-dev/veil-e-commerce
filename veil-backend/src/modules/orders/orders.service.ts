import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { ProductsService } from '../products/products.service.js';
import { PackagesService } from '../packages/packages.service.js';
import { CreateOrderDto, OrderItemInputDto } from './dto/create-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { TrackOrderDto } from './dto/track-order.dto.js';
import {
  FormattedOrder,
  ORDER_INCLUDE,
  OrderWithItems,
  PreparedOrderItem,
} from './interfaces/order.interface.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly packagesService: PackagesService,
  ) {}

  private formatOrder(order: OrderWithItems): FormattedOrder {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }

  private deduplicateItems(items: OrderItemInputDto[]): OrderItemInputDto[] {
    const map = new Map<string, OrderItemInputDto>();

    for (const item of items) {
      const key = `${item.itemType}:${item.itemId}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(key, { ...item });
      }
    }

    return Array.from(map.values());
  }

  private generateOrderNumber(): string {
    const timestampPart = Date.now().toString().slice(-5);
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `VEIL-${timestampPart}${randomPart}`;
  }

  async create(dto: CreateOrderDto): Promise<FormattedOrder> {
    const settings = await this.settingsService.getSettings();
    if (!settings.isOpen) {
      throw new BadRequestException(
        'Store is currently closed and not accepting new orders.',
      );
    }

    const normalizedPhone = this.customersService.normalizePhone(
      dto.customerPhone,
    );
    const normalizedAltPhone = dto.alternativePhone
      ? this.customersService.normalizePhone(dto.alternativePhone)
      : null;

    const mergedItems = this.deduplicateItems(dto.items);
    const preparedItems: PreparedOrderItem[] = [];
    const productDeductions = new Map<string, { name: string; qty: number }>();

    const addDeduction = (productId: string, name: string, qty: number) => {
      const current = productDeductions.get(productId);
      if (current) {
        current.qty += qty;
      } else {
        productDeductions.set(productId, { name, qty });
      }
    };

    let subtotal = 0;

    for (const item of mergedItems) {
      if (item.itemType === ItemType.PRODUCT) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.itemId },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product with ID ${item.itemId} is unavailable.`,
          );
        }

        const formatted = this.productsService.formatProduct(product);
        const unitPrice = formatted.effectivePrice;
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        addDeduction(product.id, product.name, item.quantity);

        preparedItems.push({
          itemType: ItemType.PRODUCT,
          itemName: `${product.name} (${product.size})`,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          productId: product.id,
          packageId: null,
        });
      } else {
        const pkg = await this.prisma.package.findUnique({
          where: { id: item.itemId },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    size: true,
                    price: true,
                    stock: true,
                    images: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        });

        if (!pkg || !pkg.isActive) {
          throw new BadRequestException(
            `Package with ID ${item.itemId} is unavailable.`,
          );
        }

        const formattedPkg = this.packagesService.formatPackage(pkg);
        const unitPrice = formattedPkg.effectivePrice;
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        for (const pkgItem of pkg.items) {
          if (!pkgItem.product.isActive) {
            throw new BadRequestException(
              `Package "${pkg.name}" contains an unavailable product.`,
            );
          }
          addDeduction(
            pkgItem.product.id,
            pkgItem.product.name,
            pkgItem.quantity * item.quantity,
          );
        }

        preparedItems.push({
          itemType: ItemType.PACKAGE,
          itemName: pkg.name,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          productId: null,
          packageId: pkg.id,
        });
      }
    }

    const qualifiesForFreeShipping =
      settings.freeShippingThreshold !== null &&
      subtotal >= settings.freeShippingThreshold;

    const deliveryFee = qualifiesForFreeShipping
      ? 0
      : settings.defaultDeliveryFee;
    const total = subtotal + deliveryFee;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      for (const [productId, info] of productDeductions.entries()) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: productId,
            isActive: true,
            stock: { gte: info.qty },
          },
          data: {
            stock: { decrement: info.qty },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(
            `Insufficient stock for "${info.name}". Please adjust your cart quantity.`,
          );
        }
      }

      const customer = await this.customersService.findOrCreate(
        {
          name: dto.customerName,
          phone: normalizedPhone,
          email: dto.customerEmail,
          address: `${dto.governorate} - ${dto.shippingAddress}`,
        },
        tx,
      );

      return tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          customerName: dto.customerName,
          customerPhone: normalizedPhone,
          alternativePhone: normalizedAltPhone,
          governorate: dto.governorate,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes ?? null,
          subtotal,
          deliveryFee,
          total,
          status: OrderStatus.PENDING,
          paymentMethod: 'COD',
          customerId: customer.id,
          items: {
            create: preparedItems,
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    return this.formatOrder(createdOrder);
  }

  async trackOrder(dto: TrackOrderDto): Promise<FormattedOrder> {
    const normalizedPhone = this.customersService.normalizePhone(dto.phone);
    const cleanedOrderNumber = dto.orderNumber.trim().toUpperCase();

    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: cleanedOrderNumber,
        customerPhone: normalizedPhone,
      },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(
        'Order not found. Please check your order number and mobile number.',
      );
    }

    return this.formatOrder(order);
  }

  async findAll(query: QueryOrderDto) {
    const { page = 1, limit = 15, search, status, governorate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(governorate && {
        governorate: { contains: governorate.trim(), mode: 'insensitive' },
      }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search.trim(), mode: 'insensitive' } },
          { customerName: { contains: search.trim(), mode: 'insensitive' } },
          { customerPhone: { contains: search.trim() } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => this.formatOrder(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<FormattedOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<FormattedOrder> {
    const existing = await this.findOne(id);

    if (existing.status === dto.status) {
      return existing;
    }

    if (existing.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot change status of an already cancelled order.',
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.CANCELLED) {
        const stockRestorations = new Map<string, number>();

        for (const item of existing.items) {
          if (item.itemType === ItemType.PRODUCT && item.productId) {
            stockRestorations.set(
              item.productId,
              (stockRestorations.get(item.productId) ?? 0) + item.quantity,
            );
          } else if (item.itemType === ItemType.PACKAGE && item.packageId) {
            const pkgItems = await tx.packageItem.findMany({
              where: { packageId: item.packageId },
              select: { productId: true, quantity: true },
            });

            for (const pkgItem of pkgItems) {
              const qtyToRestore = pkgItem.quantity * item.quantity;
              stockRestorations.set(
                pkgItem.productId,
                (stockRestorations.get(pkgItem.productId) ?? 0) + qtyToRestore,
              );
            }
          }
        }

        for (const [productId, qty] of stockRestorations.entries()) {
          await tx.product.updateMany({
            where: { id: productId },
            data: { stock: { increment: qty } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: ORDER_INCLUDE,
      });
    });

    return this.formatOrder(updatedOrder);
  }

  async getStats() {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAgg,
    ] = await this.prisma.$transaction([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
    ]);

    return {
      totalOrders,
      byStatus: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
    };
  }
}
