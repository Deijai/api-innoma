// src/domain/interfaces/services/auth-service.interface.ts - VERSÃO COMPLETA
export interface IAuthService {
  // Métodos existentes
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  generateToken(payload: Record<string, any>): string;
  verifyToken(token: string): Record<string, any> | null;

  // NOVOS: Métodos para refresh token
  generateRefreshToken(): string;
  generateRefreshTokenJWT(payload: Record<string, any>): string;
  verifyRefreshToken(token: string): Record<string, any> | null;
  generateTokenPair(payload: Record<string, any>): {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  getRefreshTokenExpirationDate(): Date;
  getAccessTokenExpirationDate(): Date;
  extractDeviceInfo(userAgent?: string): string | undefined;
}