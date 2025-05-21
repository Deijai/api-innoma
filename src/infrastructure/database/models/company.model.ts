// src/infrastructure/database/models/company.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class CompanyModel extends Model {
  public id!: string;
  public name!: string;
  public tradingName!: string;
  public cnpj!: string;
  public active!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    CompanyModel.init(
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
        tradingName: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'trading_name'
        },
        cnpj: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
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
        tableName: 'companies',
        timestamps: true,
        underscored: true
      }
    );
  }
}