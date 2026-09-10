import { ReviewDecision } from '@prisma/client';
import { ReviewRepository } from '../repositories/review.repository';
import { ReviewQueryDto } from '../dto/review-query.dto';
import { RejectDonationDto } from '../dto/reject-donation.dto';
import { PaginatedReviewQueueResult, ReviewDetailResponse } from '../types/review.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class ReviewService {
  private reviewRepo: ReviewRepository;

  constructor(repository?: ReviewRepository) {
    this.reviewRepo = repository || new ReviewRepository();
  }

  public async getReviewQueue(query: ReviewQueryDto): Promise<PaginatedReviewQueueResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.reviewRepo.findReviewQueue({
      page,
      limit,
      status: query.status,
      category: query.category,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  public async getReviewDetail(donationId: string): Promise<ReviewDetailResponse> {
    const donation = await this.reviewRepo.findReviewDetailById(donationId);

    if (!donation) {
      throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
    }

    return donation;
  }

  public async approveDonation(donationId: string, reviewerId: string): Promise<any> {
    const result = await this.reviewRepo.executeReviewDecisionTransaction({
      donationId,
      reviewerId,
      decision: ReviewDecision.APPROVED,
    });

    return result;
  }

  public async rejectDonation(
    donationId: string,
    reviewerId: string,
    dto: RejectDonationDto
  ): Promise<any> {
    const normalizedReason = dto.reason.trim();

    const result = await this.reviewRepo.executeReviewDecisionTransaction({
      donationId,
      reviewerId,
      decision: ReviewDecision.REJECTED,
      reason: normalizedReason,
    });

    return result;
  }

  public async getReviewHistory(donationId: string): Promise<any> {
    const history = await this.reviewRepo.findReviewsByDonationId(donationId);

    if (!history) {
      throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
    }

    return history;
  }
}
