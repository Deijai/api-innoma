// src/application/dto/auth/customer-auth-result-dto.ts
export interface CustomerAuthResultDTO {
  token: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}