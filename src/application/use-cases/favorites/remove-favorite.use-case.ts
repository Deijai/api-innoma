// src/application/use-cases/favorites/remove-favorite.use-case.ts
import { IFavoriteRepository } from '../../../domain/interfaces/repositories/favorite-repository.interface';

export class RemoveFavoriteUseCase {
  constructor(
    private readonly favoriteRepository: IFavoriteRepository
  ) {}

  async execute(customerId: string, favoriteId: string): Promise<boolean> {
    // Find favorite
    const favorite = await this.favoriteRepository.findById(favoriteId);
    
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    // Check if favorite belongs to customer
    if (favorite.customerId !== customerId) {
      throw new Error('Unauthorized');
    }

    // Delete favorite
    return await this.favoriteRepository.delete(favoriteId);
  }
}