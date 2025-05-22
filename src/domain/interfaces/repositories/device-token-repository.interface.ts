// src/domain/interfaces/repositories/device-token-repository.interface.ts
import { DeviceToken } from '../../entities/device-token.entity';

export interface IDeviceTokenRepository {
  findById(id: string): Promise<DeviceToken | null>;
  findByCustomerId(customerId: string): Promise<DeviceToken[]>;
  save(deviceToken: DeviceToken): Promise<DeviceToken>;
  delete(id: string): Promise<boolean>;
  // NOVO: Método para buscar todos os tokens ativos
  findAllActiveTokens(): Promise<DeviceToken[]>;
  
  // NOVO: Método para remover tokens inválidos
  removeTokens(tokens: string[]): Promise<void>;
}