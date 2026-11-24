import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { CategoriesModule } from '../categories/catigories.module.js';
import { VariantsModule } from '../variants/variants.module.js';

@Module({
  imports: [CategoriesModule, VariantsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
