import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { TrackOrderDto } from './dto/track-order.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Place a new COD order (Public Checkout)' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Public()
  @Get('track')
  @ApiOperation({ summary: 'Track order status using order number & phone' })
  trackOrder(@Query() dto: TrackOrderDto) {
    return this.ordersService.trackOrder(dto);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order counts and revenue summary (Admin)' })
  getStats() {
    return this.ordersService.getStats();
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders with search & filters (Admin)' })
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full order snapshot details (Admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update order status & auto-restore stock if cancelled (Admin)',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }
}
