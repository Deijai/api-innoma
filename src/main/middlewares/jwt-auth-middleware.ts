// src/main/middlewares/jwt-auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../../domain/interfaces/services/auth-service.interface';
import { IUserRepository } from '../../domain/interfaces/repositories/user-repository.interface';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        storeId?: string;
        type?: string;
      };
    }
  }
}

export const jwtAuthMiddleware = (
  authService: IAuthService,
  userRepository: IUserRepository,
  roles?: string[]
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    // If decoded token has type 'customer', this is a mobile app user
    if (decoded.type === 'customer') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: 'CUSTOMER',
        type: 'customer'
      };
      next();
      return;
    }

    // Otherwise, it's a web panel user (store/admin)
    try {
      const user = await userRepository.findById(decoded.id);
      
      if (!user) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      if (!user.active) {
        res.status(401).json({ message: 'User is inactive' });
        return;
      }

      // Check if user has the required role
      if (roles && roles.length > 0 && !roles.includes(user.role)) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        storeId: user.storeId || undefined
      };

      next();
    } catch (error) {
      console.error('Error in JWT auth middleware:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};