// src/application/use-cases/devices/register-device.use-case.ts
import { v4 as uuidv4 } from 'uuid';
import { DeviceToken } from '../../../domain/entities/device-token.entity';
import { IDeviceTokenRepository } from '../../../domain/interfaces/repositories/device-token-repository.interface';
import { RegisterDeviceDTO } from '../../dto/device/register-device-dto';

export class RegisterDeviceUseCase {
  constructor(
    private readonly deviceTokenRepository: IDeviceTokenRepository
  ) {}

  async execute(customerId: string, data: RegisterDeviceDTO): Promise<DeviceToken> {
    // Check for existing devices for this customer
    const existingDevices = await this.deviceTokenRepository.findByCustomerId(customerId);
    
    // Find if this token is already registered
    const existingDevice = existingDevices.find(device => device.token === data.token);
    
    if (existingDevice) {
      // Update existing device (e.g., update platform or timestamp)
      return existingDevice;
    }

    // Create new device token
    const deviceToken = new DeviceToken(
      uuidv4(),
      customerId,
      data.token,
      data.platform,
      new Date(),
      new Date()
    );

    // Save device token
    return await this.deviceTokenRepository.save(deviceToken);
  }
}