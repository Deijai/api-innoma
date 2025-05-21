// src/application/dto/sync-request-dto.ts
import { PromotionDTO } from './promotion-dto';
import { StoreDTO } from './store-dto';
import { CompanyDTO } from './company-dto';

export interface SyncRequestDTO {
  timestamp: string;
  company: CompanyDTO;
  store: StoreDTO;
  promotions: PromotionDTO[];
}