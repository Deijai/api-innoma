// src/domain/interfaces/repositories/device-token-repository.interface.ts - VERSÃO ATUALIZADA
import { DeviceToken } from '../../entities/device-token.entity';

export interface IDeviceTokenRepository {
  // Métodos básicos
  findById(id: string): Promise<DeviceToken | null>;
  findByCustomerId(customerId: string): Promise<DeviceToken[]>;
  save(deviceToken: DeviceToken): Promise<DeviceToken>;
  delete(id: string): Promise<boolean>;
  
  // Métodos para buscar tokens
  findAllActiveTokens(): Promise<DeviceToken[]>;
  findByToken(token: string): Promise<DeviceToken | null>;
  findByPlatform?(platform: 'ios' | 'android'): Promise<DeviceToken[]>;
  
  // Métodos para limpeza
  removeTokens(tokens: string[]): Promise<void>;
  cleanupOldTokens(daysOld?: number): Promise<number>;
  
  // Métodos para estatísticas
  countByCustomerId?(customerId: string): Promise<number>;
  getGeneralStats?(): Promise<{
    totalTokens: number;
    activeTokens: number;
    iosTokens: number;
    androidTokens: number;
  }>;
}