// src/application/use-cases/sync-promotions.use-case.ts
import { IPromotionRepository } from '../../domain/interfaces/repositories/promotion-repository.interface';
import { IStoreRepository } from '../../domain/interfaces/repositories/store-repository.interface';
import { ICompanyRepository } from '../../domain/interfaces/repositories/company-repository.interface';
import { SyncRequestDTO } from '../dto/sync-request-dto';
import { SyncResponseDTO } from '../dto/sync-response-dto';
import { Promotion } from '../../domain/entities/promotion.entity';
import { Store } from '../../domain/entities/store.entity';
import { Company } from '../../domain/entities/company.entity';
import { SendPromotionNotificationUseCase } from './notifications/send-promotion-notification.use-case';

export class SyncPromotionsUseCase {
  constructor(
    private readonly promotionRepository: IPromotionRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly companyRepository: ICompanyRepository,
     private readonly sendPromotionNotificationUseCase: SendPromotionNotificationUseCase
  ) {}

  async execute(request: SyncRequestDTO): Promise<SyncResponseDTO> {
    try {
      // 1. Get or create company
      let company = await this.companyRepository.findByCnpj(request.company.cnpj);
      
      if (!company) {
        company = await this.companyRepository.save(
          new Company(
            request.company.id,
            request.company.name,
            request.company.tradingName,
            request.company.cnpj,
            request.company.active,
            new Date(),
            new Date()
          )
        );
      }

      // 2. Get or create store
      let store = await this.storeRepository.findByCnpj(request.store.cnpj);
      
      if (!store) {
        store = await this.storeRepository.save(
          new Store(
            request.store.id,
            request.store.name,
            request.store.cnpj,
            request.store.address,
            request.store.city,
            request.store.state,
            request.store.zipCode,
            company.id, // Use the company ID from our database
            request.store.active,
            new Date(),
            new Date()
          )
        );
      }

      // 3. Process promotions
      const promotions = request.promotions.map(promoDto => 
        new Promotion(
          promoDto.id,
          promoDto.name,
          promoDto.description,
          promoDto.originalPrice,
          promoDto.promotionalPrice,
          new Date(promoDto.startDate),
          new Date(promoDto.endDate),
          promoDto.productId,
          store.id, // Use the store ID from our database
          promoDto.active,
          new Date(promoDto.createdAt),
          new Date(promoDto.updatedAt)
        )
      );

      // 4. Save promotions
      const savedPromotions = await this.promotionRepository.saveMany(promotions);

       // NOVO: Enviar notificações push
      if (savedPromotions.length > 0) {
        // Executar notificações de forma assíncrona para não afetar a resposta
        this.sendPromotionNotificationUseCase.execute(savedPromotions, store)
          .catch(error => console.error('Failed to send notifications:', error));
      }

      // 5. Return response
      return {
        success: true,
        message: `Successfully synced ${savedPromotions.length} promotions for store ${store.name}`,
        timestamp: new Date().toISOString(),
        totalSynced: savedPromotions.length
      };
    } catch (error) {
      console.error('Error syncing promotions:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        totalSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}