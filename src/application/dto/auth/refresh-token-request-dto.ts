// src/application/dto/auth/refresh-token-request-dto.ts
export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

// src/application/dto/auth/refresh-token-response-dto.ts
export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: string;
  user?: {
    id: string;
    name: string;
    email: string;
    type: 'user' | 'customer';
  };
}

// src/application/dto/auth/revoke-token-dto.ts
export interface RevokeTokenDTO {
  refreshToken: string;
}