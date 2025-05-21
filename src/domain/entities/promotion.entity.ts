// src/domain/entities/promotion.entity.ts
export class Promotion {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly originalPrice: number,
    public readonly promotionalPrice: number,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly productId: string,
    public readonly storeId: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
