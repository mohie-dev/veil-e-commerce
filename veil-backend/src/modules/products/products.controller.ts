import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AdminQueryProductDto } from './dto/admin-query-product.dto.js';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new perfume product (Admin)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active products for storefront' })
  findAllPublic(@Query() query: QueryProductDto) {
    return this.productsService.findAll({ ...query, isActive: true });
  }

  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products with admin filters (Admin)' })
  findAllAdmin(@Query() query: AdminQueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get single product details by UUID or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product details, discount, or stock (Admin)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
