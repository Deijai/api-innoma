// src/main/middlewares/error-middleware.ts
import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  
  return res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  }) as any;
};
