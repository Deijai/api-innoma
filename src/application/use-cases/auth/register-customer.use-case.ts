// src/application/use-cases/auth/register-customer.use-case.ts
import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../../../domain/entities/customer.entity';
import { ICustomerRepository } from '../../../domain/interfaces/repositories/customer-repository.interface';
import { IAuthService } from '../../../domain/interfaces/services/auth-service.interface';
import { RegisterCustomerDTO } from '../../dto/auth/register-customer-dto';
import { CustomerAuthResultDTO } from '../../dto/auth/customer-auth-result-dto';

export class RegisterCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(data: RegisterCustomerDTO): Promise<CustomerAuthResultDTO> {
    // Check if email already exists
    const existingCustomer = await this.customerRepository.findByEmail(data.email);
    if (existingCustomer) {
      throw new Error('Email already in use');
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(data.password);

    // Create customer
    const customer = new Customer(
      uuidv4(),
      data.name,
      data.email,
      passwordHash,
      data.phone || null,
      true, // active
      new Date(),
      new Date()
    );

    // Save customer
    const savedCustomer = await this.customerRepository.save(customer);

    // Generate token
    const token = this.authService.generateToken({
      id: savedCustomer.id,
      email: savedCustomer.email,
      type: 'customer'
    });

    // Return result
    return {
      token,
      customer: {
        id: savedCustomer.id,
        name: savedCustomer.name,
        email: savedCustomer.email,
        phone: savedCustomer.phone || undefined
      }
    };
  }
}