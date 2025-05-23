// src/application/use-cases/auth/refresh-token.use-case.ts
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { IRefreshTokenRepository } from '../../../domain/interfaces/repositories/refresh-token-repository.interface';
import { IUserRepository } from '../../../domain/interfaces/repositories/user-repository.interface';
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { RefreshTokenRequestDTO, RefreshTokenResponseDTO } from '../../dto/auth/refresh-token-request-dto';

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(
    request: RefreshTokenRequestDTO,
    deviceInfo?: string
  ): Promise<RefreshTokenResponseDTO> {
    try {
      console.log('🔄 Iniciando refresh token...');

      // 1. Buscar refresh token no banco
      const refreshToken = await this.refreshTokenRepository.findByToken(request.refreshToken);
      
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // 2. Verificar se o token é válido
      if (!refreshToken.isValid()) {
        // Se expirado ou revogado, remover do banco
        await this.refreshTokenRepository.delete(refreshToken.id);
        throw new Error('Refresh token expired or revoked');
      }

      // 3. Buscar dados do usuário
      let userData;
      let userType: 'user' | 'customer';

      if (refreshToken.userType === 'customer') {
        userData = await this.customerRepository.findById(refreshToken.userId);
        userType = 'customer';
      } else {
        userData = await this.userRepository.findById(refreshToken.userId);
        userType = 'user';
      }

      if (!userData || !userData.active) {
        // Usuário não encontrado ou inativo, revogar token
        await this.refreshTokenRepository.revokeToken(refreshToken.id);
        throw new Error('User not found or inactive');
      }

      // 4. Gerar novos tokens
      const tokenPayload = {
        id: userData.id,
        email: userData.email,
        ...(userType === 'customer' 
          ? { type: 'customer' }
          : { email: userData.email}
        )
      };

      const tokenPair = this.authService.generateTokenPair(tokenPayload);

      // 5. Revogar o refresh token atual
      await this.refreshTokenRepository.revokeToken(refreshToken.id);

      // 6. Criar novo refresh token
      const newRefreshToken = new RefreshToken(
        uuidv4(),
        userData.id,
        tokenPair.refreshToken,
        userType,
        this.authService.getRefreshTokenExpirationDate(),
        false,
        new Date(),
        new Date(),
        deviceInfo || refreshToken.deviceInfo,
      );

      // 7. Salvar novo refresh token
      await this.refreshTokenRepository.save(newRefreshToken);

      console.log(`✅ Refresh token realizado para usuário: ${userData.id}`);

      // 8. Retornar resposta
      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.accessTokenExpiresIn,
        tokenType: 'Bearer',
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userType === 'customer' ? 'CUSTOMER' : "USER",
          type: userType
        }
      };

    } catch (error) {
      console.error('❌ Erro no refresh token:', error);
      throw error;
    }
  }

  // Método para revogar um refresh token específico
  async revokeToken(refreshToken: string): Promise<boolean> {
    try {
      console.log('🚫 Revogando refresh token...');

      const token = await this.refreshTokenRepository.findByToken(refreshToken);
      
      if (!token) {
        return false; // Token não encontrado, considerar como já revogado
      }

      const result = await this.refreshTokenRepository.revokeToken(token.id);
      
      if (result) {
        console.log('✅ Refresh token revogado com sucesso');
      }

      return result;
    } catch (error) {
      console.error('❌ Erro ao revogar refresh token:', error);
      return false;
    }
  }

  // Método para revogar todos os tokens de um usuário
  async revokeAllUserTokens(userId: string, userType: 'user' | 'customer'): Promise<number> {
    try {
      console.log(`🚫 Revogando todos os tokens do usuário: ${userId}`);

      const revokedCount = await this.refreshTokenRepository.revokeAllUserTokens(userId, userType);
      
      console.log(`✅ ${revokedCount} tokens revogados`);
      
      return revokedCount;
    } catch (error) {
      console.error('❌ Erro ao revogar tokens do usuário:', error);
      return 0;
    }
  }

  // Método de limpeza de tokens expirados
  async cleanupExpiredTokens(): Promise<number> {
    try {
      console.log('🧹 Limpando tokens expirados...');

      const deletedCount = await this.refreshTokenRepository.deleteExpiredTokens();
      
      console.log(`✅ ${deletedCount} tokens expirados removidos`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Erro na limpeza de tokens:', error);
      return 0;
    }
  }
}