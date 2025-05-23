// src/application/use-cases/auth/register-customer.use-case.ts - VERSÃO CORRIGIDA
import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../../../domain/entities/customer.entity';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IRefreshTokenRepository } from '../../../domain/interfaces/repositories/refresh-token-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { RegisterCustomerDTO } from '../../dto/auth/register-customer-dto';
import { CustomerAuthResultDTO } from '../../dto/auth/customer-auth-result-dto';

// ATUALIZADO: CustomerAuthResultDTO para incluir refresh token
export interface CustomerAuthResultWithRefreshDTO extends CustomerAuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}

export class RegisterCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: RegisterCustomerDTO, deviceInfo?: string): Promise<CustomerAuthResultWithRefreshDTO> {
    // Check if email already exists
    const existingCustomer = await this.customerRepository.findByEmail(data.email);
    if (existingCustomer) {
      throw new Error('Email already in use');
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(data.password);

    // Create customer
    const customer = new Customer(
      uuidv4(),
      data.name,
      data.email,
      passwordHash,
      data.phone || null,
      true, // active
      new Date(),
      new Date()
    );

    // Save customer
    const savedCustomer = await this.customerRepository.save(customer);

    // Generate token pair
    const tokenPayload = {
      id: savedCustomer.id,
      email: savedCustomer.email,
      type: 'customer'
    };

    const tokenPair = this.authService.generateTokenPair(tokenPayload);

    // Create and save refresh token
    const refreshToken = new RefreshToken(
      uuidv4(),
      savedCustomer.id,
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
        id: savedCustomer.id,
        name: savedCustomer.name,
        email: savedCustomer.email,
        phone: savedCustomer.phone || undefined
      }
    };
  }
}