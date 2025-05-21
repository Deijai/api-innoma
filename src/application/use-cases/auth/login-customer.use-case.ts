// src/application/use-cases/auth/login-customer.use-case.ts
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { LoginDTO } from '../../dto/auth/login-dto';
import { CustomerAuthResultDTO } from '../../dto/auth/customer-auth-result-dto';

export class LoginCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: LoginDTO): Promise<CustomerAuthResultDTO> {
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

    // Generate token
    const token = this.authService.generateToken({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    });

    // Return result
    return {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined
      }
    };
  }
}