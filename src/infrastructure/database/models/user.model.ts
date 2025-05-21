// src/infrastructure/database/models/user.model.ts
import { Model, DataTypes, Sequelize } from 'sequelize';
import { UserRole } from '../../../domain/entities/user.entity';

export class UserModel extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public passwordHash!: string;
  public storeId!: string | null;
  public role!: UserRole;
  public active!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initialize(sequelize: Sequelize): void {
    UserModel.init(
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
        storeId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'store_id',
          references: {
            model: 'stores',
            key: 'id'
          }
        },
        role: {
          type: DataTypes.ENUM(...Object.values(UserRole)),
          allowNull: false
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
        tableName: 'users',
        timestamps: true,
        underscored: true
      }
    );
  }
}