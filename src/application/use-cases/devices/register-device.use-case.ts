// src/application/use-cases/devices/register-device.use-case.ts - VERSÃO EXPO ATUALIZADA
import { v4 as uuidv4 } from 'uuid';
import { Expo } from 'expo-server-sdk';
import { DeviceToken } from '../../../domain/entities/device-token.entity';
import { IDeviceTokenRepository } from '../../../domain/interfaces/repositories/device-token-repository.interface';
import { RegisterDeviceDTO } from '../../dto/device/register-device-dto';

export class RegisterDeviceUseCase {
  constructor(
    private readonly deviceTokenRepository: IDeviceTokenRepository
  ) {}

  async execute(customerId: string, data: RegisterDeviceDTO): Promise<DeviceToken> {
    console.log('📱 [RegisterDevice] Iniciando registro de dispositivo Expo');
    console.log('👤 [RegisterDevice] Customer ID:', customerId);
    console.log('🔑 [RegisterDevice] Token (primeiros 30 chars):', data.token.substring(0, 30) + '...');
    console.log('📋 [RegisterDevice] Platform:', data.platform);

    // Validar se é um token Expo válido
    if (!Expo.isExpoPushToken(data.token)) {
      console.error('❌ [RegisterDevice] Token Expo inválido:', data.token);
      throw new Error('Token Expo inválido. Certifique-se de estar usando expo-notifications e getExpoPushTokenAsync().');
    }

    console.log('✅ [RegisterDevice] Token Expo válido');

    // Buscar dispositivos existentes para este customer
    const existingDevices = await this.deviceTokenRepository.findByCustomerId(customerId);
    console.log(`🔍 [RegisterDevice] Encontrados ${existingDevices.length} dispositivos existentes`);

    // Verificar se este token já está registrado para este customer
    const existingDevice = existingDevices.find(device => device.token === data.token);
    
    if (existingDevice) {
      console.log('🔄 [RegisterDevice] Token já registrado, atualizando informações');
      
      // Criar novo objeto com dados atualizados (as entidades são imutáveis)
      const updatedDevice = new DeviceToken(
        existingDevice.id,
        existingDevice.customerId,
        existingDevice.token,
        data.platform, // Atualizar plataforma se mudou
        existingDevice.createdAt,
        new Date() // updatedAt
      );
      
      const savedDevice = await this.deviceTokenRepository.save(updatedDevice);
      console.log('✅ [RegisterDevice] Dispositivo atualizado com sucesso');
      return savedDevice;
    }

    // Verificar e limitar número de dispositivos por customer
    const maxDevicesPerCustomer = parseInt(process.env.MAX_DEVICES_PER_CUSTOMER || '10');
    
    if (existingDevices.length >= maxDevicesPerCustomer) {
      console.warn(`⚠️ [RegisterDevice] Customer tem ${existingDevices.length} dispositivos (limite: ${maxDevicesPerCustomer})`);
      
      // Remover o dispositivo mais antigo (baseado em updatedAt)
      const oldestDevice = existingDevices.sort((a, b) => 
        a.updatedAt.getTime() - b.updatedAt.getTime()
      )[0];
      
      if (oldestDevice) {
        console.log('🗑️ [RegisterDevice] Removendo dispositivo mais antigo:', oldestDevice.id);
        await this.deviceTokenRepository.delete(oldestDevice.id);
        console.log('✅ [RegisterDevice] Dispositivo antigo removido');
      }
    }

    // Criar novo device token
    const deviceToken = new DeviceToken(
      uuidv4(),
      customerId,
      data.token,
      data.platform,
      new Date(), // createdAt
      new Date()  // updatedAt
    );

    console.log('💾 [RegisterDevice] Salvando novo dispositivo');
    
    // Salvar device token
    const savedDevice = await this.deviceTokenRepository.save(deviceToken);
    
    console.log('✅ [RegisterDevice] Dispositivo Expo registrado com sucesso:', savedDevice.id);
    
    return savedDevice;
  }

  // Método adicional para validar e limpar tokens inválidos de um customer
  async validateAndCleanTokens(customerId: string): Promise<{ valid: number, removed: number }> {
    console.log('🧹 [RegisterDevice] Iniciando limpeza de tokens para customer:', customerId);
    
    const devices = await this.deviceTokenRepository.findByCustomerId(customerId);
    const invalidTokens: string[] = [];
    let validCount = 0;

    for (const device of devices) {
      if (!Expo.isExpoPushToken(device.token)) {
        console.warn('❌ [RegisterDevice] Token Expo inválido encontrado:', device.token);
        invalidTokens.push(device.token);
      } else {
        validCount++;
      }
    }

    if (invalidTokens.length > 0) {
      console.log(`🗑️ [RegisterDevice] Removendo ${invalidTokens.length} tokens inválidos`);
      await this.deviceTokenRepository.removeTokens(invalidTokens);
    }

    console.log(`✅ [RegisterDevice] Limpeza concluída: ${validCount} válidos, ${invalidTokens.length} removidos`);
    
    return {
      valid: validCount,
      removed: invalidTokens.length
    };
  }

  // Método para obter estatísticas dos dispositivos de um customer
  async getCustomerDeviceStats(customerId: string): Promise<{
    totalDevices: number;
    iosDevices: number;
    androidDevices: number;
    validTokens: number;
    invalidTokens: number;
  }> {
    console.log('📊 [RegisterDevice] Obtendo estatísticas para customer:', customerId);
    
    const devices = await this.deviceTokenRepository.findByCustomerId(customerId);
    
    let iosCount = 0;
    let androidCount = 0;
    let validCount = 0;
    let invalidCount = 0;
    
    for (const device of devices) {
      // Contar por plataforma
      if (device.platform === 'ios') {
        iosCount++;
      } else if (device.platform === 'android') {
        androidCount++;
      }
      
      // Validar token
      if (Expo.isExpoPushToken(device.token)) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
    
    const stats = {
      totalDevices: devices.length,
      iosDevices: iosCount,
      androidDevices: androidCount,
      validTokens: validCount,
      invalidTokens: invalidCount
    };
    
    console.log('📊 [RegisterDevice] Estatísticas:', stats);
    return stats;
  }
}