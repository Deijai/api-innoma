// src/main/routes/device-routes.ts - VERSÃO CORRIGIDA
import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate-request-middleware';
import { customerAuthMiddleware } from '../middlewares/customer-auth-middleware';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';
import { ICustomerRepository } from '../../domain/interfaces/repositories/customer-repository.interface';
import { RegisterDeviceUseCase } from '../../application/use-cases/devices/register-device.use-case';

export default (
  registerDeviceUseCase: RegisterDeviceUseCase,
  authService: IAuthService,
  customerRepository: ICustomerRepository
): Router => {
  const router = Router();

  // MIDDLEWARE PERSONALIZADO COM DEBUG
  const debugAuthMiddleware = async (req: any, res: any, next: any) => {
    console.log('🔍 [DEBUG] Device Route - Auth check');
    console.log('🔍 [DEBUG] Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [DEBUG] No token provided or invalid format');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('🔑 [DEBUG] Token extraído (primeiros 20 chars):', token.substring(0, 20) + '...');
    
    try {
      const decoded = authService.verifyToken(token);
      console.log('🔓 [DEBUG] Token decodificado:', JSON.stringify(decoded, null, 2));
      
      if (!decoded) {
        console.log('❌ [DEBUG] Token inválido ou expirado');
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      // Verificar se é token de customer
      if (decoded.type !== 'customer') {
        console.log('❌ [DEBUG] Token não é de customer, tipo encontrado:', decoded.type);
        console.log('🔍 [DEBUG] Conteúdo completo do token:', decoded);
        return res.status(401).json({ message: 'Invalid token type - expected customer token' });
      }

      // Verificar se customer existe
      const customer = await customerRepository.findById(decoded.id);
      
      if (!customer) {
        console.log('❌ [DEBUG] Customer não encontrado no DB:', decoded.id);
        return res.status(401).json({ message: 'Customer not found' });
      }

      if (!customer.active) {
        console.log('❌ [DEBUG] Customer inativo:', customer.id);
        return res.status(401).json({ message: 'Customer is inactive' });
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
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Validation chains
  const registerDeviceValidation = [
    body('token').notEmpty().withMessage('Device token is required'),
    body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android')
  ];

  // Device registration route COM DEBUG
  router.post(
    '/',
    debugAuthMiddleware, // Usar middleware de debug
    validateRequest(registerDeviceValidation),
    async (req, res) => {
      try {
        console.log('📱 [DEBUG] Device registration endpoint hit');
        console.log('👤 [DEBUG] User from middleware:', req.user);
        
        const customerId = req.user?.id;
        if (!customerId) {
          console.log('❌ [DEBUG] No customerId in req.user');
          res.status(401).json({ message: 'Unauthorized - no customer ID' });
          return;
        }

        console.log('🔧 [DEBUG] Executando RegisterDeviceUseCase para customer:', customerId);
        console.log('📱 [DEBUG] Device data:', {
          token: req.body.token?.substring(0, 20) + '...',
          platform: req.body.platform
        });

        const result = await registerDeviceUseCase.execute(customerId, {
          token: req.body.token,
          platform: req.body.platform
        });

        console.log('✅ [DEBUG] Device registrado com sucesso:', result);
        res.status(201).json(result);
      } catch (error) {
        console.error('❌ [DEBUG] Error in registerDevice controller:', error);
        res.status(400).json({
          message: error instanceof Error ? error.message : 'Error registering device'
        });
      }
    }
  );

  return router;
};