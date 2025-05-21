// src/domain/entities/company.entity.ts
export class Company {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tradingName: string,
    public readonly cnpj: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}