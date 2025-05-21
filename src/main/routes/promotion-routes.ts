// src/main/routes/promotion-routes.ts
import { Router } from 'express';
import { PromotionController } from '../../infrastructure/http/controllers/promotion-controller';
import { authMiddleware } from '../middlewares/auth-middleware';

export default (controller: PromotionController): Router => {
  const router = Router();

  // Synchronize promotions from local store to central API
  router.post('/promotions', authMiddleware, async (req, res) => {
    await controller.syncPromotions(req, res);
  });

  // Get promotions for a specific store (for admin panel)
  router.get('/stores/:storeId/promotions', authMiddleware, async (req, res) => {
    await controller.getStorePromotions(req, res);
  });

  // Get all active promotions (for mobile app)
  router.get('/promotions/active', async (req, res) => {
    await controller.getActivePromotions(req, res);
  });

  return router;
};