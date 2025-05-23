// src/application/use-cases/auth/logout.use-case.ts
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';

export interface LogoutResult {
  success: boolean;
  message: string;
}

export class LogoutUseCase {
  constructor(
    private readonly authService: IAuthService
  ) {}

  async execute(token: string): Promise<LogoutResult> {
    try {
      // Verificar se o token é válido
      const decoded = this.authService.verifyToken(token);
      
      if (!decoded) {
        return {
          success: false,
          message: 'Token inválido ou já expirado'
        };
      }

      // Para logout simples, apenas confirmamos que o token era válido
      // Em implementações mais complexas, você poderia:
      // - Adicionar o token a uma blacklist
      // - Salvar o logout no banco de dados
      // - Limpar sessões relacionadas
      
      console.log(`🚪 Logout realizado para usuário: ${decoded.id} (${decoded.email || 'email não informado'})`);
      
      return {
        success: true,
        message: 'Logout realizado com sucesso'
      };
      
    } catch (error) {
      console.error('Erro durante logout:', error);
      
      return {
        success: false,
        message: 'Erro interno durante logout'
      };
    }
  }

  // Método alternativo para logout sem validação de token
  // Útil quando o token já expirou mas queremos confirmar o logout
  executeForce(): LogoutResult {
    console.log('🚪 Logout forçado realizado');
    
    return {
      success: true,
      message: 'Logout realizado com sucesso'
    };
  }
}