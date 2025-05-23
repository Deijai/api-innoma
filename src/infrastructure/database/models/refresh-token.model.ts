// src/infrastructure/database/models/refresh-token.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class RefreshTokenModel extends Model {
  public id!: string;
  public userId!: string;
  public token!: string;
  public userType!: 'user' | 'customer';
  public expiresAt!: Date;
  public isRevoked!: boolean;
  public deviceInfo!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    RefreshTokenModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'user_id'
        },
        token: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true
        },
        userType: {
          type: DataTypes.ENUM('user', 'customer'),
          allowNull: false,
          field: 'user_type'
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'expires_at'
        },
        isRevoked: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_revoked'
        },
        deviceInfo: {
          type: DataTypes.STRING,
          allowNull: true,
          field: 'device_info'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at'
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at'
        }
      },
      {
        sequelize,
        tableName: 'refresh_tokens',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['token']
          },
          {
            fields: ['user_id', 'user_type']
          },
          {
            fields: ['expires_at']
          },
          {
            fields: ['is_revoked']
          }
        ]
      }
    );
  }
}