// src/domain/entities/user.entity.ts
export enum UserRole {
  ADMIN = 'ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  STORE_OPERATOR = 'STORE_OPERATOR'
}

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly storeId: string | null,
    public readonly role: UserRole,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}