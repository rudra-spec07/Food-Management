import { Donation, DonationStatus, AuditEventType } from '@prisma/client';
import { DonationRepository } from '../repositories/donation.repository';
import { CreateDonationDto, UpdateDonationDto, CancelDonationDto, DonationQueryDto } from '../dto/donation.dto';
import { PaginatedDonationResult } from '../types/donation.types';
import { isDonationEditableByDonor, isDonationCancellableByDonor, canTransition } from '../state-machine/donation-state-machine';
import { NotFoundError, BadRequestError } from '../../../shared/errors/app-error';

export class DonationService {
  private donationRepo: DonationRepository;

  constructor(repository?: DonationRepository) {
    this.donationRepo = repository || new DonationRepository();
  }

  public async createDonation(donorId: string, dto: CreateDonationDto): Promise<Donation> {
    return this.donationRepo.client.$transaction(async (tx) => {
      const preparedAtDate = new Date(dto.preparedAt);
      const expiresAtDate = new Date(dto.expiresAt);

      const donation = await this.donationRepo.create(
        {
          donor: { connect: { id: donorId } },
          category: dto.category,
          description: dto.description,
          quantity: dto.quantity,
          quantityUnit: dto.quantityUnit,
          preparedAt: preparedAtDate,
          expiresAt: expiresAtDate,
          pickupAddress: dto.pickupAddress,
          pickupLatitude: dto.pickupLatitude !== undefined ? dto.pickupLatitude : null,
          pickupLongitude: dto.pickupLongitude !== undefined ? dto.pickupLongitude : null,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          photoUrl: dto.photoUrl || null,
          notes: dto.notes || null,
          status: DonationStatus.PENDING_REVIEW,
        },
        tx
      );

      await this.donationRepo.createStatusHistory(
        {
          donation: { connect: { id: donation.id } },
          fromStatus: null,
          toStatus: DonationStatus.PENDING_REVIEW,
          user: { connect: { id: donorId } },
          reason: 'Initial donation submission',
        },
        tx
      );

      await this.donationRepo.createAuditLog(
        {
          userId: donorId,
          action: AuditEventType.DONATION_CREATED,
          entityType: 'Donation',
          entityId: donation.id,
          metadata: {
            category: donation.category,
            quantity: donation.quantity.toString(),
            quantityUnit: donation.quantityUnit,
            status: donation.status,
          },
        },
        tx
      );

      return donation;
    });
  }

  public async getDonationById(donationId: string, donorId: string): Promise<Donation> {
    const donation = await this.donationRepo.findByIdAndDonor(donationId, donorId);

    if (!donation) {
      throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
    }

    return donation;
  }

  public async listMyDonations(
    donorId: string,
    query: DonationQueryDto
  ): Promise<PaginatedDonationResult<Donation>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.donationRepo.findManyByDonor(
      donorId,
      page,
      limit,
      query.status
    );

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

  public async updateDonation(
    donationId: string,
    donorId: string,
    dto: UpdateDonationDto
  ): Promise<Donation> {
    return this.donationRepo.client.$transaction(async (tx) => {
      const existing = await this.donationRepo.findByIdAndDonor(donationId, donorId, tx);

      if (!existing) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      if (!isDonationEditableByDonor(existing.status)) {
        throw new BadRequestError(
          `Donation cannot be updated when in ${existing.status} status. Only PENDING_REVIEW donations can be edited.`,
          'DONATION_NOT_EDITABLE'
        );
      }

      // Explicit field mapping for Mass Assignment Protection
      const updateData: Record<string, any> = {};

      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
      if (dto.quantityUnit !== undefined) updateData.quantityUnit = dto.quantityUnit;
      if (dto.preparedAt !== undefined) updateData.preparedAt = new Date(dto.preparedAt);
      if (dto.expiresAt !== undefined) updateData.expiresAt = new Date(dto.expiresAt);
      if (dto.pickupAddress !== undefined) updateData.pickupAddress = dto.pickupAddress;
      if (dto.pickupLatitude !== undefined) updateData.pickupLatitude = dto.pickupLatitude;
      if (dto.pickupLongitude !== undefined) updateData.pickupLongitude = dto.pickupLongitude;
      if (dto.contactName !== undefined) updateData.contactName = dto.contactName;
      if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone;
      if (dto.photoUrl !== undefined) updateData.photoUrl = dto.photoUrl;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      // Validate merged date constraints if dates are updated
      const finalPreparedAt = updateData.preparedAt || existing.preparedAt;
      const finalExpiresAt = updateData.expiresAt || existing.expiresAt;

      if (finalExpiresAt.getTime() <= finalPreparedAt.getTime()) {
        throw new BadRequestError('expiresAt must be later than preparedAt', 'DONATION_INVALID_DATE_RANGE');
      }

      const updated = await this.donationRepo.update(donationId, updateData, tx);

      await this.donationRepo.createAuditLog(
        {
          userId: donorId,
          action: AuditEventType.DONATION_UPDATED,
          entityType: 'Donation',
          entityId: donationId,
          metadata: {
            updatedFields: Object.keys(updateData),
          },
        },
        tx
      );

      return updated;
    });
  }

  public async cancelDonation(
    donationId: string,
    donorId: string,
    dto: CancelDonationDto
  ): Promise<Donation> {
    return this.donationRepo.client.$transaction(async (tx) => {
      const existing = await this.donationRepo.findByIdAndDonor(donationId, donorId, tx);

      if (!existing) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      if (!isDonationCancellableByDonor(existing.status) || !canTransition(existing.status, DonationStatus.CANCELLED)) {
        throw new BadRequestError(
          `Donation cannot be cancelled from ${existing.status} status`,
          'DONATION_CANNOT_BE_CANCELLED'
        );
      }

      const now = new Date();
      const reasonText = dto.reason || 'Cancelled by donor';

      const cancelled = await this.donationRepo.update(
        donationId,
        {
          status: DonationStatus.CANCELLED,
          cancelledAt: now,
        },
        tx
      );

      await this.donationRepo.createStatusHistory(
        {
          donation: { connect: { id: donationId } },
          fromStatus: existing.status,
          toStatus: DonationStatus.CANCELLED,
          user: { connect: { id: donorId } },
          reason: reasonText,
        },
        tx
      );

      await this.donationRepo.createAuditLog(
        {
          userId: donorId,
          action: AuditEventType.DONATION_CANCELLED,
          entityType: 'Donation',
          entityId: donationId,
          metadata: {
            fromStatus: existing.status,
            toStatus: DonationStatus.CANCELLED,
            reason: reasonText,
          },
        },
        tx
      );

      return cancelled;
    });
  }
}
