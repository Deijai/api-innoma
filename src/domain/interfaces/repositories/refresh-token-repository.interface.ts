// src/domain/interfaces/repositories/refresh-token-repository.interface.ts
import { RefreshToken } from '../../entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  // Métodos básicos
  save(refreshToken: RefreshToken): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findById(id: string): Promise<RefreshToken | null>;
  delete(id: string): Promise<boolean>;
  
  // Métodos para gerenciamento de tokens
  findByUserId(userId: string, userType: 'user' | 'customer'): Promise<RefreshToken[]>;
  revokeToken(tokenId: string): Promise<boolean>;
  revokeAllUserTokens(userId: string, userType: 'user' | 'customer'): Promise<number>;
  
  // Limpeza de tokens expirados
  deleteExpiredTokens(): Promise<number>;
  
  // Contadores e estatísticas
  countActiveTokensByUser(userId: string, userType: 'user' | 'customer'): Promise<number>;
}