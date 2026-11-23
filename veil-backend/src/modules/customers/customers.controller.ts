import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@ApiTags('Customers (Admin)')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers with order counts (Admin)' })
  findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer profile, stats, and order history (Admin)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer information (Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }
}
