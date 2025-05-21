// src/domain/entities/device-token.entity.ts
export class DeviceToken {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly token: string,
    public readonly platform: 'ios' | 'android',
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}