// src/main/middlewares/customer-auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';
import { ICustomerRepository } from '../../domain/interfaces/repositories/customer-repository.interface';

export const customerAuthMiddleware = (
  authService: IAuthService,
  customerRepository: ICustomerRepository
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    if (!decoded || decoded.type !== 'customer') {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    try {
      const customer = await customerRepository.findById(decoded.id);
      
      if (!customer) {
        res.status(401).json({ message: 'Customer not found' });
        return;
      }

      if (!customer.active) {
        res.status(401).json({ message: 'Customer is inactive' });
        return;
      }

      req.user = {
        id: customer.id,
        email: customer.email,
        role: 'CUSTOMER',
        type: 'customer'
      };

      next();
    } catch (error) {
      console.error('Error in customer auth middleware:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};