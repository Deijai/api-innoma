// src/main/routes/device-routes.ts
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

  // Auth middleware for all device routes
  const authMiddleware = customerAuthMiddleware(authService, customerRepository);

  // Validation chains
  const registerDeviceValidation = [
    body('token').notEmpty().withMessage('Device token is required'),
    body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android')
  ];

  // Device registration route
  router.post(
    '/',
    authMiddleware,
    validateRequest(registerDeviceValidation),
    async (req, res) => {
      try {
        const customerId = req.user?.id;
        if (!customerId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }

        const result = await registerDeviceUseCase.execute(customerId, {
          token: req.body.token,
          platform: req.body.platform
        });

        res.status(201).json(result);
      } catch (error) {
        console.error('Error in registerDevice controller:', error);
        res.status(400).json({
          message: error instanceof Error ? error.message : 'Error registering device'
        });
      }
    }
  );

  return router;
};