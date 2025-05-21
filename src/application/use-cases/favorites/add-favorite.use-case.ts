// src/application/use-cases/favorites/add-favorite.use-case.ts
import { v4 as uuidv4 } from 'uuid';
import { Favorite } from '../../../domain/entities/favorite.entity';
import { IFavoriteRepository } from '../../../domain/interfaces/repositories/favorite-repository.interface';
import { IPromotionRepository } from '../../../domain/interfaces/repositories/promotion-repository.interface';
import { AddFavoriteDTO } from '../../dto/favorites/add-favorite-dto';

export class AddFavoriteUseCase {
  constructor(
    private readonly favoriteRepository: IFavoriteRepository,
    private readonly promotionRepository: IPromotionRepository
  ) {}

  async execute(customerId: string, data: AddFavoriteDTO): Promise<Favorite> {
    // Check if promotion exists
    const promotion = await this.promotionRepository.findById(data.promotionId);
    if (!promotion) {
      throw new Error('Promotion not found');
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteRepository.findByCustomerAndPromotion(
      customerId,
      data.promotionId
    );
    
    if (existingFavorite) {
      throw new Error('Promotion already favorited');
    }

    // Create favorite
    const favorite = new Favorite(
      uuidv4(),
      customerId,
      data.promotionId,
      new Date()
    );

    // Save favorite
    return await this.favoriteRepository.save(favorite);
  }
}