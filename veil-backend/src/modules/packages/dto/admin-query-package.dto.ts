import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryPackageDto } from './query-package.dto.js';

export class AdminQueryPackageDto extends QueryPackageDto {
  @ApiPropertyOptional({
    description: 'Filter by active status (true, false, or omit for all)',
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
