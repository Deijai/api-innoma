// src/domain/interfaces/repositories/user-repository.interface.ts
import { User } from '../../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByStoreId(storeId: string): Promise<User[]>;
  save(user: User): Promise<User>;
  update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User>;
}