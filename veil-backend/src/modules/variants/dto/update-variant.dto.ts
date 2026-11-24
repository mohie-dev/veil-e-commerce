import { PartialType } from '@nestjs/swagger';
import { ProductVariantInputDto } from './create-variant.dto.js';

export class UpdateVariantDto extends PartialType(ProductVariantInputDto) {}
