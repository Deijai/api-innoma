// src/application/use-cases/notifications/send-promotion-notification.use-case.ts
import { IDeviceTokenRepository } from '../../../domain/interfaces/repositories/device-token-repository.interface';
import { INotificationService } from '../../../domain/interfaces/services/notification-service.interface';
import { IFavoriteRepository } from '../../../domain/interfaces/repositories/favorite-repository.interface';
import { IPromotionRepository } from '../../../domain/interfaces/repositories/promotion-repository.interface';
import { Promotion } from '../../../domain/entities/promotion.entity';
import { Store } from '../../../domain/entities/store.entity';

export class SendPromotionNotificationUseCase {
  constructor(
    private readonly deviceTokenRepository: IDeviceTokenRepository,
    private readonly notificationService: INotificationService,
    private readonly favoriteRepository: IFavoriteRepository,
    private readonly promotionRepository: IPromotionRepository
  ) {}

  async execute(promotions: Promotion[], storeInfo: Store): Promise<void> {
    try {
      console.log(`Sending notifications for ${promotions.length} promotions from store ${storeInfo.name}`);

      // Estratégia 1: Notificar todos os usuários
      await this.notifyAllUsers(promotions, storeInfo);

      // Estratégia 2: Notificar usuários com favoritos relacionados (com mais detalhes)
      await this.notifyUsersWithRelatedFavorites(promotions, storeInfo);

    } catch (error) {
      console.error('Error sending promotion notifications:', error);
    }
  }

  private async notifyAllUsers(promotions: Promotion[], storeInfo: Store): Promise<void> {
    try {
      // Buscar todos os tokens de dispositivos ativos
      const deviceTokens = await this.deviceTokenRepository.findAllActiveTokens();
      
      if (deviceTokens.length === 0) {
        console.log('No active device tokens found');
        return;
      }

      const tokens = deviceTokens.map(deviceToken => deviceToken.token);
      
      const title = '🔥 Novas Promoções Disponíveis!';
      const body = `${promotions.length} nova(s) promoção(ões) em ${storeInfo.name}`;
      
      const data = {
        type: 'new_promotions',
        storeId: storeInfo.id,
        storeName: storeInfo.name,
        promotionCount: promotions.length.toString(),
        timestamp: new Date().toISOString()
      };

      console.log(`Sending general notification to ${tokens.length} devices`);
      await this.notificationService.sendNotificationToTokens(tokens, title, body, data);
      
    } catch (error) {
      console.error('Error in notifyAllUsers:', error);
    }
  }

  private async notifyUsersWithRelatedFavorites(promotions: Promotion[], storeInfo: Store): Promise<void> {
    try {
      // Buscar todas as promoções da loja para verificar favoritos
      const allStorePromotions = await this.promotionRepository.findByStoreId(storeInfo.id);
      
      if (allStorePromotions.length === 0) {
        console.log('No promotions found for store, skipping favorite notifications');
        return;
      }

      // Buscar todos os favoritos relacionados às promoções da loja
      const favorites = await this.getFavoritesForPromotions(allStorePromotions);
      
      if (favorites.length === 0) {
        console.log('No favorites found for store promotions');
        return;
      }

      // Buscar tokens dos usuários que têm favoritos
      const customerIds = [...new Set(favorites.map(fav => fav.customerId))];
      const userTokens = await this.getTokensForCustomers(customerIds);

      if (userTokens.length === 0) {
        console.log('No device tokens found for customers with favorites');
        return;
      }

      const title = '⭐ Novas Promoções na sua Loja Favorita!';
      const body = `${storeInfo.name} tem ${promotions.length} nova(s) promoção(ões)`;
      
      const data = {
        type: 'favorite_store_promotions',
        storeId: storeInfo.id,
        storeName: storeInfo.name,
        promotionCount: promotions.length.toString(),
        timestamp: new Date().toISOString()
      };

      console.log(`Sending favorite store notification to ${userTokens.length} devices`);
      await this.notificationService.sendNotificationToTokens(userTokens, title, body, data);
      
    } catch (error) {
      console.error('Error in notifyUsersWithRelatedFavorites:', error);
    }
  }

  private async getFavoritesForPromotions(promotions: Promotion[]): Promise<any[]> {
    try {
      const promotionIds = promotions.map(promo => promo.id);
      const allFavorites = [];

      // Como não temos um método para buscar favoritos por múltiplas promoções,
      // vamos buscar um por um (pode ser otimizado futuramente)
      for (const promotionId of promotionIds) {
        try {
          // Este método precisa ser implementado no repository ou podemos fazer diferente
          // Por enquanto, vamos simular buscando favoritos de forma individual
          const favorites = await this.favoriteRepository.findByPromotionId?.(promotionId) || [];
          allFavorites.push(...favorites);
        } catch (error) {
          console.error(`Error getting favorites for promotion ${promotionId}:`, error);
        }
      }

      return allFavorites;
    } catch (error) {
      console.error('Error in getFavoritesForPromotions:', error);
      return [];
    }
  }

  private async getTokensForCustomers(customerIds: string[]): Promise<string[]> {
    try {
      const allTokens = [];

      for (const customerId of customerIds) {
        try {
          const customerTokens = await this.deviceTokenRepository.findByCustomerId(customerId);
          allTokens.push(...customerTokens.map(token => token.token));
        } catch (error) {
          console.error(`Error getting tokens for customer ${customerId}:`, error);
        }
      }

      return [...new Set(allTokens)]; // Remove duplicates
    } catch (error) {
      console.error('Error in getTokensForCustomers:', error);
      return [];
    }
  }
}