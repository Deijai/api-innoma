// src/application/dto/promotion-dto.ts
export interface PromotionDTO {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  promotionalPrice: number;
  startDate: string;
  endDate: string;
  productId: string;
  storeId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}