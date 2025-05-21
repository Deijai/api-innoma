// src/infrastructure/repositories/user-repository.ts
import { User, UserRole } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';
import { UserModel } from '../database/models/user.model';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const userModel = await UserModel.findByPk(id);
    
    if (!userModel) {
      return null;
    }
    
    return this.toEntity(userModel);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userModel = await UserModel.findOne({
      where: { email }
    });
    
    if (!userModel) {
      return null;
    }
    
    return this.toEntity(userModel);
  }

  async findByStoreId(storeId: string): Promise<User[]> {
    const userModels = await UserModel.findAll({
      where: { storeId }
    });
    
    return userModels.map(this.toEntity);
  }

  async save(user: User): Promise<User> {
    const userModel = await UserModel.create({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      storeId: user.storeId,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
    return this.toEntity(userModel);
  }

  async update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const userModel = await UserModel.findByPk(id);
    
    if (!userModel) {
      throw new Error('User not found');
    }
    
    await userModel.update(data);
    
    return this.toEntity(userModel);
  }

  private toEntity(model: UserModel): User {
    return new User(
      model.id,
      model.name,
      model.email,
      model.passwordHash,
      model.storeId,
      model.role as UserRole,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }
}
