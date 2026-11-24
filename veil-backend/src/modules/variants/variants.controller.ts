import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VariantsService } from './variants.service.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@ApiTags('Product Variants (Admin)')
@ApiBearerAuth()
@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  @ApiOperation({
    summary: 'Add a new size variant to an existing product (Admin)',
  })
  create(@Body() dto: CreateVariantDto) {
    return this.variantsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update variant size, price, discount, or stock (Admin)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product variant (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.variantsService.remove(id);
  }
}
