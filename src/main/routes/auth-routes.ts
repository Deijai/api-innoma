// src/main/routes/auth-routes.ts - VERSÃO ATUALIZADA
import { Router } from 'express';
import { AuthController } from '../../infrastructure/http/controllers/auth-controller';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate-request-middleware';
import { UserRole } from '../../domain/entities/user.entity';

export default (controller: AuthController): Router => {
  const router = Router();

  // Validation chains
  const registerUserValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(Object.values(UserRole)).withMessage('Invalid role')
  ];

  const loginValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ];

  const registerCustomerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required')
  ];

  // Web Panel Auth Routes
  router.post(
    '/register',
    validateRequest(registerUserValidation),
    (req, res) => controller.registerUser(req, res)
  );

  router.post(
    '/login',
    validateRequest(loginValidation),
    (req, res) => controller.loginUser(req, res)
  );

  // Mobile App Auth Routes
  router.post(
    '/mobile/register',
    validateRequest(registerCustomerValidation),
    (req, res) => controller.registerCustomer(req, res)
  );

  router.post(
    '/mobile/login',
    validateRequest(loginValidation),
    (req, res) => controller.loginCustomer(req, res)
  );

  // NOVO: Token Validation Route (funciona para ambos: web e mobile)
  router.post(
    '/validate-token',
    (req, res) => controller.validateToken(req, res)
  );

  return router;
};