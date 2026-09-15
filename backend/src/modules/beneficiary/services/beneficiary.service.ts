import { BeneficiaryRepository } from '../repositories/beneficiary.repository';
import { CreateBeneficiaryParams, UpdateBeneficiaryParams, BeneficiaryFilterOptions } from '../types/beneficiary.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class BeneficiaryService {
  private repository: BeneficiaryRepository;

  constructor(repository?: BeneficiaryRepository) {
    this.repository = repository || new BeneficiaryRepository();
  }

  public async createBeneficiary(params: CreateBeneficiaryParams, actorId: string): Promise<any> {
    return this.repository.createBeneficiary(params, actorId);
  }

  public async getBeneficiaries(options: BeneficiaryFilterOptions): Promise<{
    items: any[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const [items, totalItems] = await this.repository.findBeneficiaries(options);
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

  public async getBeneficiaryDetail(id: string): Promise<any> {
    const beneficiary = await this.repository.findBeneficiaryById(id);
    if (!beneficiary) {
      throw new NotFoundError('Beneficiary not found', 'BENEFICIARY_NOT_FOUND');
    }
    return beneficiary;
  }

  public async updateBeneficiary(id: string, params: UpdateBeneficiaryParams, actorId: string): Promise<any> {
    const existing = await this.repository.findBeneficiaryById(id);
    if (!existing) {
      throw new NotFoundError('Beneficiary not found', 'BENEFICIARY_NOT_FOUND');
    }

    return this.repository.updateBeneficiary(id, params, actorId);
  }

  public async getBeneficiaryHistory(
    id: string,
    page: number,
    limit: number
  ): Promise<{
    items: any[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const existing = await this.repository.findBeneficiaryById(id);
    if (!existing) {
      throw new NotFoundError('Beneficiary not found', 'BENEFICIARY_NOT_FOUND');
    }

    const [items, totalItems] = await this.repository.findBeneficiaryHistory(id, page, limit);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }
}
