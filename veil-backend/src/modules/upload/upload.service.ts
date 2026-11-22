import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from '../../config/cloudinary.config.js';
import "multer"; // Ensure multer types are available

@Injectable()
export class UploadService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinaryInstance: any) {}

  async uploadImage(file: Express.Multer.File, folder = 'veil') {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(
              new BadRequestException(error?.message || 'Image upload failed'),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
