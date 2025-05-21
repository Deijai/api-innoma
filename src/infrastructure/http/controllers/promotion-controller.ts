// src/infrastructure/http/controllers/promotion-controller.ts
import { Request, Response } from 'express';
import { SyncPromotionsUseCase } from '../../../application/use-cases/sync-promotions.use-case';
import { GetStorePromotionsUseCase } from '../../../application/use-cases/get-store-promotions.use-case';
import { GetActivePromotionsUseCase } from '../../../application/use-cases/get-active-promotions.use-case';
import { SyncRequestDTO } from '../../../application/dto/sync-request-dto';

export class PromotionController {
  constructor(
    private readonly syncPromotionsUseCase: SyncPromotionsUseCase,
    private readonly getStorePromotionsUseCase: GetStorePromotionsUseCase,
    private readonly getActivePromotionsUseCase: GetActivePromotionsUseCase
  ) {}

  async syncPromotions(req: Request, res: Response): Promise<void> {
    try {
      const syncRequest = req.body as SyncRequestDTO;
      const result = await this.syncPromotionsUseCase.execute(syncRequest);
      
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in syncPromotions controller:', error);
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        totalSynced: 0
      });
    }
  }

  async getStorePromotions(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const result = await this.getStorePromotionsUseCase.execute(storeId);
      
      if (!result.store) {
        res.status(404).json({ message: 'Store not found' });
        return;
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getStorePromotions controller:', error);
      
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getActivePromotions(req: Request, res: Response): Promise<void> {
    try {
      const promotions = await this.getActivePromotionsUseCase.execute();
      res.status(200).json(promotions);
    } catch (error) {
      console.error('Error in getActivePromotions controller:', error);
      
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}