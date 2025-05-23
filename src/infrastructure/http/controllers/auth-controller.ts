// src/infrastructure/http/controllers/auth-controller.ts - VERSÃO COMPLETA
import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { RegisterCustomerUseCase } from '../../../application/use-cases/auth/register-customer.use-case';
import { LoginCustomerUseCase } from '../../../application/use-cases/auth/login-customer.use-case';
import { ValidateTokenUseCase } from '../../../application/use-cases/auth/validate-token.use-case';
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { RegisterUserDTO } from '../../../application/dto/auth/register-user-dto';
import { LoginDTO } from '../../../application/dto/auth/login-dto';
import { RegisterCustomerDTO } from '../../../application/dto/auth/register-customer-dto';
import { RefreshTokenRequestDTO, RevokeTokenDTO } from '../../../application/dto/auth/refresh-token-request-dto';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly loginCustomerUseCase: LoginCustomerUseCase,
    private readonly validateTokenUseCase: ValidateTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RegisterUserDTO;
      
      // Extrair informações do dispositivo para o refresh token
      const deviceInfo = this.extractDeviceInfo(req.headers['user-agent']);
      
      const result = await this.registerUserUseCase.execute(data, deviceInfo);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerUser controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error registering user'
      });
    }
  }

  async loginUser(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as LoginDTO;
      
      // Extrair informações do dispositivo para o refresh token
      const deviceInfo = this.extractDeviceInfo(req.headers['user-agent']);
      
      const result = await this.loginUserUseCase.execute(data, deviceInfo);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in loginUser controller:', error);
      res.status(401).json({
        message: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  async registerCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RegisterCustomerDTO;
      
      // Extrair informações do dispositivo para o refresh token
      const deviceInfo = this.extractDeviceInfo(req.headers['user-agent']);
      
      const result = await this.registerCustomerUseCase.execute(data, deviceInfo);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerCustomer controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error registering customer'
      });
    }
  }

  async loginCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as LoginDTO;
      
      // Extrair informações do dispositivo para o refresh token
      const deviceInfo = this.extractDeviceInfo(req.headers['user-agent']);
      
      const result = await this.loginCustomerUseCase.execute(data, deviceInfo);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in loginCustomer controller:', error);
      res.status(401).json({
        message: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          valid: false,
          message: 'No token provided or invalid format'
        });
        return;
      }

      const token = authHeader.substring(7);
      const result = await this.validateTokenUseCase.execute(token);
      
      if (result.valid) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Error in validateToken controller:', error);
      res.status(500).json({
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      // Se não há token, considerar logout bem-sucedido
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const result = this.logoutUseCase.executeForce();
        res.status(200).json(result);
        return;
      }

      const token = authHeader.substring(7);
      const result = await this.logoutUseCase.execute(token);
      
      // TODO: Opcionalmente, revogar todos os refresh tokens do usuário
      // Seria necessário extrair o ID do usuário do token e chamar revokeAllUserTokens
      
      // Sempre retorna 200 para logout, mesmo se token inválido
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in logout controller:', error);
      
      // Mesmo em caso de erro, considerar logout bem-sucedido
      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RefreshTokenRequestDTO;
      
      if (!data.refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Extrair informações do dispositivo
      const deviceInfo = this.extractDeviceInfo(req.headers['user-agent']);
      
      const result = await this.refreshTokenUseCase.execute(data, deviceInfo);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error in refreshToken controller:', error);
      
      let statusCode = 401;
      let message = 'Invalid or expired refresh token';
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
          message = 'Refresh token not found';
        } else if (error.message.includes('expired') || error.message.includes('revoked')) {
          statusCode = 401;
          message = 'Refresh token expired or revoked';
        } else if (error.message.includes('User not found')) {
          statusCode = 401;
          message = 'User no longer exists';
        }
      }
      
      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  }

  async revokeRefreshToken(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RevokeTokenDTO;
      
      if (!data.refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      const result = await this.refreshTokenUseCase.revokeToken(data.refreshToken);
      
      res.status(200).json({
        success: true,
        message: result ? 'Refresh token revoked successfully' : 'Refresh token was already revoked',
        revoked: result
      });
    } catch (error) {
      console.error('Error in revokeRefreshToken controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error revoking refresh token'
      });
    }
  }

  // NOVO: Endpoint para revogar todos os tokens de um usuário
  async revokeAllTokens(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const tokenData = await this.validateTokenUseCase.execute(token);
      
      if (!tokenData.valid || !tokenData.user) {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
        return;
      }

      const userType = tokenData.user.type === 'customer' ? 'customer' : 'user';
      const revokedCount = await this.refreshTokenUseCase.revokeAllUserTokens(
        tokenData.user.id, 
        userType
      );
      
      res.status(200).json({
        success: true,
        message: `${revokedCount} refresh tokens revoked`,
        revokedCount
      });
    } catch (error) {
      console.error('Error in revokeAllTokens controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error revoking tokens'
      });
    }
  }

  // NOVO: Endpoint para listar tokens ativos do usuário (útil para debug/admin)
  async getUserTokens(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const tokenData = await this.validateTokenUseCase.execute(token);
      
      if (!tokenData.valid || !tokenData.user) {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
        return;
      }

      // Este endpoint deveria estar em um repositório, mas para simplificar:
      const userType = tokenData.user.type === 'customer' ? 'customer' : 'user';
      // Aqui você implementaria a busca dos tokens do usuário
      // const tokens = await this.refreshTokenRepository.findByUserId(tokenData.user.id, userType);
      
      res.status(200).json({
        success: true,
        message: 'User tokens retrieved',
        data: {
          userId: tokenData.user.id,
          userType,
          // tokens: tokens.map(token => ({
          //   id: token.id,
          //   deviceInfo: token.deviceInfo,
          //   createdAt: token.createdAt,
          //   expiresAt: token.expiresAt,
          //   isRevoked: token.isRevoked
          // }))
        }
      });
    } catch (error) {
      console.error('Error in getUserTokens controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving user tokens'
      });
    }
  }

  // Método auxiliar para extrair informações do dispositivo
  private extractDeviceInfo(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Extrair informações básicas do user-agent
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = /Mobile/.test(userAgent);
    const isExpo = /Expo/.test(userAgent);
    
    if (isExpo) return 'Expo App';
    if (isIOS) return 'iOS Device';
    if (isAndroid) return 'Android Device';
    if (isMobile) return 'Mobile Device';
    
    return 'Web Browser';
  }
}