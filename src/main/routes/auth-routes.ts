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

  // NOVO: Validação para refresh token
  const refreshTokenValidation = [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ];

  // NOVO: Validação para revogar token
  const revokeTokenValidation = [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
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

  // NOVO: Logout Route (funciona para ambos: web e mobile)
  router.post(
    '/logout',
    (req, res) => controller.logout(req, res)
  );

  // NOVO: Refresh Token Route (funciona para ambos: web e mobile)
  router.post(
    '/refresh-token',
    validateRequest(refreshTokenValidation),
    (req, res) => controller.refreshToken(req, res)
  );

  // NOVO: Revoke Refresh Token Route (funciona para ambos: web e mobile)
  router.post(
    '/revoke-token',
    validateRequest(revokeTokenValidation),
    (req, res) => controller.revokeRefreshToken(req, res)
  );

  // NOVO: Revoke All Tokens Route (requer autenticação)
  router.post(
    '/revoke-all-tokens',
    (req, res) => controller.revokeAllTokens(req, res)
  );

  // NOVO: Get User Tokens Route (útil para debug, requer autenticação)
  router.get(
    '/tokens',
    (req, res) => controller.getUserTokens(req, res)
  );

  return router;
};