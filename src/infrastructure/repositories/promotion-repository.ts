// src/infrastructure/repositories/promotion-repository.ts
import { Promotion } from '../../domain/entities/promotion.entity';
import { IPromotionRepository } from '../../domain/interfaces/repositories/promotion-repository.interface';
import { PromotionModel } from '../database/models/promotion.model';
import { Op } from 'sequelize';

export class PromotionRepository implements IPromotionRepository {
  async save(promotion: Promotion): Promise<Promotion> {
    const data = await PromotionModel.upsert({
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      originalPrice: promotion.originalPrice,
      promotionalPrice: promotion.promotionalPrice,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      productId: promotion.productId,
      storeId: promotion.storeId,
      active: promotion.active,
      createdAt: promotion.createdAt,
      updatedAt: new Date()
    });

    const model = data[0];
    
    return new Promotion(
      model.id,
      model.name,
      model.description,
      Number(model.originalPrice),
      Number(model.promotionalPrice),
      model.startDate,
      model.endDate,
      model.productId,
      model.storeId,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async saveMany(promotions: Promotion[]): Promise<Promotion[]> {
    const savedPromotions: Promotion[] = [];

    // Using transaction to ensure all promotions are saved or none
    const transaction = await PromotionModel.sequelize!.transaction();

    try {
      for (const promotion of promotions) {
        const data = await PromotionModel.upsert(
          {
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            originalPrice: promotion.originalPrice,
            promotionalPrice: promotion.promotionalPrice,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            productId: promotion.productId,
            storeId: promotion.storeId,
            active: promotion.active,
            createdAt: promotion.createdAt,
            updatedAt: new Date()
          },
          { transaction }
        );

        const model = data[0];
        
        savedPromotions.push(
          new Promotion(
            model.id,
            model.name,
            model.description,
            Number(model.originalPrice),
            Number(model.promotionalPrice),
            model.startDate,
            model.endDate,
            model.productId,
            model.storeId,
            model.active,
            model.createdAt,
            model.updatedAt
          )
        );
      }

      await transaction.commit();
      return savedPromotions;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findById(id: string): Promise<Promotion | null> {
    const model = await PromotionModel.findByPk(id);
    
    if (!model) {
      return null;
    }
    
    return new Promotion(
      model.id,
      model.name,
      model.description,
      Number(model.originalPrice),
      Number(model.promotionalPrice),
      model.startDate,
      model.endDate,
      model.productId,
      model.storeId,
      model.active,
      model.createdAt,
      model.updatedAt
    );
  }

  async findByStoreId(storeId: string): Promise<Promotion[]> {
    const models = await PromotionModel.findAll({
      where: { storeId, active: true }
    });
    
    return models.map(model => 
      new Promotion(
        model.id,
        model.name,
        model.description,
        Number(model.originalPrice),
        Number(model.promotionalPrice),
        model.startDate,
        model.endDate,
        model.productId,
        model.storeId,
        model.active,
        model.createdAt,
        model.updatedAt
      )
    );
  }

  async findActive(): Promise<Promotion[]> {
    const now = new Date();
    
    const models = await PromotionModel.findAll({
      where: {
        active: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      }
    });
    
    return models.map(model => 
      new Promotion(
        model.id,
        model.name,
        model.description,
        Number(model.originalPrice),
        Number(model.promotionalPrice),
        model.startDate,
        model.endDate,
        model.productId,
        model.storeId,
        model.active,
        model.createdAt,
        model.updatedAt
      )
    );
  }
}