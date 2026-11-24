import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ProductVariantInputDto {
  @ApiProperty({ example: '100ml' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 1200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price: number;

  @ApiPropertyOptional({ example: 950 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @IsOptional()
  discountPrice?: number | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  discountExpiresAt?: string | null;

  @ApiPropertyOptional({ example: 25, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class CreateVariantDto extends ProductVariantInputDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;
}
