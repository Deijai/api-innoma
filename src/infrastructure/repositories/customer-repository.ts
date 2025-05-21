// src/infrastructure/repositories/customer-repository.ts
import { Customer } from '../../domain/entities/customer.entity';
import { ICustomerRepository } from '../../domain/interfaces/repositories/customer-repository.interface';
import { CustomerModel } from '../database/models/customer.model';

export class CustomerRepository implements ICustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const customerModel = await CustomerModel.findByPk(id);
    
    if (!customerModel) {
      return null;
    }
    
    return this.toEntity(customerModel);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customerModel = await CustomerModel.findOne({
      where: { email }
    });
    
    if (!customerModel) {
      return null;
    }
    
    return this.toEntity(customerModel);
  }

  async save(customer: Customer): Promise<Customer> {
    const customerModel = await CustomerModel.create({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      passwordHash: customer.passwordHash,
      phone: customer.phone,
      active: customer.active,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    });
    
    return this.toEntity(customerModel);
  }

  async update(id: string, data: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
    const customerModel = await CustomerModel.findByPk(id);
    
    if (!customerModel) {
      throw new Error('Customer not found');
    }
    
    await customerModel.update(data);
    
    return this.toEntity(customerModel);
  }

  private toEntity(model: CustomerModel): Customer {
    return new Customer(
      model.id,
      model.name,
      model.email,
      model.passwordHash,
      model.phone,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }
}