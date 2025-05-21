// src/infrastructure/database/models/store.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class StoreModel extends Model {
  public id!: string;
  public name!: string;
  public cnpj!: string;
  public address!: string;
  public city!: string;
  public state!: string;
  public zipCode!: string;
  public companyId!: string;
  public active!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    StoreModel.init(
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
        cnpj: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        address: {
          type: DataTypes.STRING,
          allowNull: false
        },
        city: {
          type: DataTypes.STRING,
          allowNull: false
        },
        state: {
          type: DataTypes.STRING,
          allowNull: false
        },
        zipCode: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'zip_code'
        },
        companyId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'company_id',
          references: {
            model: 'companies',
            key: 'id'
          }
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
        tableName: 'stores',
        timestamps: true,
        underscored: true
      }
    );
  }
}