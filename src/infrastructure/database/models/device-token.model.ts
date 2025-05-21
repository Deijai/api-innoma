// src/infrastructure/database/models/device-token.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class DeviceTokenModel extends Model {
  public id!: string;
  public customerId!: string;
  public token!: string;
  public platform!: 'ios' | 'android';
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    DeviceTokenModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        customerId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'customer_id',
          references: {
            model: 'customers',
            key: 'id'
          }
        },
        token: {
          type: DataTypes.STRING,
          allowNull: false
        },
        platform: {
          type: DataTypes.ENUM('ios', 'android'),
          allowNull: false
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
        tableName: 'device_tokens',
        timestamps: true,
        underscored: true
      }
    );
  }
}