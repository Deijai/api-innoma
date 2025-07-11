// src/infrastructure/http/controllers/auth-controller.ts - VERSÃO ATUALIZADA
import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { RegisterCustomerUseCase } from '../../../application/use-cases/auth/register-customer.use-case';
import { LoginCustomerUseCase } from '../../../application/use-cases/auth/login-customer.use-case';
import { RegisterUserDTO } from '../../../application/dto/auth/register-user-dto';
import { LoginDTO } from '../../../application/dto/auth/login-dto';
import { RegisterCustomerDTO } from '../../../application/dto/auth/register-customer-dto';
import { ValidateTokenUseCase } from '../../../application/use-cases/auth/validate-token.use-case';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly loginCustomerUseCase: LoginCustomerUseCase,
    private readonly validateTokenUseCase: ValidateTokenUseCase
  ) {}

  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RegisterUserDTO;
      const result = await this.registerUserUseCase.execute(data);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerUser controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error registering user'
      });
    }
  }

  async loginUser(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as LoginDTO;
      const result = await this.loginUserUseCase.execute(data);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in loginUser controller:', error);
      res.status(401).json({
        message: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  async registerCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RegisterCustomerDTO;
      const result = await this.registerCustomerUseCase.execute(data);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerCustomer controller:', error);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Error registering customer'
      });
    }
  }

  async loginCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as LoginDTO;
      const result = await this.loginCustomerUseCase.execute(data);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in loginCustomer controller:', error);
      res.status(401).json({
        message: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  // NOVO: Validar token
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          valid: false,
          message: 'No token provided or invalid format'
        });
        return;
      }

      const token = authHeader.substring(7);
      const result = await this.validateTokenUseCase.execute(token);
      
      if (result.valid) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Error in validateToken controller:', error);
      res.status(500).json({
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed'
      });
    }
  }
}