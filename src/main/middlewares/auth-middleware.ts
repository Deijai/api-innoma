// src/main/middlewares/auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  // Check for API key
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const apiKey = process.env.API_KEY;
    
    if (token === apiKey) {
      next();
      return;
    }
  }

  // Check for JWT token
  try {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
    
    jwt.verify(token, secret);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};