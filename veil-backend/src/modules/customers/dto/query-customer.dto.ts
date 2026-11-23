import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCustomerDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 15 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'Search by name, phone, or email' })
  @IsString()
  @IsOptional()
  search?: string;
}
