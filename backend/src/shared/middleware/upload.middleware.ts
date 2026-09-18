import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { BadRequestError } from '../errors/app-error';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: (env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          'INVALID_FILE_TYPE'
        )
      );
    }
  },
});

export const singleImageUpload = (fieldName: string = 'image') => {
  const middleware = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new BadRequestError(
                `File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB || 5} MB.`,
                'FILE_TOO_LARGE'
              )
            );
          }
          return next(new BadRequestError(err.message, 'FILE_UPLOAD_ERROR'));
        }
        return next(err);
      }
      next();
    });
  };
};
