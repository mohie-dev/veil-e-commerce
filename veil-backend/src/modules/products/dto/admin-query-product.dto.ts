import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryProductDto } from './query-product.dto.js';

export class AdminQueryProductDto extends QueryProductDto {
  @ApiPropertyOptional({
    description: 'Filter by active status (true, false, or omit for all)',
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter products with low stock (stock <= 5)',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;
}
