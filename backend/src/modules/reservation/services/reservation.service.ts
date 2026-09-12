import { UserRole } from '@prisma/client';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CreateReservationInput, ReservationFilterOptions } from '../types/reservation.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class ReservationService {
  private repository: ReservationRepository;

  constructor(repository?: ReservationRepository) {
    this.repository = repository || new ReservationRepository();
  }

  public async createReservation(
    input: CreateReservationInput,
    reservedBy: string,
    actorRole: UserRole
  ): Promise<any> {
    return this.repository.executeCreateReservationTransaction({
      inventoryId: input.inventoryId,
      quantity: Number(input.quantity),
      notes: input.notes,
      durationHours: input.durationHours,
      reservedBy,
      actorRole,
    });
  }

  public async getReservations(
    options: ReservationFilterOptions,
    user: { id: string; role: UserRole }
  ): Promise<{
    items: any[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const [items, totalItems] = await this.repository.findReservations(options, user);
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

  public async getReservationDetail(
    id: string,
    user: { id: string; role: UserRole }
  ): Promise<any> {
    const record = await this.repository.findReservationDetail(id, user);
    if (!record) {
      throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
    }
    return record;
  }

  public async releaseReservation(
    id: string,
    user: { id: string; role: UserRole },
    reason?: string
  ): Promise<any> {
    return this.repository.executeReleaseReservationTransaction({
      reservationId: id,
      user,
      reason,
    });
  }
}
