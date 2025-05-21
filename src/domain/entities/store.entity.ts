// src/domain/entities/store.entity.ts
export class Store {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly cnpj: string,
    public readonly address: string,
    public readonly city: string,
    public readonly state: string,
    public readonly zipCode: string,
    public readonly companyId: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}