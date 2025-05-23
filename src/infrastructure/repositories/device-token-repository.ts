// src/infrastructure/repositories/device-token-repository.ts - VERSÃO ATUALIZADA
import { DeviceToken } from '../../domain/entities/device-token.entity';
import { IDeviceTokenRepository } from '../../domain/interfaces/repositories/device-token-repository.interface';
import { DeviceTokenModel } from '../database/models/device-token.model';
import { CustomerModel } from '../database/models/customer.model';
import { Op } from 'sequelize';

export class DeviceTokenRepository implements IDeviceTokenRepository {
  async findById(id: string): Promise<DeviceToken | null> {
    try {
      const deviceTokenModel = await DeviceTokenModel.findByPk(id);

      if (!deviceTokenModel) {
        return null;
      }

      return this.toEntity(deviceTokenModel);
    } catch (error) {
      console.error('❌ Erro ao buscar device token por ID:', error);
      throw error;
    }
  }

  async findByCustomerId(customerId: string): Promise<DeviceToken[]> {
    try {
      const deviceTokenModels = await DeviceTokenModel.findAll({
        where: { customerId },
        order: [['updatedAt', 'DESC']]
      });

      return deviceTokenModels.map(this.toEntity);
    } catch (error) {
      console.error('❌ Erro ao buscar devices por customer:', error);
      throw error;
    }
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    try {
      const deviceTokenModel = await DeviceTokenModel.findOne({
        where: { token }
      });

      if (!deviceTokenModel) {
        return null;
      }

      return this.toEntity(deviceTokenModel);
    } catch (error) {
      console.error('❌ Erro ao buscar device por token:', error);
      throw error;
    }
  }

  async save(deviceToken: DeviceToken): Promise<DeviceToken> {
    try {
      const data = {
        customerId: deviceToken.customerId,
        token: deviceToken.token,
        platform: deviceToken.platform,
        updatedAt: deviceToken.updatedAt
      };

      // Usar upsert para inserir ou atualizar
      const [savedModel] = await DeviceTokenModel.upsert({
        id: deviceToken.id,
        ...data,
        createdAt: deviceToken.createdAt
      });

      return this.toEntity(savedModel);
    } catch (error) {
      console.error('❌ Erro ao salvar device token:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DeviceTokenModel.destroy({
        where: { id }
      });

      console.log(`✅ Device token removido: ${id}`);
      return result > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar device token:', error);
      return false;
    }
  }

  async findAllActiveTokens(): Promise<DeviceToken[]> {
    try {
      // Buscar apenas tokens de customers ativos e tokens atualizados recentemente
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deviceTokenModels = await DeviceTokenModel.findAll({
        include: [
          {
            model: CustomerModel,
            as: 'customer',
            where: { active: true },
            required: true
          }
        ],
        where: {
          updatedAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        order: [['updatedAt', 'DESC']]
      });

      console.log(`🔍 Encontrados ${deviceTokenModels.length} tokens ativos`);
      return deviceTokenModels.map(this.toEntity);
    } catch (error) {
      console.error('❌ Erro ao buscar todos os tokens ativos:', error);
      throw error;
    }
  }

  async removeTokens(tokens: string[]): Promise<void> {
    try {
      if (tokens.length === 0) return;

      const result = await DeviceTokenModel.destroy({
        where: {
          token: {
            [Op.in]: tokens
          }
        }
      });

      console.log(`✅ Removidos ${result} tokens inválidos do banco de dados`);
    } catch (error) {
      console.error('❌ Erro ao remover tokens:', error);
      throw error;
    }
  }

  async cleanupOldTokens(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await DeviceTokenModel.destroy({
        where: {
          updatedAt: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 Limpeza automática: removidos ${result} tokens antigos (>${daysOld} dias)`);
      return result;
    } catch (error) {
      console.error('❌ Erro na limpeza de tokens antigos:', error);
      throw error;
    }
  }

  // Método para buscar tokens por plataforma
  async findByPlatform(platform: 'ios' | 'android'): Promise<DeviceToken[]> {
    try {
      const deviceTokenModels = await DeviceTokenModel.findAll({
        where: { platform },
        include: [
          {
            model: CustomerModel,
            as: 'customer',
            where: { active: true },
            required: true
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      return deviceTokenModels.map(this.toEntity);
    } catch (error) {
      console.error(`❌ Erro ao buscar tokens por plataforma ${platform}:`, error);
      throw error;
    }
  }

  // Método para contar dispositivos por customer
  async countByCustomerId(customerId: string): Promise<number> {
    try {
      const count = await DeviceTokenModel.count({
        where: { customerId }
      });

      return count;
    } catch (error) {
      console.error('❌ Erro ao contar devices por customer:', error);
      throw error;
    }
  }

  // Método para obter estatísticas gerais
  async getGeneralStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    iosTokens: number;
    androidTokens: number;
  }> {
    try {
      const [total, active, ios, android] = await Promise.all([
        DeviceTokenModel.count(),
        DeviceTokenModel.count({
          include: [
            {
              model: CustomerModel,
              as: 'customer',
              where: { active: true },
              required: true
            }
          ]
        }),
        DeviceTokenModel.count({
          where: { platform: 'ios' },
          include: [
            {
              model: CustomerModel,
              as: 'customer',
              where: { active: true },
              required: true
            }
          ]
        }),
        DeviceTokenModel.count({
          where: { platform: 'android' },
          include: [
            {
              model: CustomerModel,
              as: 'customer',
              where: { active: true },
              required: true
            }
          ]
        })
      ]);

      return {
        totalTokens: total,
        activeTokens: active,
        iosTokens: ios,
        androidTokens: android
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas gerais:', error);
      throw error;
    }
  }

  private toEntity(model: DeviceTokenModel): DeviceToken {
    return new DeviceToken(
      model.id,
      model.customerId,
      model.token,
      model.platform,
      model.createdAt,
      model.updatedAt
    );
  }
}