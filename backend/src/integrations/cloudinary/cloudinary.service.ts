import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { env } from '../../config/env';
import { BadRequestError, InternalServerError } from '../../shared/errors/app-error';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
}

export class CloudinaryService {
  constructor() {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  public isConfigured(): boolean {
    return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  }

  public async uploadBuffer(
    buffer: Buffer,
    folder: string = env.CLOUDINARY_FOLDER || 'foodshare_donations'
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new BadRequestError(
        'Cloudinary image upload service is not configured. Missing API credentials.',
        'CLOUDINARY_NOT_CONFIGURED'
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(
              new InternalServerError(
                error?.message || 'Failed to upload image to Cloudinary',
                'CLOUDINARY_UPLOAD_FAILED'
              )
            );
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            bytes: result.bytes,
            format: result.format,
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }
}
