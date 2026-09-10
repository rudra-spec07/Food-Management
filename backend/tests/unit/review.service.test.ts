import { ReviewService } from '../../src/modules/review/services/review.service';
import { ReviewRepository } from '../../src/modules/review/repositories/review.repository';
import { rejectDonationSchema } from '../../src/modules/review/dto/reject-donation.dto';
import { reviewQuerySchema } from '../../src/modules/review/dto/review-query.dto';
import { DonationStatus, ReviewDecision } from '@prisma/client';
import { NotFoundError } from '../../src/shared/errors/app-error';

describe('Module 03 — ReviewService Unit Tests', () => {
  let service: ReviewService;
  let mockRepo: jest.Mocked<ReviewRepository>;

  beforeEach(() => {
    mockRepo = {
      findReviewQueue: jest.fn(),
      findReviewDetailById: jest.fn(),
      findReviewsByDonationId: jest.fn(),
      executeReviewDecisionTransaction: jest.fn(),
    } as any;

    service = new ReviewService(mockRepo);
  });

  describe('RejectDonation DTO Validation', () => {
    it('should validate and normalize a valid rejection reason', () => {
      const parsed = rejectDonationSchema.parse({ reason: '  Food information is incomplete.  ' });
      expect(parsed.reason).toBe('Food information is incomplete.');
    });

    it('should reject an empty rejection reason', () => {
      expect(() => rejectDonationSchema.parse({ reason: '   ' })).toThrow();
    });

    it('should reject a reason exceeding 2000 characters', () => {
      const longReason = 'a'.repeat(2001);
      expect(() => rejectDonationSchema.parse({ reason: longReason })).toThrow();
    });
  });

  describe('ReviewQuery DTO Validation', () => {
    it('should allow valid status filters PENDING_REVIEW, APPROVED, REJECTED', () => {
      expect(reviewQuerySchema.parse({ status: 'PENDING_REVIEW' }).status).toBe('PENDING_REVIEW');
      expect(reviewQuerySchema.parse({ status: 'APPROVED' }).status).toBe('APPROVED');
      expect(reviewQuerySchema.parse({ status: 'REJECTED' }).status).toBe('REJECTED');
    });

    it('should reject non-reviewable status filters like COMPLETED or PICKED_UP', () => {
      expect(() => reviewQuerySchema.parse({ status: 'COMPLETED' })).toThrow();
      expect(() => reviewQuerySchema.parse({ status: 'PICKED_UP' })).toThrow();
    });
  });

  describe('approveDonation', () => {
    it('should delegate approval to repository transaction with APPROVED decision', async () => {
      const mockResult = {
        updatedDonation: { id: 'don-1', status: DonationStatus.APPROVED } as any,
        review: { id: 'rev-1', decision: ReviewDecision.APPROVED } as any,
      };

      mockRepo.executeReviewDecisionTransaction.mockResolvedValueOnce(mockResult);

      const res = await service.approveDonation('don-1', 'admin-123');

      expect(mockRepo.executeReviewDecisionTransaction).toHaveBeenCalledWith({
        donationId: 'don-1',
        reviewerId: 'admin-123',
        decision: ReviewDecision.APPROVED,
      });

      expect(res).toBe(mockResult);
    });
  });

  describe('rejectDonation', () => {
    it('should trim reason and delegate to repository transaction with REJECTED decision', async () => {
      const mockResult = {
        updatedDonation: { id: 'don-1', status: DonationStatus.REJECTED } as any,
        review: { id: 'rev-1', decision: ReviewDecision.REJECTED } as any,
      };

      mockRepo.executeReviewDecisionTransaction.mockResolvedValueOnce(mockResult);

      const res = await service.rejectDonation('don-1', 'admin-123', {
        reason: '  Improper packaging  ',
      });

      expect(mockRepo.executeReviewDecisionTransaction).toHaveBeenCalledWith({
        donationId: 'don-1',
        reviewerId: 'admin-123',
        decision: ReviewDecision.REJECTED,
        reason: 'Improper packaging',
      });

      expect(res).toBe(mockResult);
    });
  });

  describe('getReviewDetail', () => {
    it('should throw NotFoundError if donation does not exist', async () => {
      mockRepo.findReviewDetailById.mockResolvedValueOnce(null);

      await expect(service.getReviewDetail('non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});
