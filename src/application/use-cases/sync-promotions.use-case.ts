// src/application/use-cases/sync-promotions.use-case.ts - VERSÃO CORRIGIDA
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
    private readonly sendPromotionNotificationUseCase: SendPromotionNotificationUseCase | null // Pode ser null
  ) {}

  async execute(request: SyncRequestDTO): Promise<SyncResponseDTO> {
    try {
      console.log('🔄 Iniciando sincronização de promoções...');
      
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
        console.log('✅ Empresa criada:', company.name);
      } else {
        console.log('ℹ️ Empresa encontrada:', company.name);
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
        console.log('✅ Loja criada:', store.name);
      } else {
        console.log('ℹ️ Loja encontrada:', store.name);
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

      console.log(`📦 Processando ${promotions.length} promoções...`);

      // 4. Save promotions
      const savedPromotions = await this.promotionRepository.saveMany(promotions);
      
      console.log(`✅ ${savedPromotions.length} promoções salvas com sucesso`);

      // 5. Enviar notificações push (CORRIGIDO: verificar se não é null)
      if (savedPromotions.length > 0) {
        if (this.sendPromotionNotificationUseCase) {
          console.log('📨 Iniciando envio de notificações push...');
          
          // Executar notificações de forma assíncrona para não afetar a resposta
          this.sendPromotionNotificationUseCase.execute(savedPromotions, store)
            .then(() => {
              console.log('✅ Notificações push enviadas com sucesso');
            })
            .catch(error => {
              console.error('❌ Erro ao enviar notificações push:', error);
              // Não quebrar o processo de sync por causa das notificações
            });
        } else {
          console.log('⚠️ Serviço de notificações não disponível - notificações não enviadas');
          console.log('💡 Para habilitar notificações, configure EXPO_ACCESS_TOKEN no .env');
        }
      } else {
        console.log('ℹ️ Nenhuma promoção nova para notificar');
      }

      // 6. Return response
      const response: SyncResponseDTO = {
        success: true,
        message: `Successfully synced ${savedPromotions.length} promotions for store ${store.name}`,
        timestamp: new Date().toISOString(),
        totalSynced: savedPromotions.length
      };

      console.log('🎉 Sincronização concluída com sucesso:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
      
      const errorResponse: SyncResponseDTO = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        totalSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };

      console.log('💥 Sincronização falhou:', errorResponse);
      return errorResponse;
    }
  }
}