// src/application/use-cases/get-active-promotions.use-case.ts
import { IPromotionRepository } from '../../domain/interfaces/repositories/promotion-repository.interface';
import { IStoreRepository } from '../../domain/interfaces/repositories/store-repository.interface';
import { ICompanyRepository } from '../../domain/interfaces/repositories/company-repository.interface';
import { PromotionDTO } from '../dto/promotion-dto';

export class GetActivePromotionsUseCase {
  constructor(
    private readonly promotionRepository: IPromotionRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(): Promise<PromotionDTO[]> {
    const promotions = await this.promotionRepository.findActive();
    
    return Promise.all(
      promotions.map(async (promo) => {
        const store = await this.storeRepository.findById(promo.storeId);
        
        return {
          id: promo.id,
          name: promo.name,
          description: promo.description,
          originalPrice: promo.originalPrice,
          promotionalPrice: promo.promotionalPrice,
          startDate: new Date(promo.startDate).toISOString(),
          endDate: new Date(promo.endDate).toISOString(),
          productId: promo.productId,
          storeId: promo.storeId,
          active: promo.active,
          createdAt: promo.createdAt?.toISOString(),
          updatedAt: promo.updatedAt?.toISOString(),
          // You can add store and company details here if needed for the API
        };
      })
    );
  }
}