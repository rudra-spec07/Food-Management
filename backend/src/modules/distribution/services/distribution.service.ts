import { UserRole } from '@prisma/client';
import { DistributionRepository } from '../repositories/distribution.repository';
import { CreateDistributionInput, DistributionFilterOptions } from '../types/distribution.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class DistributionService {
  private repository: DistributionRepository;

  constructor(repository?: DistributionRepository) {
    this.repository = repository || new DistributionRepository();
  }

  public async createDistribution(
    input: CreateDistributionInput,
    distributedBy: string,
    actorRole: UserRole
  ): Promise<any> {
    return this.repository.executeCreateDistributionTransaction({
      inventoryId: input.inventoryId,
      recipientName: input.recipientName,
      quantity: Number(input.quantity),
      unit: input.unit,
      notes: input.notes,
      distributedBy,
      actorRole,
    });
  }

  public async getDistributions(options: DistributionFilterOptions): Promise<{
    items: any[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const [items, totalItems] = await this.repository.findDistributions(options);
    const totalPages = Math.ceil(totalItems / options.limit) || 1;

    return {
      items,
      pagination: {
        page: options.page,
        limit: options.limit,
        totalItems,
        totalPages,
      },
    };
  }

  public async getDistributionDetail(id: string): Promise<any> {
    const record = await this.repository.findDistributionDetail(id);
    if (!record) {
      throw new NotFoundError('Distribution record not found', 'DISTRIBUTION_NOT_FOUND');
    }
    return record;
  }
}
