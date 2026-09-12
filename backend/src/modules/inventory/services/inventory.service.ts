import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryQueryDTO } from '../dto/inventory.dto';
import {
  InventoryItemResponse,
  InventoryMovementResponse,
  InventorySummaryResponse,
} from '../types/inventory.types';

export class InventoryService {
  private repository: InventoryRepository;

  constructor(repository?: InventoryRepository) {
    this.repository = repository || new InventoryRepository();
  }

  public async getSummary(): Promise<InventorySummaryResponse> {
    return this.repository.getSummary();
  }

  public async getItems(query: InventoryQueryDTO): Promise<{
    items: InventoryItemResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const [rawItems, total] = await this.repository.findItems(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    const items: InventoryItemResponse[] = rawItems.map((item) => ({
      id: item.id,
      donationId: item.donationId,
      pickupId: item.pickupId,
      foodCategory: item.foodCategory,
      description: item.description,
      totalQuantity: Number(item.totalQuantity),
      availableQuantity: Number(item.availableQuantity),
      reservedQuantity: Number(item.reservedQuantity),
      distributedQuantity: Number(item.distributedQuantity),
      unit: item.unit,
      status: item.status,
      location: item.location,
      expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null,
      receivedAt: item.receivedAt.toISOString(),
      donorReference: item.donorReference,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      donation: item.donation,
    }));

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  public async getAvailableItems(query: InventoryQueryDTO): Promise<{
    items: InventoryItemResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const [rawItems, total] = await this.repository.findAvailableItems(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    const items: InventoryItemResponse[] = rawItems.map((item) => ({
      id: item.id,
      donationId: item.donationId,
      pickupId: item.pickupId,
      foodCategory: item.foodCategory,
      description: item.description,
      totalQuantity: Number(item.totalQuantity),
      availableQuantity: Number(item.availableQuantity),
      reservedQuantity: Number(item.reservedQuantity),
      distributedQuantity: Number(item.distributedQuantity),
      unit: item.unit,
      status: item.status,
      location: item.location,
      expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null,
      receivedAt: item.receivedAt.toISOString(),
      donorReference: item.donorReference,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      donation: item.donation,
    }));

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  public async getItemDetail(inventoryId: string): Promise<InventoryItemResponse | null> {
    const item = await this.repository.findItemDetail(inventoryId);
    if (!item) return null;

    return {
      id: item.id,
      donationId: item.donationId,
      pickupId: item.pickupId,
      foodCategory: item.foodCategory,
      description: item.description,
      totalQuantity: Number(item.totalQuantity),
      availableQuantity: Number(item.availableQuantity),
      reservedQuantity: Number(item.reservedQuantity),
      distributedQuantity: Number(item.distributedQuantity),
      unit: item.unit,
      status: item.status,
      location: item.location,
      expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null,
      receivedAt: item.receivedAt.toISOString(),
      donorReference: item.donorReference,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      donation: item.donation,
      pickup: item.pickup,
    };
  }

  public async getItemHistory(inventoryId: string): Promise<InventoryMovementResponse[]> {
    const rawMovements = await this.repository.findItemHistory(inventoryId);

    return rawMovements.map((m) => ({
      id: m.id,
      inventoryId: m.inventoryId,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      unit: m.unit,
      previousAvailableQuantity: Number(m.previousAvailableQuantity),
      resultingAvailableQuantity: Number(m.resultingAvailableQuantity),
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      actorId: m.actorId,
      actorRole: m.actorRole,
      actorName: m.actor ? `${m.actor.firstName} ${m.actor.lastName}` : undefined,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}
