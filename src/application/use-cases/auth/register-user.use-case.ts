// src/application/use-cases/auth/register-user.use-case.ts - VERSÃO CORRIGIDA
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { IStoreRepository } from '../../../domain/interfaces/repositories/store-repository.interface';
import { IRefreshTokenRepository } from '../../../domain/interfaces/repositories/refresh-token-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { RegisterUserDTO } from '../../dto/auth/register-user-dto';
import { AuthResultDTO } from '../../dto/auth/auth-result-dto';

// ATUALIZADO: AuthResultDTO para incluir refresh token
export interface AuthResultWithRefreshDTO extends AuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: RegisterUserDTO, deviceInfo?: string): Promise<AuthResultWithRefreshDTO> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // If storeId is provided, check if store exists
    if (data.storeId) {
      const store = await this.storeRepository.findById(data.storeId);
      if (!store) {
        throw new Error('Store not found');
      }
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(data.password);

    // Create user
    const user = new User(
      uuidv4(),
      data.name,
      data.email,
      passwordHash,
      data.storeId || null,
      data.role,
      true, // active
      new Date(),
      new Date()
    );

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Generate token pair
    const tokenPayload = {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      storeId: savedUser.storeId
    };

    const tokenPair = this.authService.generateTokenPair(tokenPayload);

    // Create and save refresh token
    const refreshToken = new RefreshToken(
      uuidv4(),
      savedUser.id,
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
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        storeId: savedUser.storeId || undefined
      }
    };
  }
}