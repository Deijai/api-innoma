// src/infrastructure/http/controllers/favorite-controller.ts
import { Request, Response } from 'express';
import { AddFavoriteUseCase } from '../../../application/use-cases/favorites/add-favorite.use-case';
import { RemoveFavoriteUseCase } from '../../../application/use-cases/favorites/remove-favorite.use-case';
import { AddFavoriteDTO } from '../../../application/dto/favorites/add-favorite-dto';
import { IFavoriteRepository } from '../../../domain/interfaces/repositories/favorite-repository.interface';

export class FavoriteController {
  constructor(
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
    private readonly removeFavoriteUseCase: RemoveFavoriteUseCase,
    private readonly favoriteRepository: IFavoriteRepository
  ) {}

  async addFavorite(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const data = req.body as AddFavoriteDTO;
      const result = await this.addFavoriteUseCase.execute(customerId, data);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in addFavorite controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error adding favorite'
      });
    }
  }

  async removeFavorite(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { favoriteId } = req.params;
      const result = await this.removeFavoriteUseCase.execute(customerId, favoriteId);
      res.status(200).json({ success: result });
    } catch (error) {
      console.error('Error in removeFavorite controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error removing favorite'
      });
    }
  }

  async getFavorites(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const favorites = await this.favoriteRepository.findByCustomerId(customerId);
      res.status(200).json(favorites);
    } catch (error) {
      console.error('Error in getFavorites controller:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error getting favorites'
      });
    }
  }
}