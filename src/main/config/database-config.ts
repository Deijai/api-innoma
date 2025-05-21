// src/main/config/database-config.ts
import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  database: process.env.DB_NAME || 'promo_sync',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  dialect: (process.env.DB_DIALECT || 'mysql') as 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql'
};