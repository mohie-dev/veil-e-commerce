import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PackageItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreatePackageDto {
  @ApiProperty({ example: 'Royal Oud Gift Box' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      'Luxury gift set featuring Midnight Oud 100ml and Amber Noir 50ml.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 2100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price: number;

  @ApiPropertyOptional({ example: 1750 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  discountExpiresAt?: string;

  @ApiProperty({
    example: ['https://res.cloudinary.com/demo/image/upload/veil-box.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({ type: [PackageItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items: PackageItemDto[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
