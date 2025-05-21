// src/domain/entities/favorite.entity.ts
export class Favorite {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly promotionId: string,
    public readonly createdAt: Date
  ) {}
}