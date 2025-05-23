// src/infrastructure/services/expo-push-service.ts
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId, ExpoPushReceipt } from 'expo-server-sdk';
import { INotificationService } from '../../domain/interfaces/services/notification-service.interface';
import { IDeviceTokenRepository } from '../../domain/interfaces/repositories/device-token-repository.interface';

export class ExpoPushService implements INotificationService {
  private expo: Expo;
  private deviceTokenRepository?: IDeviceTokenRepository;
  private maxDevicesPerCustomer: number;
  private debugMode: boolean;

  constructor(deviceTokenRepository?: IDeviceTokenRepository) {
    // Criar instância do Expo SDK
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true,
    });
    
    this.deviceTokenRepository = deviceTokenRepository;
    this.maxDevicesPerCustomer = parseInt(process.env.MAX_DEVICES_PER_CUSTOMER || '10');
    this.debugMode = process.env.PUSH_NOTIFICATIONS_DEBUG === 'true';
    
    if (this.debugMode) {
      console.log('🐛 [EXPO DEBUG] Service inicializado com debug habilitado');
      console.log('🐛 [EXPO DEBUG] Max devices per customer:', this.maxDevicesPerCustomer);
    }
    
    console.log('✅ Expo Push Service inicializado');
  }

  // Validar se o token é um push token válido do Expo
  private isValidExpoPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  // Filtrar tokens válidos
  private filterValidTokens(tokens: string[]): { valid: string[], invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    tokens.forEach(token => {
      if (this.isValidExpoPushToken(token)) {
        valid.push(token);
      } else {
        invalid.push(token);
        console.warn(`❌ Token Expo inválido detectado: ${token.substring(0, 50)}...`);
      }
    });
    
    if (this.debugMode) {
      console.log(`🐛 [EXPO DEBUG] Tokens válidos: ${valid.length}, inválidos: ${invalid.length}`);
    }
    
    return { valid, invalid };
  }

  async sendNotificationToTokens(
    tokens: string[], 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void> {
    if (tokens.length === 0) {
      console.log('📭 Nenhum token fornecido para envio de notificações');
      return;
    }

    console.log(`🔍 Validando ${tokens.length} tokens Expo...`);
    
    // Filtrar tokens válidos
    const { valid: validTokens, invalid: invalidTokens } = this.filterValidTokens(tokens);
    
    if (invalidTokens.length > 0) {
      console.warn(`⚠️ Encontrados ${invalidTokens.length} tokens inválidos que serão removidos`);
      
      // Remover tokens inválidos do banco de dados
      if (this.deviceTokenRepository) {
        try {
          await this.deviceTokenRepository.removeTokens(invalidTokens);
          console.log(`🗑️ Removidos ${invalidTokens.length} tokens inválidos do banco de dados`);
        } catch (error) {
          console.error('❌ Erro ao remover tokens inválidos:', error);
        }
      }
    }

    if (validTokens.length === 0) {
      console.log('📭 Nenhum token válido para envio de notificações');
      return;
    }

    console.log(`📱 Enviando notificações para ${validTokens.length} dispositivos válidos`);

    // Criar mensagens para envio
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      badge: 1,
      priority: 'high',
      channelId: 'default',
    }));

    // Dividir mensagens em chunks (Expo recomenda chunks de 100)
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    console.log(`📦 Enviando ${chunks.length} lotes de notificações`);

    // Enviar cada chunk
    for (const [chunkIndex, chunk] of chunks.entries()) {
      try {
        if (this.debugMode) {
          console.log(`🐛 [EXPO DEBUG] Processando lote ${chunkIndex + 1}/${chunks.length} (${chunk.length} mensagens)`);
        }
        
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        
        console.log(`✅ Lote ${chunkIndex + 1} enviado com sucesso`);
        
        // Aguardar um pouco entre lotes para evitar rate limiting
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Erro no lote ${chunkIndex + 1}:`, error);
      }
    }

    // Processar tickets e identificar tokens problemáticos
    const { successCount, failureCount, failedTokens } = this.processTickets(tickets, validTokens);
    
    console.log(`📊 Resultado final: ${successCount} sucessos, ${failureCount} falhas`);
    
    // Remover tokens que falharam permanentemente
    if (failedTokens.length > 0) {
      await this.handleFailedTokens(failedTokens);
    }

    // Processar recibos após um tempo (opcional, para tracking detalhado)
    if (tickets.length > 0) {
      setTimeout(() => {
        this.processReceipts(tickets).catch(error => {
          console.error('❌ Erro ao processar recibos:', error);
        });
      }, 30000); // Aguardar 30 segundos antes de verificar recibos
    }
  }

  private processTickets(
    tickets: ExpoPushTicket[], 
    originalTokens: string[]
  ): { successCount: number, failureCount: number, failedTokens: string[] } {
    let successCount = 0;
    let failureCount = 0;
    const failedTokens: string[] = [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        successCount++;
        if (this.debugMode) {
          console.log(`🐛 [EXPO DEBUG] Ticket ${index}: OK - ${ticket.id}`);
        }
      } else {
        failureCount++;
        console.error(`❌ Erro no ticket ${index}:`, ticket.message);
        
        // Se o token correspondente existe, marcar como falha
        if (originalTokens[index]) {
          failedTokens.push(originalTokens[index]);
        }
      }
    });

    return { successCount, failureCount, failedTokens };
  }

  private async processReceipts(tickets: ExpoPushTicket[]): Promise<void> {
    try {
      // Filtrar apenas tickets com IDs válidos
      const receiptIds: ExpoPushReceiptId[] = tickets
        .filter(ticket => ticket.status === 'ok' && ticket.id)
        .map(ticket => ticket.status as ExpoPushReceiptId);

      if (receiptIds.length === 0) {
        return;
      }

      if (this.debugMode) {
        console.log(`🐛 [EXPO DEBUG] Verificando ${receiptIds.length} recibos de entrega`);
      }

      // Dividir IDs em chunks
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      
      for (const chunk of receiptIdChunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
        
        // Processar cada recibo
        for (const receiptId in receipts) {
          const receipt: ExpoPushReceipt = receipts[receiptId];
          
          if (receipt.status === 'ok') {
            if (this.debugMode) {
              console.log(`🐛 [EXPO DEBUG] Recibo ${receiptId}: Entregue com sucesso`);
            }
          } else if (receipt.status === 'error') {
            console.error(`❌ Erro na entrega do recibo ${receiptId}:`, receipt.message);
            
            // Se for erro de token inválido, devemos remover o token
            if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
              console.warn(`🗑️ Token expirado detectado no recibo: ${receiptId}`);
              // Aqui você poderia implementar lógica adicional para rastrear e remover o token
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar recibos:', error);
    }
  }

  async sendNotificationToTopic(
    topic: string, 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void> {
    // Expo não suporta tópicos diretamente como FCM
    // Implementar usando busca de todos os tokens ativos
    console.log(`📢 Enviando notificação broadcast para tópico: ${topic}`);
    
    if (this.deviceTokenRepository) {
      try {
        const allTokens = await this.deviceTokenRepository.findAllActiveTokens();
        const tokenStrings = allTokens.map(deviceToken => deviceToken.token);
        
        if (tokenStrings.length > 0) {
          console.log(`📢 Enviando notificação broadcast para ${tokenStrings.length} dispositivos`);
          await this.sendNotificationToTokens(tokenStrings, title, body, {
            ...data,
            topic: topic
          });
        } else {
          console.log('📭 Nenhum dispositivo ativo encontrado para broadcast');
        }
      } catch (error) {
        console.error('❌ Erro ao enviar notificação broadcast:', error);
      }
    } else {
      console.warn('⚠️ DeviceTokenRepository não disponível para broadcast');
    }
  }

  private async handleFailedTokens(failedTokens: string[]): Promise<void> {
    if (failedTokens.length === 0 || !this.deviceTokenRepository) return;
    
    console.log(`🗑️ Removendo ${failedTokens.length} tokens inválidos/expirados do banco de dados...`);
    
    try {
      await this.deviceTokenRepository.removeTokens(failedTokens);
      console.log(`✅ Tokens inválidos removidos com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao remover tokens inválidos:', error);
    }
  }

  async subscribeToTopic(token: string, topic: string): Promise<void> {
    // Expo não suporta tópicos nativamente
    console.warn(`⚠️ Expo não suporta tópicos nativamente.`);
    console.log(`🏷️ Token ${token.substring(0, 20)}... seria marcado com tag: ${topic}`);
    
    // Aqui você implementaria sua lógica de tags/grupos customizada
    // Por exemplo, salvar no banco uma relação token -> topics
    // Isso poderia ser implementado com uma nova tabela device_token_topics
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    // Expo não suporta tópicos nativamente
    console.warn(`⚠️ Expo não suporta tópicos nativamente.`);
    console.log(`🏷️ Token ${token.substring(0, 20)}... teria tag removida: ${topic}`);
    
    // Aqui você implementaria sua lógica de remoção de tags/grupos customizada
  }

  // Método adicional para verificar se o serviço Expo está funcionando
  async healthCheck(): Promise<boolean> {
    try {
      // Verificar se o SDK foi inicializado corretamente
      if (!this.expo) {
        return false;
      }
      
      if (this.debugMode) {
        console.log('🐛 [EXPO DEBUG] Health check executado com sucesso');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Health check do Expo Push Service falhou:', error);
      return false;
    }
  }

  // Método para obter estatísticas do serviço
  async getServiceStats(): Promise<{
    isHealthy: boolean;
    maxDevicesPerCustomer: number;
    debugMode: boolean;
    hasAccessToken: boolean;
  }> {
    return {
      isHealthy: await this.healthCheck(),
      maxDevicesPerCustomer: this.maxDevicesPerCustomer,
      debugMode: this.debugMode,
      hasAccessToken: !!process.env.EXPO_ACCESS_TOKEN
    };
  }
}