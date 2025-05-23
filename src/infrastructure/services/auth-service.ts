// src/infrastructure/services/auth-service.ts - VERSÃO COM REFRESH TOKEN
import * as jwt from 'jsonwebtoken'; // Mudança na importação
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';

export class AuthService implements IAuthService {
  constructor(
    private readonly jwtSecret: string, 
    private readonly jwtExpiresIn: string = '15m', // Access token com duração menor
    private readonly refreshTokenSecret: string,
    private readonly refreshTokenExpiresIn: string = '7d' // Refresh token com duração maior
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(payload: Record<string, any>): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  verifyToken(token: string): Record<string, any> | null {
    try {
      return jwt.verify(token, this.jwtSecret) as Record<string, any>;
    } catch (error) {
      return null;
    }
  }

  // NOVO: Gerar refresh token
  generateRefreshToken(): string {
    // Gerar token seguro com 64 bytes aleatórios
    return crypto.randomBytes(64).toString('hex');
  }

  // NOVO: Gerar JWT para refresh token (opcional, para validação adicional)
  generateRefreshTokenJWT(payload: Record<string, any>): string {
    return jwt.sign(payload!, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn
    });
  }

  // NOVO: Verificar refresh token JWT
  verifyRefreshToken(token: string): Record<string, any> | null {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as Record<string, any>;
    } catch (error) {
      return null;
    }
  }

  // NOVO: Gerar par de tokens (access + refresh)
  generateTokenPair(payload: Record<string, any>): {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  } {
    const accessToken = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.jwtExpiresIn,
      refreshTokenExpiresIn: this.refreshTokenExpiresIn
    };
  }

  // NOVO: Calcular data de expiração do refresh token
  getRefreshTokenExpirationDate(): Date {
    const now = new Date();
    
    // Converter string de expiração para milissegundos
    const expirationMs = this.parseExpirationString(this.refreshTokenExpiresIn);
    
    return new Date(now.getTime() + expirationMs);
  }

  // NOVO: Calcular data de expiração do access token
  getAccessTokenExpirationDate(): Date {
    const now = new Date();
    
    // Converter string de expiração para milissegundos
    const expirationMs = this.parseExpirationString(this.jwtExpiresIn);
    
    return new Date(now.getTime() + expirationMs);
  }

  // Método auxiliar para converter strings como "15m", "7d" para milissegundos
  private parseExpirationString(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // Default: 15 minutos
    }
  }

  // NOVO: Extrair informações do dispositivo do user-agent
  extractDeviceInfo(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Extrair informações básicas do user-agent
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = /Mobile/.test(userAgent);
    
    if (isIOS) return 'iOS Device';
    if (isAndroid) return 'Android Device';
    if (isMobile) return 'Mobile Device';
    
    return 'Web Browser';
  }
}