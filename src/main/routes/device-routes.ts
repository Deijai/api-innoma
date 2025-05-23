// src/main/routes/device-routes.ts - VERSÃO EXPO ATUALIZADA
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { Expo } from 'expo-server-sdk';
import { validateRequest } from '../middlewares/validate-request-middleware';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';
import { ICustomerRepository } from '../../domain/interfaces/repositories/customer-repository.interface';
import { RegisterDeviceUseCase } from '../../application/use-cases/devices/register-device.use-case';

export default (
  registerDeviceUseCase: RegisterDeviceUseCase,
  authService: IAuthService,
  customerRepository: ICustomerRepository
): Router => {
  const router = Router();

  // MIDDLEWARE DE AUTENTICAÇÃO PARA CUSTOMERS
  const customerAuthMiddleware = async (req: any, res: any, next: any) => {
    console.log('🔍 [DEBUG] Expo Device Route - Auth check');
    console.log('🔍 [DEBUG] Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [DEBUG] No token provided or invalid format');
      return res.status(401).json({ 
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    console.log('🔑 [DEBUG] Token extraído (primeiros 20 chars):', token.substring(0, 20) + '...');
    
    try {
      const decoded = authService.verifyToken(token);
      console.log('🔓 [DEBUG] Token decodificado:', JSON.stringify(decoded, null, 2));
      
      if (!decoded) {
        console.log('❌ [DEBUG] Token inválido ou expirado');
        return res.status(401).json({ 
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      // Verificar se é token de customer
      if (decoded.type !== 'customer') {
        console.log('❌ [DEBUG] Token não é de customer, tipo encontrado:', decoded.type);
        return res.status(401).json({ 
          message: 'Invalid token type - expected customer token',
          code: 'INVALID_TOKEN_TYPE'
        });
      }

      // Verificar se customer existe
      const customer = await customerRepository.findById(decoded.id);
      
      if (!customer) {
        console.log('❌ [DEBUG] Customer não encontrado no DB:', decoded.id);
        return res.status(401).json({ 
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        });
      }

      if (!customer.active) {
        console.log('❌ [DEBUG] Customer inativo:', customer.id);
        return res.status(401).json({ 
          message: 'Customer is inactive',
          code: 'CUSTOMER_INACTIVE'
        });
      }

      console.log('✅ [DEBUG] Customer autenticado com sucesso:', customer.id);

      req.user = {
        id: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        type: 'customer'
      };

      next();
    } catch (error) {
      console.error('❌ [DEBUG] Erro no middleware de auth:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Validation chains para Expo
  const registerDeviceValidation = [
    body('token')
      .notEmpty()
      .withMessage('Device token is required')
      .custom((value) => {
        if (!Expo.isExpoPushToken(value)) {
          throw new Error('Invalid Expo push token format. Make sure you are using getExpoPushTokenAsync() from expo-notifications.');
        }
        return true;
      }),
    body('platform')
      .isIn(['ios', 'android'])
      .withMessage('Platform must be ios or android')
  ];

  // POST /api/mobile/devices/register - Registrar dispositivo
  router.post(
    '/register',
    customerAuthMiddleware,
    validateRequest(registerDeviceValidation),
    async (req, res) => {
      try {
        console.log('📱 [DEBUG] Expo device registration endpoint hit');
        console.log('👤 [DEBUG] User from middleware:', req.user);
        
        const customerId = req.user?.id;
        if (!customerId) {
          console.log('❌ [DEBUG] No customerId in req.user');
          res.status(401).json({ 
            message: 'Unauthorized - no customer ID',
            code: 'NO_CUSTOMER_ID'
          });
          return;
        }

        // Validação adicional do token Expo
        if (!Expo.isExpoPushToken(req.body.token)) {
          console.error('❌ [DEBUG] Token Expo inválido fornecido');
          res.status(400).json({ 
            message: 'Invalid Expo push token. Make sure you are using expo-notifications library and getExpoPushTokenAsync().',
            code: 'INVALID_EXPO_TOKEN'
          });
          return;
        }

        console.log('🔧 [DEBUG] Executando RegisterDeviceUseCase para customer:', customerId);
        console.log('📱 [DEBUG] Device data:', {
          token: req.body.token.substring(0, 40) + '...',
          platform: req.body.platform
        });

        const result = await registerDeviceUseCase.execute(customerId, {
          token: req.body.token,
          platform: req.body.platform
        });

        console.log('✅ [DEBUG] Dispositivo Expo registrado com sucesso:', result.id);
        
        res.status(201).json({
          success: true,
          message: 'Device registered successfully for Expo push notifications',
          data: {
            id: result.id,
            customerId: result.customerId,
            platform: result.platform,
            tokenPreview: result.token.substring(0, 40) + '...',
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
          }
        });
      } catch (error) {
        console.error('❌ [DEBUG] Error in registerDevice controller:', error);
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Error registering device',
          code: 'REGISTRATION_ERROR'
        });
      }
    }
  );

  // POST /api/mobile/devices/validate-token - Validar token Expo
  router.post(
    '/validate-token',
    customerAuthMiddleware,
    [
      body('token').notEmpty().withMessage('Token is required')
    ],
    async (req: Request, res: Response) => {
      try {
        const { token } = req.body;
        const isValid = Expo.isExpoPushToken(token);
        
        console.log('🔍 [DEBUG] Validando token Expo:', token.substring(0, 40) + '...');
        console.log('✅ [DEBUG] Token válido:', isValid);
        
        res.json({
          success: true,
          data: {
            valid: isValid,
            tokenType: isValid ? 'expo' : 'invalid',
            tokenPreview: token.substring(0, 40) + '...'
          },
          message: isValid 
            ? 'Valid Expo push token' 
            : 'Invalid token. Make sure you are using expo-notifications and getExpoPushTokenAsync().'
        });
      } catch (error) {
        console.error('❌ [DEBUG] Erro na validação do token:', error);
        res.status(500).json({ 
          success: false,
          message: 'Error validating token',
          code: 'VALIDATION_ERROR'
        });
      }
    }
  );

  // POST /api/mobile/devices/cleanup - Limpar tokens inválidos
  router.post(
    '/cleanup',
    customerAuthMiddleware,
    async (req, res) => {
      try {
        const customerId = req.user?.id;
        if (!customerId) {
          res.status(401).json({ 
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
          });
          return;
        }

        console.log('🧹 [DEBUG] Iniciando limpeza de tokens para customer:', customerId);
        
        const result = await registerDeviceUseCase.validateAndCleanTokens(customerId);
        
        console.log('✅ [DEBUG] Limpeza concluída:', result);
        
        res.json({
          success: true,
          message: 'Token cleanup completed successfully',
          data: {
            validTokens: result.valid,
            removedTokens: result.removed,
            customerId
          }
        });
      } catch (error) {
        console.error('❌ [DEBUG] Erro na limpeza de tokens:', error);
        res.status(500).json({ 
          success: false,
          message: 'Error cleaning up tokens',
          code: 'CLEANUP_ERROR'
        });
      }
    }
  );

  // GET /api/mobile/devices - Listar dispositivos do customer
  router.get(
    '/',
    customerAuthMiddleware,
    async (req, res) => {
      try {
        const customerId = req.user?.id;
        if (!customerId) {
          res.status(401).json({ 
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
          });
          return;
        }

        console.log('📱 [DEBUG] Listando dispositivos para customer:', customerId);
        
        const stats = await registerDeviceUseCase.getCustomerDeviceStats(customerId);
        
        res.json({
          success: true,
          message: 'Device statistics retrieved successfully',
          data: {
            customerId,
            ...stats
          }
        });
      } catch (error) {
        console.error('❌ [DEBUG] Erro ao listar dispositivos:', error);
        res.status(500).json({ 
          success: false,
          message: 'Error retrieving device statistics',
          code: 'STATS_ERROR'
        });
      }
    }
  );

  // GET /api/mobile/devices/health - Health check do serviço
  router.get(
    '/health',
    async (req, res) => {
      try {
        const hasExpoAccessToken = !!process.env.EXPO_ACCESS_TOKEN;
        const maxDevicesPerCustomer = parseInt(process.env.MAX_DEVICES_PER_CUSTOMER || '10');
        const debugMode = process.env.PUSH_NOTIFICATIONS_DEBUG === 'true';
        
        res.json({
          success: true,
          message: 'Device service health check',
          data: {
            service: 'expo-push-notifications',
            healthy: true,
            configuration: {
              hasExpoAccessToken,
              maxDevicesPerCustomer,
              debugMode
            },
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('❌ [DEBUG] Erro no health check:', error);
        res.status(500).json({ 
          success: false,
          message: 'Health check failed',
          code: 'HEALTH_CHECK_ERROR'
        });
      }
    }
  );

  return router;
}