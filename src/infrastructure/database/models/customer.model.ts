// src/infrastructure/database/models/customer.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class CustomerModel extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public passwordHash!: string;
  public phone!: string | null;
  public active!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    CustomerModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        passwordHash: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'password_hash'
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        tableName: 'customers',
        timestamps: true,
        underscored: true
      }
    );
  }
}