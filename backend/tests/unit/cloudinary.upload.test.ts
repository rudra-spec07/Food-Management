import request from 'supertest';
import { CloudinaryService } from '../../src/integrations/cloudinary/cloudinary.service';
import { singleImageUpload } from '../../src/shared/middleware/upload.middleware';
import express, { Request, Response } from 'express';

describe('Phase 3 — Cloudinary Image Upload & Middleware Unit Tests', () => {
  let testApp: express.Application;

  beforeAll(() => {
    testApp = express();
    testApp.use(express.json());
    testApp.post('/test-upload', singleImageUpload('image'), (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        file: req.file ? { mimetype: req.file.mimetype, size: req.file.size } : null,
        body: req.body,
      });
    });
    // Error handler
    testApp.use((err: any, _req: Request, res: Response, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    });
  });

  describe('CloudinaryService Unit Tests', () => {
    it('should report unconfigured when Cloudinary environment credentials are missing', () => {
      const service = new CloudinaryService();
      expect(service.isConfigured()).toBe(false);
    });

    it('should throw CLOUDINARY_NOT_CONFIGURED error when upload is attempted without credentials', async () => {
      const service = new CloudinaryService();
      const buffer = Buffer.from('dummy image content');
      await expect(service.uploadBuffer(buffer)).rejects.toThrow('Cloudinary image upload service is not configured.');
    });
  });

  describe('Upload Middleware File Type & Size Validation Tests', () => {
    it('should accept valid JPEG image file upload', async () => {
      const dummyJpeg = Buffer.from('fake-jpeg-binary-data');
      const res = await request(testApp)
        .post('/test-upload')
        .attach('image', dummyJpeg, { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file.mimetype).toBe('image/jpeg');
    });

    it('should accept valid PNG image file upload', async () => {
      const dummyPng = Buffer.from('fake-png-binary-data');
      const res = await request(testApp)
        .post('/test-upload')
        .attach('image', dummyPng, { filename: 'test.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file.mimetype).toBe('image/png');
    });

    it('should reject invalid MIME type (e.g. PDF/text)', async () => {
      const dummyPdf = Buffer.from('fake-pdf-content');
      const res = await request(testApp)
        .post('/test-upload')
        .attach('image', dummyPdf, { filename: 'document.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
      expect(res.body.error.message).toContain('Only JPEG, PNG, and WebP images are allowed');
    });

    it('should reject oversized file exceeding 5 MB limit', async () => {
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const res = await request(testApp)
        .post('/test-upload')
        .attach('image', oversizedBuffer, { filename: 'huge.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
      expect(res.body.error.message).toContain('File size exceeds maximum allowed limit');
    });

    it('should process request without file when image is omitted', async () => {
      const res = await request(testApp)
        .post('/test-upload')
        .send({ category: 'COOKED_MEAL', description: 'Fresh food' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file).toBeNull();
      expect(res.body.body.category).toBe('COOKED_MEAL');
    });
  });
});
