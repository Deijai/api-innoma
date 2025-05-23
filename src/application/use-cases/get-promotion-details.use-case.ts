// src/application/use-cases/get-promotion-details.use-case.ts
import { IPromotionRepository } from '../../domain/interfaces/repositories/promotion-repository.interface';
import { IStoreRepository } from '../../domain/interfaces/repositories/store-repository.interface';
import { ICompanyRepository } from '../../domain/interfaces/repositories/company-repository.interface';
import { PromotionDTO } from '../dto/promotion-dto';
import { StoreDTO } from '../dto/store-dto';
import { CompanyDTO } from '../dto/company-dto';

export interface PromotionDetailsDTO extends PromotionDTO {
  store?: StoreDTO;
  company?: CompanyDTO;
}

export class GetPromotionDetailsUseCase {
  constructor(
    private readonly promotionRepository: IPromotionRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(promotionId: string): Promise<PromotionDetailsDTO | null> {
    // 1. Get promotion
    const promotion = await this.promotionRepository.findById(promotionId);
    
    if (!promotion) {
      return null;
    }

    // 2. Build basic promotion DTO
    const promotionDto: PromotionDTO = {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      originalPrice: promotion.originalPrice,
      promotionalPrice: promotion.promotionalPrice,
      startDate: this.formatDate(promotion.startDate),
      endDate: this.formatDate(promotion.endDate),
      productId: promotion.productId,
      storeId: promotion.storeId,
      active: promotion.active,
      createdAt: this.formatDate(promotion.createdAt),
      updatedAt: this.formatDate(promotion.updatedAt)
    };

    // 3. Get store details
    let storeDto: StoreDTO | undefined;
    const store = await this.storeRepository.findById(promotion.storeId);
    
    if (store) {
      storeDto = {
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

      // 4. Get company details
      let companyDto: CompanyDTO | undefined;
      const company = await this.companyRepository.findById(store.companyId);
      
      if (company) {
        companyDto = {
          id: company.id,
          name: company.name,
          tradingName: company.tradingName,
          cnpj: company.cnpj,
          active: company.active
        };
      }

      // 5. Return complete promotion details
      return {
        ...promotionDto,
        store: storeDto,
        company: companyDto
      };
    }

    // Return promotion without store/company details if store not found
    return promotionDto;
  }

  // Helper method to safely format dates
  private formatDate(date: Date | string): string {
    if (!date) {
      return new Date().toISOString();
    }
    
    if (typeof date === 'string') {
      return date;
    }
    
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Fallback: try to create Date from the value
    try {
      return new Date(date).toISOString();
    } catch (error) {
      console.warn('Failed to format date:', date, error);
      return new Date().toISOString();
    }
  }
}