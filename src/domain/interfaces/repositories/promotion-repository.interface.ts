// src/domain/interfaces/repositories/promotion-repository.interface.ts

import { Promotion } from "../../entities/promotion.entity";

export interface IPromotionRepository {
  save(promotion: Promotion): Promise<Promotion>;
  saveMany(promotions: Promotion[]): Promise<Promotion[]>;
  findById(id: string): Promise<Promotion | null>;
  findByStoreId(storeId: string): Promise<Promotion[]>;
  findActive(): Promise<Promotion[]>;
}