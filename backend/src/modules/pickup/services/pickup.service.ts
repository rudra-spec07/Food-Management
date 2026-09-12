import { PickupRepository } from '../repositories/pickup.repository';
import {
  WorkerPickupQueryDto,
  AdminPickupQueryDto,
  CompletePickupDto,
  FailPickupDto,
  PaginatedPickupResult,
} from '../types/pickup.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class PickupService {
  private pickupRepo: PickupRepository;

  constructor(repository?: PickupRepository) {
    this.pickupRepo = repository || new PickupRepository();
  }

  public async getWorkerPickups(
    workerId: string,
    query: WorkerPickupQueryDto
  ): Promise<PaginatedPickupResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.pickupRepo.findWorkerPickups(workerId, {
      page,
      limit,
      status: query.status,
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

  public async getWorkerPickupDetail(pickupId: string, workerId: string): Promise<any> {
    const pickup = await this.pickupRepo.findWorkerPickupDetail(pickupId, workerId);

    if (!pickup) {
      throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
    }

    return pickup;
  }

  public async startPickup(pickupId: string, workerId: string): Promise<any> {
    return this.pickupRepo.executeStartPickupTransaction({ pickupId, workerId });
  }

  public async completePickup(
    pickupId: string,
    workerId: string,
    dto: CompletePickupDto
  ): Promise<any> {
    return this.pickupRepo.executeCompletePickupTransaction({
      pickupId,
      workerId,
      completionNotes: dto.completionNotes,
    });
  }

  public async failPickup(pickupId: string, workerId: string, dto: FailPickupDto): Promise<any> {
    return this.pickupRepo.executeFailPickupTransaction({
      pickupId,
      workerId,
      reason: dto.reason,
    });
  }

  public async getAdminPickups(
    query: AdminPickupQueryDto
  ): Promise<PaginatedPickupResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.pickupRepo.findAdminPickups({
      page,
      limit,
      status: query.status,
      workerId: query.workerId,
      donationId: query.donationId,
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

  public async getAdminPickupDetail(pickupId: string): Promise<any> {
    const pickup = await this.pickupRepo.findAdminPickupDetail(pickupId);

    if (!pickup) {
      throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
    }

    return pickup;
  }

  public async getAdminPickupEvents(pickupId: string): Promise<any[]> {
    return this.pickupRepo.findPickupEvents(pickupId);
  }
}
