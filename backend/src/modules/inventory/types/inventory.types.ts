import { InventoryStatus, DonationCategory, DonationQuantityUnit, MovementType, UserRole } from '@prisma/client';

export interface InventoryItemResponse {
  id: string;
  donationId: string;
  pickupId: string;
  foodCategory: DonationCategory;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  distributedQuantity: number;
  unit: DonationQuantityUnit;
  status: InventoryStatus;
  location: string | null;
  expirationDate: string | null;
  receivedAt: string;
  donorReference: string | null;
  createdAt: string;
  updatedAt: string;
  donation?: any;
  pickup?: any;
}

export interface InventoryMovementResponse {
  id: string;
  inventoryId: string;
  movementType: MovementType;
  quantity: number;
  unit: DonationQuantityUnit;
  previousAvailableQuantity: number;
  resultingAvailableQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string;
  actorRole: UserRole;
  actorName?: string;
  notes: string | null;
  createdAt: string;
}

export interface InventorySummaryResponse {
  totalFoodItems: number;
  availableInventoryCount: number;
  reservedInventoryCount: number;
  distributedInventoryCount: number;
  lowAvailabilityCount: number;
}
