import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemInputDto {
  @ApiProperty({ enum: ItemType, example: ItemType.PRODUCT })
  @IsEnum(ItemType)
  @IsNotEmpty()
  itemType: ItemType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the ProductVariant (size) or Package',
  })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Ahmed Mohamed' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+20|20|0)?1[0125][0-9]{8}$/, {
    message: 'Please provide a valid Egyptian mobile number',
  })
  customerPhone: string;

  @ApiPropertyOptional({ example: '01112345678' })
  @IsString()
  @IsOptional()
  @Matches(/^(\+20|20|0)?1[0125][0-9]{8}$/, {
    message: 'Please provide a valid Egyptian alternative mobile number',
  })
  alternativePhone?: string;

  @ApiPropertyOptional({ example: 'ahmed@example.com' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ example: 'Cairo' })
  @IsString()
  @IsNotEmpty()
  governorate: string;

  @ApiProperty({ example: '15 Tahrir St, Floor 3, Apt 6, Dokki' })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiPropertyOptional({ example: 'Please call before arrival' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
