import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ProductVariantInputDto } from '../../variants/dto/create-variant.dto.js';

export class PerfumeNotesDto {
  @ApiPropertyOptional({ example: 'Bergamot, Pink Pepper' })
  @IsString()
  @IsOptional()
  top?: string;

  @ApiPropertyOptional({ example: 'Damask Rose, Saffron' })
  @IsString()
  @IsOptional()
  heart?: string;

  @ApiPropertyOptional({ example: 'Oud, Amber, Vanilla' })
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
    example: 'Deep woody oriental fragrance crafted for evening wear.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

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
    example: ['https://res.cloudinary.com/demo/image/upload/midnight-oud.jpg'],
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

  @ApiProperty({ type: [ProductVariantInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants: ProductVariantInputDto[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
