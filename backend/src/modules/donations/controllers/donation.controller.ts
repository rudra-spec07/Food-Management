import { Request, Response, NextFunction } from 'express';
import { DonationService } from '../services/donation.service';
import { createDonationSchema, updateDonationSchema, cancelDonationSchema, donationQuerySchema } from '../dto/donation.dto';
import { UnauthorizedError } from '../../../shared/errors/app-error';

const donationService = new DonationService();

export class DonationController {
  public createDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError();
      }

      const validatedDto = createDonationSchema.parse(req.body);
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

      const validatedDto = updateDonationSchema.parse(req.body);
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
