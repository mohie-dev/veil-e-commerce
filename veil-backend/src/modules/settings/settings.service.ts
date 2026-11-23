import { Injectable } from '@nestjs/common';
import { StoreSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { FormattedStoreSettings } from '../../common/interfaces/format-store-settings.interface.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatSettings(settings: StoreSettings): FormattedStoreSettings {
    return {
      ...settings,
      defaultDeliveryFee: Number(settings.defaultDeliveryFee),
      freeShippingThreshold:
        settings.freeShippingThreshold !== null
          ? Number(settings.freeShippingThreshold)
          : null,
    };
  }

  async getSettings(): Promise<FormattedStoreSettings> {
    let settings = await this.prisma.storeSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.storeSettings.create({
        data: {
          storeName: 'Veil',
          defaultDeliveryFee: 60,
          freeShippingThreshold: 1500,
          isOpen: true,
        },
      });
    }

    return this.formatSettings(settings);
  }

  async updateSettings(
    dto: UpdateSettingsDto,
  ): Promise<FormattedStoreSettings> {
    const current = await this.getSettings();

    const updated = await this.prisma.storeSettings.update({
      where: { id: current.id },
      data: {
        ...(dto.storeName !== undefined && { storeName: dto.storeName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.instagramUrl !== undefined && {
          instagramUrl: dto.instagramUrl,
        }),
        ...(dto.facebookUrl !== undefined && { facebookUrl: dto.facebookUrl }),
        ...(dto.defaultDeliveryFee !== undefined && {
          defaultDeliveryFee: dto.defaultDeliveryFee,
        }),
        ...(dto.freeShippingThreshold !== undefined && {
          freeShippingThreshold: dto.freeShippingThreshold,
        }),
        ...(dto.isOpen !== undefined && { isOpen: dto.isOpen }),
      },
    });

    return this.formatSettings(updated);
  }
}
