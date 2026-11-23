import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpsertCustomerDto {
  @ApiProperty({ example: 'Ahmed Mohamed' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+20|20|0)?1[0125][0-9]{8}$/, {
    message: 'Please provide a valid Egyptian mobile number',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'ahmed@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '15 Tahrir St, Dokki, Giza' })
  @IsString()
  @IsOptional()
  address?: string;
}
