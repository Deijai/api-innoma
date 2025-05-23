// src/application/use-cases/auth/login-user.use-case.ts - VERSÃO FINAL CORRIGIDA
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { IRefreshTokenRepository } from '../../../domain/interfaces/repositories/refresh-token-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { LoginDTO } from '../../dto/auth/login-dto';
import { AuthResultDTO } from '../../dto/auth/auth-result-dto';

// ATUALIZADO: AuthResultDTO para incluir refresh token
export interface AuthResultWithRefreshDTO extends AuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: LoginDTO, deviceInfo?: string): Promise<AuthResultWithRefreshDTO> {
    // Find user by email
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.active) {
      throw new Error('User is inactive');
    }

    // Verify password
    const isPasswordValid = await this.authService.comparePassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token pair
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId
    };

    const tokenPair = this.authService.generateTokenPair(tokenPayload);

    // Create and save refresh token
    const refreshToken = new RefreshToken(
      uuidv4(),
      user.id,
      tokenPair.refreshToken,
      'user',
      this.authService.getRefreshTokenExpirationDate(),
      false,
      new Date(),
      new Date(),
      deviceInfo,
    );

    await this.refreshTokenRepository.save(refreshToken);

    // Return result with refresh token
    return {
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.accessTokenExpiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId || undefined
      }
    };
  }
}