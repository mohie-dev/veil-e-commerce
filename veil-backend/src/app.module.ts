import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AppService } from './app.service.js';
import { AppController } from './app.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { CategoriesModule } from './modules/categories/catigories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { PackagesModule } from './modules/packages/packages.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CustomersModule,
    CategoriesModule,
    ProductsModule,
    PackagesModule,
    UploadModule,
    SettingsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
