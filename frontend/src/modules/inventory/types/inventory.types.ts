export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'DISTRIBUTED' | 'EXPIRED' | 'DISCARDED';

export type FoodCategory = 'COOKED_MEAL' | 'PACKAGED_FOOD' | 'GROCERIES' | 'BAKERY' | 'FRUITS' | 'VEGETABLES' | 'OTHER';

export type MovementType = 'INFLOW' | 'OUTFLOW' | 'RESERVATION' | 'RELEASE' | 'EXPIRATION_DISCARD' | 'ADJUSTMENT';

export interface InventoryItem {
  id: string;
  foodCategory: FoodCategory;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  distributedQuantity: number;
  unit: string;
  status: InventoryStatus;
  location?: string | null;
  expirationDate?: string | null;
  receivedAt: string;
  donorReference?: string | null;
  donationId?: string | null;
  pickupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  movementType: MovementType;
  quantity: number;
  unit: string;
  previousAvailableQuantity: number;
  resultingAvailableQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InventorySummary {
  totalFoodItems: number;
  availableInventoryCount: number;
  reservedInventoryCount: number;
  distributedInventoryCount: number;
  lowAvailabilityCount: number;
}

export interface InventoryQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
  foodCategory?: string;
  status?: string;
  availability?: string;
}
