import { Module } from '@nestjs/common';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';
import { CloudinaryProvider } from '../../config/cloudinary.config.js';

@Module({
  controllers: [UploadController],
  providers: [CloudinaryProvider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
