// src/application/dto/device/register-device-dto.ts
export interface RegisterDeviceDTO {
  token: string;
  platform: 'ios' | 'android';
}