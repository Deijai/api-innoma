
// src/application/dto/auth/auth-result-dto.ts - VERSÃO ATUALIZADA
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

// NOVO: AuthResult com refresh token
export interface AuthResultWithRefreshDTO extends AuthResultDTO {
  refreshToken: string;
  expiresIn: string;
}