// src/domain/interfaces/services/notification-service.interface.ts
export interface INotificationService {
  /**
   * Envia notificação para uma lista específica de tokens de dispositivo
   */
  sendNotificationToTokens(
    tokens: string[], 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void>;

  /**
   * Envia notificação para um tópico específico
   */
  sendNotificationToTopic(
    topic: string, 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<void>;

  /**
   * Subscreve um token a um tópico específico
   */
  subscribeToTopic?(token: string, topic: string): Promise<void>;

  /**
   * Remove subscrição de um token de um tópico específico
   */
  unsubscribeFromTopic?(token: string, topic: string): Promise<void>;
}