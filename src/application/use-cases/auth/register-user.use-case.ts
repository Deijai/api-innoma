// src/application/use-cases/auth/register-user.use-case.ts
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { RegisterUserDTO } from '../../dto/auth/register-user-dto';
import { AuthResultDTO } from '../../dto/auth/auth-result-dto';
import { IStoreRepository } from '../../../domain/interfaces/repositories/store-repository.interface';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: RegisterUserDTO): Promise<AuthResultDTO> {
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

    // Generate token
    const token = this.authService.generateToken({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      storeId: savedUser.storeId
    });

    // Return result
    return {
      token,
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