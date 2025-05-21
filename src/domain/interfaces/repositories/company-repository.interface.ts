// src/domain/interfaces/repositories/company-repository.interface.ts
import { Company } from '../../entities/company.entity';

export interface ICompanyRepository {
  save(company: Company): Promise<Company>;
  findById(id: string): Promise<Company | null>;
  findByCnpj(cnpj: string): Promise<Company | null>;
}
