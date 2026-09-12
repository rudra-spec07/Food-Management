import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { inventoryQuerySchema } from '../dto/inventory.dto';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InventoryController {
  private service: InventoryService;

  constructor(service?: InventoryService) {
    this.service = service || new InventoryService();
  }

  public getSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.service.getSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  public getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = inventoryQuerySchema.parse(req.query);
      const result = await this.service.getItems(parsedQuery);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAvailableItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = inventoryQuerySchema.parse(req.query);
      const result = await this.service.getAvailableItems(parsedQuery);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getItemDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { inventoryId } = req.params;
      if (!UUID_REGEX.test(inventoryId)) {
        throw new BadRequestError('Invalid inventory ID format', 'INVALID_UUID');
      }

      const item = await this.service.getItemDetail(inventoryId);
      if (!item) {
        throw new NotFoundError('Inventory item not found', 'INVENTORY_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  public getItemHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { inventoryId } = req.params;
      if (!UUID_REGEX.test(inventoryId)) {
        throw new BadRequestError('Invalid inventory ID format', 'INVALID_UUID');
      }

      const history = await this.service.getItemHistory(inventoryId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}
