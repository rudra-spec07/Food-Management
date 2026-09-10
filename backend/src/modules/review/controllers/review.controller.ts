import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { ReviewQueryDto } from '../dto/review-query.dto';
import { RejectDonationDto } from '../dto/reject-donation.dto';

export class ReviewController {
  private service: ReviewService;

  constructor(service?: ReviewService) {
    this.service = service || new ReviewService();
  }

  public getReviewQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ReviewQueryDto;
      const result = await this.service.getReviewQueue(query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public getReviewDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { donationId } = req.params;
      const donation = await this.service.getReviewDetail(donationId);

      res.status(200).json({
        success: true,
        data: { donation },
      });
    } catch (err) {
      next(err);
    }
  };

  public approveDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { donationId } = req.params;
      const adminId = req.user!.id;

      const result = await this.service.approveDonation(donationId, adminId);

      res.status(200).json({
        success: true,
        message: 'Donation approved successfully',
        data: {
          donation: result.updatedDonation,
          review: result.review,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public rejectDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { donationId } = req.params;
      const adminId = req.user!.id;
      const dto = req.body as RejectDonationDto;

      const result = await this.service.rejectDonation(donationId, adminId, dto);

      res.status(200).json({
        success: true,
        message: 'Donation rejected successfully',
        data: {
          donation: result.updatedDonation,
          review: result.review,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getReviewHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { donationId } = req.params;
      const history = await this.service.getReviewHistory(donationId);

      res.status(200).json({
        success: true,
        data: { history },
      });
    } catch (err) {
      next(err);
    }
  };
}
