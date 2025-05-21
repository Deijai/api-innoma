// src/infrastructure/database/models/favorite.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class FavoriteModel extends Model {
  public id!: string;
  public customerId!: string;
  public promotionId!: string;
  public createdAt!: Date;

  static initialize(sequelize: Sequelize): void {
    FavoriteModel.init(
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
        promotionId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'promotion_id',
          references: {
            model: 'promotions',
            key: 'id'
          }
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at'
        }
      },
      {
        sequelize,
        tableName: 'favorites',
        timestamps: true,
        updatedAt: false,
        underscored: true
      }
    );
  }
}
