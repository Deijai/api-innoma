// src/application/dto/auth/register-customer-dto.ts
export interface RegisterCustomerDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
}