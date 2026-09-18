import { Request, Response, NextFunction } from 'express';
import { DonationService } from '../services/donation.service';
import { createDonationSchema, updateDonationSchema, cancelDonationSchema, donationQuerySchema } from '../dto/donation.dto';
import { UnauthorizedError } from '../../../shared/errors/app-error';
import { CloudinaryService } from '../../../integrations/cloudinary/cloudinary.service';

const donationService = new DonationService();
const cloudinaryService = new CloudinaryService();

function parseBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const parsed = { ...body };
  if (typeof parsed.quantity === 'string' && parsed.quantity.trim() !== '') {
    const num = Number(parsed.quantity);
    if (!isNaN(num)) parsed.quantity = num;
  }
  if (typeof parsed.pickupLatitude === 'string') {
    if (parsed.pickupLatitude.trim() === '') {
      delete parsed.pickupLatitude;
    } else {
      const num = Number(parsed.pickupLatitude);
      if (!isNaN(num)) parsed.pickupLatitude = num;
    }
  }
  if (typeof parsed.pickupLongitude === 'string') {
    if (parsed.pickupLongitude.trim() === '') {
      delete parsed.pickupLongitude;
    } else {
      const num = Number(parsed.pickupLongitude);
      if (!isNaN(num)) parsed.pickupLongitude = num;
    }
  }
  if (typeof parsed.photoUrl === 'string' && parsed.photoUrl.trim() === '') {
    delete parsed.photoUrl;
  }
  if (typeof parsed.notes === 'string' && parsed.notes.trim() === '') {
    delete parsed.notes;
  }
  return parsed;
}

export class DonationController {
  public createDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const body = parseBody(req.body);

      if (req.file) {
        const uploadResult = await cloudinaryService.uploadBuffer(req.file.buffer);
        body.photoUrl = uploadResult.secure_url;
      }

      const validatedDto = createDonationSchema.parse(body);
      const donation = await donationService.createDonation(req.user.id, validatedDto);

      res.status(201).json({
        success: true,
        data: donation,
      });
    } catch (err) {
      next(err);
    }
  };

  public getMyDonations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const queryDto = donationQuerySchema.parse(req.query);
      const result = await donationService.listMyDonations(req.user.id, queryDto);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public getDonationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const donation = await donationService.getDonationById(req.params.donationId, req.user.id);

      res.status(200).json({
        success: true,
        data: donation,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const body = parseBody(req.body);

      if (req.file) {
        const uploadResult = await cloudinaryService.uploadBuffer(req.file.buffer);
        body.photoUrl = uploadResult.secure_url;
      }

      const validatedDto = updateDonationSchema.parse(body);
      const updated = await donationService.updateDonation(
        req.params.donationId,
        req.user.id,
        validatedDto
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  public cancelDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const validatedDto = cancelDonationSchema.parse(req.body);
      const cancelled = await donationService.cancelDonation(
        req.params.donationId,
        req.user.id,
        validatedDto
      );

      res.status(200).json({
        success: true,
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  };
}
