// src/infrastructure/services/firebase-service.ts
import * as admin from 'firebase-admin';
import { INotificationService } from '../../domain/interfaces/services/notification-service.interface';

export class FirebaseService implements INotificationService {
  private messaging: admin.messaging.Messaging;

  constructor() {
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
  }

  async sendNotificationToTokens(
    tokens: string[], 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void> {
    if (tokens.length === 0) return;

    console.log(`Sending notifications to ${tokens.length} devices`);

    // Usar sendEach() que está disponível na sua versão
    const messages = tokens.map(token => ({
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    }));

    try {
      const response = await this.messaging.sendEach(messages);
      
      console.log(`Successfully sent notification: ${response.successCount} success, ${response.failureCount} failures`);
      
      // Processar tokens que falharam
      if (response.failureCount > 0) {
        const failedTokens = this.extractFailedTokens(tokens, response.responses);
        if (failedTokens.length > 0) {
          await this.handleFailedTokens(failedTokens);
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
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
    };

    try {
      const response = await this.messaging.send(message);
      console.log('Successfully sent notification to topic:', response);
    } catch (error) {
      console.error('Error sending notification to topic:', error);
    }
  }

  async subscribeToTopic(token: string, topic: string): Promise<void> {
    try {
      await this.messaging.subscribeToTopic([token], topic);
      console.log(`Successfully subscribed token to topic: ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    try {
      await this.messaging.unsubscribeFromTopic([token], topic);
      console.log(`Successfully unsubscribed token from topic: ${topic}`);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }

  private extractFailedTokens(tokens: string[], responses: admin.messaging.SendResponse[]): string[] {
    const failedTokens: string[] = [];
    
    responses.forEach((response, index) => {
      if (!response.success && response.error) {
        console.error(`Failed to send to token ${tokens[index]}:`, response.error);
        
        // Se o token é inválido, adicionar à lista para remoção
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
    return errorCode === 'messaging/invalid-registration-token' ||
           errorCode === 'messaging/registration-token-not-registered';
  }

  private async handleFailedTokens(failedTokens: string[]): Promise<void> {
    if (failedTokens.length === 0) return;
    
    console.log(`Found ${failedTokens.length} invalid tokens to remove:`, failedTokens);
    
    // Aqui você pode remover os tokens inválidos do banco de dados
    // Para isso, você precisaria injetar o deviceTokenRepository no construtor
    // await this.deviceTokenRepository.removeTokens(failedTokens);
  }
}