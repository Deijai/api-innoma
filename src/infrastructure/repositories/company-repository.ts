// src/infrastructure/repositories/company-repository.ts
import { Company } from '../../domain/entities/company.entity';
import { ICompanyRepository } from '../../domain/interfaces/repositories/company-repository.interface';
import { CompanyModel } from '../database/models/company.model';

export class CompanyRepository implements ICompanyRepository {
  async save(company: Company): Promise<Company> {
    const data = await CompanyModel.upsert({
      id: company.id,
      name: company.name,
      tradingName: company.tradingName,
      cnpj: company.cnpj,
      active: company.active,
      createdAt: company.createdAt,
      updatedAt: new Date()
    });

    const model = data[0];
    
    return new Company(
      model.id,
      model.name,
      model.tradingName,
      model.cnpj,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findById(id: string): Promise<Company | null> {
    const model = await CompanyModel.findByPk(id);
    
    if (!model) {
      return null;
    }
    
    return new Company(
      model.id,
      model.name,
      model.tradingName,
      model.cnpj,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findByCnpj(cnpj: string): Promise<Company | null> {
    const model = await CompanyModel.findOne({
      where: { cnpj }
    });
    
    if (!model) {
      return null;
    }
    
    return new Company(
      model.id,
      model.name,
      model.tradingName,
      model.cnpj,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }
}