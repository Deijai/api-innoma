// src/domain/interfaces/services/auth-service.interface.ts
export interface IAuthService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  generateToken(payload: Record<string, any>): string;
  verifyToken(token: string): Record<string, any> | null;
}