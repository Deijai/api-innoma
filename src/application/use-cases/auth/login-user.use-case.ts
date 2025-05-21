// src/application/use-cases/auth/login-user.use-case.ts
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { LoginDTO } from '../../dto/auth/login-dto';
import { AuthResultDTO } from '../../dto/auth/auth-result-dto';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: LoginDTO): Promise<AuthResultDTO> {
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

    // Generate token
    const token = this.authService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId
    });

    // Return result
    return {
      token,
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