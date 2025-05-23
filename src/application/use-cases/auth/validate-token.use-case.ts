// src/application/use-cases/auth/validate-token.use-case.ts
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';

export interface ValidateTokenResult {
  valid: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    storeId?: string;
    type: 'user' | 'customer';
  };
  message?: string;
}

export class ValidateTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(token: string): Promise<ValidateTokenResult> {
    try {
      // Verificar se o token é válido
      const decoded = this.authService.verifyToken(token);
      
      if (!decoded) {
        return {
          valid: false,
          message: 'Invalid or expired token'
        };
      }

      // Se o token é de customer (mobile app)
      if (decoded.type === 'customer') {
        const customer = await this.customerRepository.findById(decoded.id);
        
        if (!customer) {
          return {
            valid: false,
            message: 'Customer not found'
          };
        }

        if (!customer.active) {
          return {
            valid: false,
            message: 'Customer is inactive'
          };
        }

        return {
          valid: true,
          user: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            role: 'CUSTOMER',
            type: 'customer'
          }
        };
      }

      // Se o token é de usuário (web panel)
      const user = await this.userRepository.findById(decoded.id);
      
      if (!user) {
        return {
          valid: false,
          message: 'User not found'
        };
      }

      if (!user.active) {
        return {
          valid: false,
          message: 'User is inactive'
        };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId || undefined,
          type: 'user'
        }
      };

    } catch (error) {
      console.error('Error in ValidateTokenUseCase:', error);
      return {
        valid: false,
        message: 'Token validation failed'
      };
    }
  }
}