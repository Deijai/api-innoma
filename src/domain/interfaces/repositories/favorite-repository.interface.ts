// src/domain/interfaces/repositories/favorite-repository.interface.ts
import { Favorite } from '../../entities/favorite.entity';

export interface IFavoriteRepository {
  findById(id: string): Promise<Favorite | null>;
  findByCustomerAndPromotion(customerId: string, promotionId: string): Promise<Favorite | null>;
  findByCustomerId(customerId: string): Promise<Favorite[]>;
  save(favorite: Favorite): Promise<Favorite>;
  delete(id: string): Promise<boolean>;
  
  // NOVO: Método opcional para buscar favoritos por promoção
  findByPromotionId?(promotionId: string): Promise<Favorite[]>;
}