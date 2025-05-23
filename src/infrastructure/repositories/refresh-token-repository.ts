// src/infrastructure/repositories/refresh-token-repository.ts
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { IRefreshTokenRepository } from '../../domain/interfaces/repositories/refresh-token-repository.interface';
import { RefreshTokenModel } from '../database/models/refresh-token.model';
import { Op } from 'sequelize';

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async save(refreshToken: RefreshToken): Promise<RefreshToken> {
    const data = await RefreshTokenModel.upsert({
      id: refreshToken.id,
      userId: refreshToken.userId,
      token: refreshToken.token,
      userType: refreshToken.userType,
      expiresAt: refreshToken.expiresAt,
      isRevoked: refreshToken.isRevoked,
      deviceInfo: refreshToken.deviceInfo || null,
      createdAt: refreshToken.createdAt,
      updatedAt: new Date()
    });

    const model = data[0];
    return this.toEntity(model);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const model = await RefreshTokenModel.findOne({
      where: { token }
    });

    if (!model) {
      return null;
    }

    return this.toEntity(model);
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const model = await RefreshTokenModel.findByPk(id);

    if (!model) {
      return null;
    }

    return this.toEntity(model);
  }

  async delete(id: string): Promise<boolean> {
    const result = await RefreshTokenModel.destroy({
      where: { id }
    });

    return result > 0;
  }

  async findByUserId(userId: string, userType: 'user' | 'customer'): Promise<RefreshToken[]> {
    const models = await RefreshTokenModel.findAll({
      where: {
        userId,
        userType,
        isRevoked: false
      },
      order: [['createdAt', 'DESC']]
    });

    return models.map(this.toEntity);
  }

  async revokeToken(tokenId: string): Promise<boolean> {
    const [updatedRows] = await RefreshTokenModel.update(
      { 
        isRevoked: true,
        updatedAt: new Date()
      },
      { 
        where: { id: tokenId } 
      }
    );

    return updatedRows > 0;
  }

  async revokeAllUserTokens(userId: string, userType: 'user' | 'customer'): Promise<number> {
    const [updatedRows] = await RefreshTokenModel.update(
      { 
        isRevoked: true,
        updatedAt: new Date()
      },
      { 
        where: { 
          userId,
          userType,
          isRevoked: false
        } 
      }
    );

    return updatedRows;
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await RefreshTokenModel.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: new Date() } },
          { isRevoked: true }
        ]
      }
    });

    return result;
  }

  async countActiveTokensByUser(userId: string, userType: 'user' | 'customer'): Promise<number> {
    const count = await RefreshTokenModel.count({
      where: {
        userId,
        userType,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    return count;
  }

  private toEntity(model: RefreshTokenModel): RefreshToken {
    return new RefreshToken(
      model.id,
      model.userId,
      model.token,
      model.userType,
      model.expiresAt,
      model.isRevoked,
      model.createdAt,
      model.updatedAt,
      model.deviceInfo
    );
  }
}