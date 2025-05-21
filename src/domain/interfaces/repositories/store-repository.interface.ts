// src/domain/interfaces/repositories/store-repository.interface.ts
import { Store } from '../../entities/store.entity';

export interface IStoreRepository {
  save(store: Store): Promise<Store>;
  findById(id: string): Promise<Store | null>;
  findByCnpj(cnpj: string): Promise<Store | null>;
  findByCompanyId(companyId: string): Promise<Store[]>;
}