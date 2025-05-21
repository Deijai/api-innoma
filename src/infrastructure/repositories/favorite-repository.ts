// src/infrastructure/repositories/favorite-repository.ts
import { Favorite } from '../../domain/entities/favorite.entity';
import { IFavoriteRepository } from '../../domain/interfaces/repositories/favorite-repository.interface';
import { FavoriteModel } from '../database/models/favorite.model';

export class FavoriteRepository implements IFavoriteRepository {
  async findById(id: string): Promise<Favorite | null> {
    const favoriteModel = await FavoriteModel.findByPk(id);
    
    if (!favoriteModel) {
      return null;
    }
    
    return this.toEntity(favoriteModel);
  }

  async findByCustomerAndPromotion(customerId: string, promotionId: string): Promise<Favorite | null> {
    const favoriteModel = await FavoriteModel.findOne({
      where: { customerId, promotionId }
    });
    
    if (!favoriteModel) {
      return null;
    }
    
    return this.toEntity(favoriteModel);
  }

  async findByCustomerId(customerId: string): Promise<Favorite[]> {
    const favoriteModels = await FavoriteModel.findAll({
      where: { customerId }
    });
    
    return favoriteModels.map(this.toEntity);
  }

  async save(favorite: Favorite): Promise<Favorite> {
    const favoriteModel = await FavoriteModel.create({
      id: favorite.id,
      customerId: favorite.customerId,
      promotionId: favorite.promotionId,
      createdAt: favorite.createdAt
    });
    
    return this.toEntity(favoriteModel);
  }

  async delete(id: string): Promise<boolean> {
    const result = await FavoriteModel.destroy({
      where: { id }
    });
    
    return result > 0;
  }

  private toEntity(model: FavoriteModel): Favorite {
    return new Favorite(
      model.id,
      model.customerId,
      model.promotionId,
      model.createdAt
    );
  }
}