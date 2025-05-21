// src/application/dto/auth/register-user-dto.ts
import { UserRole } from '../../../domain/entities/user.entity';

export interface RegisterUserDTO {
  name: string;
  email: string;
  password: string;
  storeId?: string;
  role: UserRole;
}