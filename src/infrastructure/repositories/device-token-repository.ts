// src/infrastructure/repositories/device-token-repository.ts
import { DeviceToken } from '../../domain/entities/device-token.entity';
import { IDeviceTokenRepository } from '../../domain/interfaces/repositories/device-token-repository.interface';
import { DeviceTokenModel } from '../database/models/device-token.model';

export class DeviceTokenRepository implements IDeviceTokenRepository {
  async findById(id: string): Promise<DeviceToken | null> {
    const deviceTokenModel = await DeviceTokenModel.findByPk(id);
    
    if (!deviceTokenModel) {
      return null;
    }
    
    return this.toEntity(deviceTokenModel);
  }

  async findByCustomerId(customerId: string): Promise<DeviceToken[]> {
    const deviceTokenModels = await DeviceTokenModel.findAll({
      where: { customerId }
    });
    
    return deviceTokenModels.map(this.toEntity);
  }

  async save(deviceToken: DeviceToken): Promise<DeviceToken> {
    const deviceTokenModel = await DeviceTokenModel.create({
      id: deviceToken.id,
      customerId: deviceToken.customerId,
      token: deviceToken.token,
      platform: deviceToken.platform,
      createdAt: deviceToken.createdAt,
      updatedAt: deviceToken.updatedAt
    });
    
    return this.toEntity(deviceTokenModel);
  }

  async delete(id: string): Promise<boolean> {
    const result = await DeviceTokenModel.destroy({
      where: { id }
    });
    
    return result > 0;
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