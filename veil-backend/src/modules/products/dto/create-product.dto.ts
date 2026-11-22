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
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PerfumeNotesDto {
  @ApiPropertyOptional({ example: 'Bergamot, Pink Pepper' })
  @IsString()
  @IsOptional()
  top?: string;

  @ApiPropertyOptional({ example: 'Damask Rose, Saffron' })
  @IsString()
  @IsOptional()
  heart?: string;

  @ApiPropertyOptional({ example: 'Agarwood (Oud), Amber, Vanilla' })
  @IsString()
  @IsOptional()
  base?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Midnight Oud' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'A deep, luxurious blend of aged Cambodian oud and warm amber.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price: number;

  @ApiPropertyOptional({ example: 950 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  discountExpiresAt?: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: '100ml' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiPropertyOptional({ example: 'Eau de Parfum' })
  @IsString()
  @IsOptional()
  concentration?: string;

  @ApiPropertyOptional({ type: PerfumeNotesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PerfumeNotesDto)
  @IsOptional()
  notes?: PerfumeNotesDto;

  @ApiProperty({
    example: ['https://res.cloudinary.com/demo/image/upload/veil-oud.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
