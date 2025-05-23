// src/application/use-cases/auth/login-customer.use-case.ts - VERSÃO COM REFRESH TOKEN
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IRefreshTokenRepository } from '../../../domain/interfaces/repositories/refresh-token-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { CustomerAuthResultDTO } from '../../dto/auth/customer-auth-result-dto';
import { LoginDTO } from '../../dto/auth/login-dto';
import { v4 as uuidv4 } from 'uuid';

// ATUALIZADO: CustomerAuthResultDTO para incluir refresh token
export interface CustomerAuthResultWithRefreshDTO extends CustomerAuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}

export class LoginCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: LoginDTO, deviceInfo?: string): Promise<CustomerAuthResultWithRefreshDTO> {
    // Find customer by email
    const customer = await this.customerRepository.findByEmail(data.email);
    if (!customer) {
      throw new Error('Invalid credentials');
    }

    // Check if customer is active
    if (!customer.active) {
      throw new Error('Customer is inactive');
    }

    // Verify password
    const isPasswordValid = await this.authService.comparePassword(
      data.password,
      customer.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token pair
    const tokenPayload = {
      id: customer.id,
      email: customer.email,
      type: 'customer'
    };

    const tokenPair = this.authService.generateTokenPair(tokenPayload);

    // Create and save refresh token
    const refreshToken = new RefreshToken(
      uuidv4(),
      customer.id,
      tokenPair.refreshToken,
      'customer',
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
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined
      }
    };
  }
}
