
// 1. ATUALIZAR: src/infrastructure/services/firebase-service.ts
// src/infrastructure/services/firebase-service.ts
import * as admin from 'firebase-admin';
import { INotificationService } from '../../domain/interfaces/services/notification-service.interface';
import { IDeviceTokenRepository } from '../../domain/interfaces/repositories/device-token-repository.interface';

export class FirebaseService implements INotificationService {
  private messaging: admin.messaging.Messaging;
  private deviceTokenRepository?: IDeviceTokenRepository;

  constructor(deviceTokenRepository?: IDeviceTokenRepository) {
    // Inicializar Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    this.messaging = admin.messaging();
    this.deviceTokenRepository = deviceTokenRepository;
  }

  // Validar formato do token FCM
  private isValidFCMToken(token: string): boolean {
    // Token FCM deve ter entre 140-200 caracteres e conter apenas caracteres válidos
    const fcmTokenRegex = /^[A-Za-z0-9:_-]{140,200}$/;
    
    // Verificações básicas
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Token não deve conter espaços
    if (token.includes(' ')) {
      return false;
    }
    
    // Verificar comprimento (tokens FCM típicos têm 140-200 caracteres)
    if (token.length < 140 || token.length > 200) {
      return false;
    }
    
    // Verificar padrão de caracteres válidos
    return fcmTokenRegex.test(token);
  }

  // Filtrar tokens válidos
  private filterValidTokens(tokens: string[]): { valid: string[], invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    tokens.forEach(token => {
      if (this.isValidFCMToken(token)) {
        valid.push(token);
      } else {
        invalid.push(token);
        console.warn(`❌ Token FCM inválido detectado: ${token.substring(0, 50)}...`);
      }
    });
    
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

    console.log(`🔍 Validando ${tokens.length} tokens FCM...`);
    
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

    // Dividir em lotes de 500 (limite do FCM)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < validTokens.length; i += batchSize) {
      batches.push(validTokens.slice(i, i + batchSize));
    }

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens: string[] = [];

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        console.log(`📦 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} tokens)`);
        
        const messages = batch.map(token => ({
          notification: {
            title,
            body,
          },
          data: data || {},
          token,
          android: {
            priority: 'high' as const,
            notification: {
              icon: 'ic_notification',
              color: '#FF6B35',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title,
                  body,
                },
                sound: 'default',
                badge: 1,
              },
            },
          },
        }));

        const response = await this.messaging.sendEach(messages);
        
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;
        
        console.log(`✅ Lote ${batchIndex + 1}: ${response.successCount} sucessos, ${response.failureCount} falhas`);
        
        // Processar tokens que falharam
        if (response.failureCount > 0) {
          const batchFailedTokens = this.extractFailedTokens(batch, response.responses);
          failedTokens.push(...batchFailedTokens);
        }
      } catch (error) {
        console.error(`❌ Erro no lote ${batchIndex + 1}:`, error);
        totalFailure += batch.length;
      }
    }

    console.log(`📊 Resultado final: ${totalSuccess} sucessos, ${totalFailure} falhas`);
    
    // Remover tokens que falharam permanentemente
    if (failedTokens.length > 0) {
      await this.handleFailedTokens(failedTokens);
    }
  }

  async sendNotificationToTopic(
    topic: string, 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void> {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#FF6B35',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await this.messaging.send(message);
      console.log('✅ Notificação enviada para tópico com sucesso:', response);
    } catch (error) {
      console.error('❌ Erro ao enviar notificação para tópico:', error);
    }
  }

  private extractFailedTokens(tokens: string[], responses: admin.messaging.SendResponse[]): string[] {
    const failedTokens: string[] = [];
    
    responses.forEach((response, index) => {
      if (!response.success && response.error) {
        const errorCode = response.error.code || response.error.code;
        
        console.error(`❌ Falha no token ${tokens[index].substring(0, 20)}...: ${errorCode}`);
        
        // Remover tokens com erros permanentes
        if (this.isInvalidTokenError(response.error)) {
          failedTokens.push(tokens[index]);
        }
      }
    });

    return failedTokens;
  }

  private isInvalidTokenError(error: any): boolean {
    if (!error) return false;
    
    const errorCode = error.code || error.errorInfo?.code;
    
    // Códigos de erro que indicam tokens inválidos permanentemente
    const invalidTokenErrors = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
      'messaging/invalid-recipient'
    ];
    
    return invalidTokenErrors.includes(errorCode);
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
    if (!this.isValidFCMToken(token)) {
      console.warn(`❌ Token inválido para subscrição no tópico ${topic}: ${token.substring(0, 50)}...`);
      return;
    }

    try {
      await this.messaging.subscribeToTopic([token], topic);
      console.log(`✅ Token subscrito ao tópico: ${topic}`);
    } catch (error) {
      console.error('❌ Erro ao subscrever no tópico:', error);
    }
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    if (!this.isValidFCMToken(token)) {
      console.warn(`❌ Token inválido para desscrição do tópico ${topic}: ${token.substring(0, 50)}...`);
      return;
    }

    try {
      await this.messaging.unsubscribeFromTopic([token], topic);
      console.log(`✅ Token dessinscrito do tópico: ${topic}`);
    } catch (error) {
      console.error('❌ Erro ao dessincrever do tópico:', error);
    }
  }
}
