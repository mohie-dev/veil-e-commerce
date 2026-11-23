import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ProductsModule } from '../products/products.module.js';
import { PackagesModule } from '../packages/packages.module.js';

@Module({
  imports: [SettingsModule, CustomersModule, ProductsModule, PackagesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
