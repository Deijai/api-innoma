// src/main/middlewares/validate-request-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check if there are errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    // If there are errors, return them
    res.status(400).json({ errors: errors.array() });
  };
};