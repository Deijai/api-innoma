// src/infrastructure/repositories/store-repository.ts
import { Store } from '../../domain/entities/store.entity';
import { IStoreRepository } from '../../domain/interfaces/repositories/store-repository.interface';
import { StoreModel } from '../database/models/store.model';

export class StoreRepository implements IStoreRepository {
  async save(store: Store): Promise<Store> {
    const data = await StoreModel.upsert({
      id: store.id,
      name: store.name,
      cnpj: store.cnpj,
      address: store.address,
      city: store.city,
      state: store.state,
      zipCode: store.zipCode,
      companyId: store.companyId,
      active: store.active,
      createdAt: store.createdAt,
      updatedAt: new Date()
    });

    const model = data[0];
    
    return new Store(
      model.id,
      model.name,
      model.cnpj,
      model.address,
      model.city,
      model.state,
      model.zipCode,
      model.companyId,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findById(id: string): Promise<Store | null> {
    const model = await StoreModel.findByPk(id);
    
    if (!model) {
      return null;
    }
    
    return new Store(
      model.id,
      model.name,
      model.cnpj,
      model.address,
      model.city,
      model.state,
      model.zipCode,
      model.companyId,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findByCnpj(cnpj: string): Promise<Store | null> {
    const model = await StoreModel.findOne({
      where: { cnpj }
    });
    
    if (!model) {
      return null;
    }
    
    return new Store(
      model.id,
      model.name,
      model.cnpj,
      model.address,
      model.city,
      model.state,
      model.zipCode,
      model.companyId,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findByCompanyId(companyId: string): Promise<Store[]> {
    const models = await StoreModel.findAll({
      where: { companyId, active: true }
    });
    
    return models.map(model => 
      new Store(
        model.id,
        model.name,
        model.cnpj,
        model.address,
        model.city,
        model.state,
        model.zipCode,
        model.companyId,
        model.active,
        model.createdAt,
        model.updatedAt
      )
    );
  }
}