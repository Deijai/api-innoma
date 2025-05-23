// src/application/dto/auth/customer-auth-result-dto.ts - VERSÃO ATUALIZADA
export interface CustomerAuthResultDTO {
  token: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

// NOVO: CustomerAuthResult com refresh token
export interface CustomerAuthResultWithRefreshDTO extends CustomerAuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}