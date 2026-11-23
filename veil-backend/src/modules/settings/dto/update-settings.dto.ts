import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Veil Perfumes' })
  @IsString()
  @IsOptional()
  storeName?: string;

  @ApiPropertyOptional({ example: '+201000000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+201000000000' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/veil.perfumes' })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://facebook.com/veil.perfumes' })
  @IsUrl()
  @IsOptional()
  facebookUrl?: string | null;

  @ApiPropertyOptional({
    example: 60,
    description: 'Default shipping fee in EGP',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  defaultDeliveryFee?: number;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Order subtotal required for free shipping (null to disable)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  freeShippingThreshold?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Toggle whether the store is currently accepting orders',
  })
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;
}
