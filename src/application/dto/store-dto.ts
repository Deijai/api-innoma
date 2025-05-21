// src/application/dto/store-dto.ts
export interface StoreDTO {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  companyId: string;
  active: boolean;
}