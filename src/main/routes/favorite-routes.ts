// src/main/routes/favorite-routes.ts
import { Router } from 'express';
import { FavoriteController } from '../../infrastructure/http/controllers/favorite-controller';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate-request-middleware';
import { customerAuthMiddleware } from '../middlewares/customer-auth-middleware';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';
import { ICustomerRepository } from '../../domain/interfaces/repositories/customer-repository.interface';

export default (
  controller: FavoriteController, 
  authService: IAuthService,
  customerRepository: ICustomerRepository
): Router => {
  const router = Router();

  // Auth middleware for all favorite routes
  const authMiddleware = customerAuthMiddleware(authService, customerRepository);

  // Validation chains
  const addFavoriteValidation = [
    body('promotionId').isUUID().withMessage('Valid promotion ID is required')
  ];

  // Mobile App Favorite Routes
  router.post(
    '/',
    authMiddleware,
    validateRequest(addFavoriteValidation),
    (req, res) => controller.addFavorite(req, res)
  );

  router.delete(
    '/:favoriteId',
    authMiddleware,
    (req, res) => controller.removeFavorite(req, res)
  );

  router.get(
    '/',
    authMiddleware,
    (req, res) => controller.getFavorites(req, res)
  );

  return router;
};