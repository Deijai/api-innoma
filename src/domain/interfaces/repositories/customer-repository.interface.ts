// src/domain/interfaces/repositories/customer-repository.interface.ts
import { Customer } from '../../entities/customer.entity';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  save(customer: Customer): Promise<Customer>;
  update(id: string, data: Partial<Omit<Customer, 'id'>>): Promise<Customer>;
}