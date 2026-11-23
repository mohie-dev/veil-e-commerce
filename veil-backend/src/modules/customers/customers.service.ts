import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Customer, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpsertCustomerDto } from './dto/upsert-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');

    if (cleaned.startsWith('+20')) {
      return `0${cleaned.slice(3)}`;
    }
    if (cleaned.startsWith('20') && cleaned.length === 12) {
      return `0${cleaned.slice(2)}`;
    }
    if (!cleaned.startsWith('0') && cleaned.length === 10) {
      return `0${cleaned}`;
    }

    return cleaned;
  }

  async findOrCreate(
    dto: UpsertCustomerDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const db = tx ?? this.prisma;
    const normalizedPhone = this.normalizePhone(dto.phone);

    return db.customer.upsert({
      where: { phone: normalizedPhone },
      update: {
        name: dto.name,
        ...(dto.email && { email: dto.email }),
        ...(dto.address && { address: dto.address }),
      },
      create: {
        name: dto.name,
        phone: normalizedPhone,
        email: dto.email ?? null,
        address: dto.address ?? null,
      },
    });
  }

  async findAll(query: QueryCustomerDto) {
    const { page = 1, limit = 15, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search.trim() } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const validOrders = customer.orders.filter(
      (order) => order.status !== OrderStatus.CANCELLED,
    );

    const totalSpent = validOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    const formattedOrders = customer.orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    }));

    return {
      ...customer,
      orders: formattedOrders,
      stats: {
        totalOrders: customer.orders.length,
        completedOrActiveOrders: validOrders.length,
        totalSpent,
      },
    };
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.findOne(id);

    let normalizedPhone: string | undefined;
    if (dto.phone) {
      normalizedPhone = this.normalizePhone(dto.phone);
      const existingWithPhone = await this.prisma.customer.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingWithPhone && existingWithPhone.id !== id) {
        throw new ConflictException(
          'Another customer already exists with this phone number',
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(normalizedPhone && { phone: normalizedPhone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
      },
    });
  }
}
