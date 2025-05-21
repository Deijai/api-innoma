// src/infrastructure/services/auth-service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';

export class AuthService implements IAuthService {
  constructor(private readonly jwtSecret: string, private readonly jwtExpiresIn: string = '1d') {}

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
}