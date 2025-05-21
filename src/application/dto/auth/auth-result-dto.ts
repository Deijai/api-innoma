// src/application/dto/auth/auth-result-dto.ts
export interface AuthResultDTO {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    storeId?: string;
  };
}