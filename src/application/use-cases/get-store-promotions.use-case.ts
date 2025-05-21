// src/application/use-cases/get-store-promotions.use-case.ts
import { IPromotionRepository } from '../../domain/interfaces/repositories/promotion-repository.interface';
import { IStoreRepository } from '../../domain/interfaces/repositories/store-repository.interface';
import { PromotionDTO } from '../dto/promotion-dto';
import { StoreDTO } from '../dto/store-dto';

export class GetStorePromotionsUseCase {
  constructor(
    private readonly promotionRepository: IPromotionRepository,
    private readonly storeRepository: IStoreRepository
  ) {}

  async execute(storeId: string): Promise<{ store: StoreDTO | null; promotions: PromotionDTO[] }> {
    // 1. Get store
    const store = await this.storeRepository.findById(storeId);
    
    if (!store) {
      return {
        store: null,
        promotions: []
      };
    }

    // 2. Get promotions
    const promotions = await this.promotionRepository.findByStoreId(storeId);

    // 3. Map to DTOs
    const storeDto: StoreDTO = {
      id: store.id,
      name: store.name,
      cnpj: store.cnpj,
      address: store.address,
      city: store.city,
      state: store.state,
      zipCode: store.zipCode,
      companyId: store.companyId,
      active: store.active
    };

    const promotionDtos: PromotionDTO[] = promotions.map(promo => ({
      id: promo.id,
      name: promo.name,
      description: promo.description,
      originalPrice: promo.originalPrice,
      promotionalPrice: promo.promotionalPrice,
      startDate: promo.startDate.toISOString(),
      endDate: promo.endDate.toISOString(),
      productId: promo.productId,
      storeId: promo.storeId,
      active: promo.active,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString()
    }));

    return {
      store: storeDto,
      promotions: promotionDtos
    };
  }
}