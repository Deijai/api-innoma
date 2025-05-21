// src/infrastructure/database/sequelize-database.ts
import { Sequelize } from 'sequelize';
import { PromotionModel } from './models/promotion.model';
import { StoreModel } from './models/store.model';
import { CompanyModel } from './models/company.model';

export class SequelizeDatabase {
  private sequelize: Sequelize;

  constructor(
    private readonly config: {
      database: string;
      username: string;
      password: string;
      host: string;
      port: number;
      dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';
    }
  ) {
    this.sequelize = new Sequelize(
      this.config.database,
      this.config.username,
      this.config.password,
      {
        host: this.config.host,
        port: this.config.port,
        dialect: this.config.dialect,
        logging: process.env.NODE_ENV === 'development' ? console.log : false
      }
    );
  }

  async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      this.initializeModels();
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  private initializeModels(): void {
    CompanyModel.initialize(this.sequelize);
    StoreModel.initialize(this.sequelize);
    PromotionModel.initialize(this.sequelize);

    // Define associations
    CompanyModel.hasMany(StoreModel, { foreignKey: 'company_id' });
    StoreModel.belongsTo(CompanyModel, { foreignKey: 'company_id' });
    
    StoreModel.hasMany(PromotionModel, { foreignKey: 'store_id' });
    PromotionModel.belongsTo(StoreModel, { foreignKey: 'store_id' });
  }

  async sync(force = false): Promise<void> {
    await this.sequelize.sync({ force });
    console.log('All models were synchronized successfully.');
  }

  getSequelize(): Sequelize {
    return this.sequelize;
  }
}