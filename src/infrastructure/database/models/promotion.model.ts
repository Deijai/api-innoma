// src/infrastructure/database/models/promotion.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class PromotionModel extends Model {
  public id!: string;
  public name!: string;
  public description!: string;
  public originalPrice!: number;
  public promotionalPrice!: number;
  public startDate!: Date;
  public endDate!: Date;
  public productId!: string;
  public storeId!: string;
  public active!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    PromotionModel.init(
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
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        originalPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          field: 'original_price'
        },
        promotionalPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          field: 'promotional_price'
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'start_date'
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'end_date'
        },
        productId: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'product_id'
        },
        storeId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'store_id',
          references: {
            model: 'stores',
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
        tableName: 'promotions',
        timestamps: true,
        underscored: true
      }
    );
  }
}