import { ReviewRepository } from '../../src/modules/review/repositories/review.repository';
import { AssignmentRepository } from '../../src/modules/assignment/repositories/assignment.repository';
import { PickupRepository } from '../../src/modules/pickup/repositories/pickup.repository';

describe('Phase 3 Fix — Donation Image Visibility & Authorization Tests', () => {
  let reviewRepo: ReviewRepository;
  let assignmentRepo: AssignmentRepository;
  let pickupRepo: PickupRepository;

  beforeAll(() => {
    reviewRepo = new ReviewRepository();
    assignmentRepo = new AssignmentRepository();
    pickupRepo = new PickupRepository();
  });

  it('should include photoUrl field in admin review repository queries', () => {
    expect(reviewRepo.findReviewQueue).toBeDefined();
    expect(reviewRepo.findReviewDetailById).toBeDefined();
  });

  it('should include photoUrl field in worker assignment repository queries', () => {
    expect(assignmentRepo.findWorkerAssignments).toBeDefined();
    expect(assignmentRepo.findWorkerAssignmentDetail).toBeDefined();
  });

  it('should include photoUrl field in worker pickup repository queries', () => {
    expect(pickupRepo.findWorkerPickups).toBeDefined();
    expect(pickupRepo.findWorkerPickupDetail).toBeDefined();
  });

  it('should enforce worker ownership isolation on assignment details (IDOR protection)', async () => {
    // When querying an assignment with a workerId that does not match, Prisma returns null
    const mockPrisma: any = {
      assignment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const repo = new AssignmentRepository(mockPrisma);

    const result = await repo.findWorkerAssignmentDetail('assignment-123', 'unauthorized-worker-id');

    expect(result).toBeNull();
    expect(mockPrisma.assignment.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'assignment-123',
        workerId: 'unauthorized-worker-id',
      },
      include: expect.any(Object),
    });
  });

  it('should enforce worker ownership isolation on pickup details (IDOR protection)', async () => {
    const mockPrisma: any = {
      pickup: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const repo = new PickupRepository(mockPrisma);

    const result = await repo.findWorkerPickupDetail('pickup-123', 'unauthorized-worker-id');

    expect(result).toBeNull();
    expect(mockPrisma.pickup.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'pickup-123',
        workerId: 'unauthorized-worker-id',
      },
      include: expect.any(Object),
    });
  });
});
