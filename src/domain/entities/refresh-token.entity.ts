// src/domain/entities/refresh-token.entity.ts
export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly userType: 'user' | 'customer', // Para distinguir entre users e customers
    public readonly expiresAt: Date,
    public readonly isRevoked: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deviceInfo?: string | null // Opcional: informações do dispositivo
  ) {}

  // Método para verificar se o token está expirado
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Método para verificar se o token está válido
  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}