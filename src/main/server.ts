// src/main/server.ts
import express, {Request, Response, NextFunction} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SequelizeDatabase } from '../infrastructure/database/sequelize-database';
import { databaseConfig } from './config/database-config';
import { PromotionRepository } from '../infrastructure/repositories/promotion-repository';
import { StoreRepository } from '../infrastructure/repositories/store-repository';
import { CompanyRepository } from '../infrastructure/repositories/company-repository';
import { SyncPromotionsUseCase } from '../application/use-cases/sync-promotions.use-case';
import { GetStorePromotionsUseCase } from '../application/use-cases/get-store-promotions.use-case';
import { GetActivePromotionsUseCase } from '../application/use-cases/get-active-promotions.use-case';
import { PromotionController } from '../infrastructure/http/controllers/promotion-controller';
import promotionRoutes from './routes/promotion-routes';
import { errorMiddleware } from './middlewares/error-middleware';

// Importações para autenticação
import { authConfig } from './config/auth-config';
import { AuthService } from '../infrastructure/services/auth-service';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { CustomerRepository } from '../infrastructure/repositories/customer-repository';
import { FavoriteRepository } from '../infrastructure/repositories/favorite-repository';
import { DeviceTokenRepository } from '../infrastructure/repositories/device-token-repository';
import { RegisterUserUseCase } from '../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../application/use-cases/auth/login-user.use-case';
import { RegisterCustomerUseCase } from '../application/use-cases/auth/register-customer.use-case';
import { LoginCustomerUseCase } from '../application/use-cases/auth/login-customer.use-case';
import { AddFavoriteUseCase } from '../application/use-cases/favorites/add-favorite.use-case';
import { RemoveFavoriteUseCase } from '../application/use-cases/favorites/remove-favorite.use-case';
import { RegisterDeviceUseCase } from '../application/use-cases/devices/register-device.use-case';
import { AuthController } from '../infrastructure/http/controllers/auth-controller';
import { FavoriteController } from '../infrastructure/http/controllers/favorite-controller';
import { jwtAuthMiddleware } from './middlewares/jwt-auth-middleware';
import authRoutes from './routes/auth-routes';
import favoriteRoutes from './routes/favorite-routes';
import deviceRoutes from './routes/device-routes';
import { UserModel } from '../infrastructure/database/models/user.model';
import { CustomerModel } from '../infrastructure/database/models/customer.model';
import { FavoriteModel } from '../infrastructure/database/models/favorite.model';
import { DeviceTokenModel } from '../infrastructure/database/models/device-token.model';

// NOVO: Importações para notificações
import { FirebaseService } from '../infrastructure/services/firebase-service';
import { SendPromotionNotificationUseCase } from '../application/use-cases/notifications/send-promotion-notification.use-case';

async function bootstrap() {
  try {
    const app = express();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    // Connect to database
    const database = new SequelizeDatabase(databaseConfig);
    await database.connect();
    await database.sync(process.env.NODE_ENV === 'development' && process.env.FORCE_DB_SYNC === 'true');

    // Inicializar modelos do Sequelize para autenticação
    UserModel.initialize(database.getSequelize());
    CustomerModel.initialize(database.getSequelize());
    FavoriteModel.initialize(database.getSequelize());
    DeviceTokenModel.initialize(database.getSequelize());
    DeviceTokenModel.associate?.();

    // Create repositories
    const promotionRepository = new PromotionRepository();
    const storeRepository = new StoreRepository();
    const companyRepository = new CompanyRepository();

    // Criar repositórios para autenticação
    const userRepository = new UserRepository();
    const customerRepository = new CustomerRepository();
    const favoriteRepository = new FavoriteRepository();
    const deviceTokenRepository = new DeviceTokenRepository();

    // Criar serviço de autenticação
    const authService = new AuthService(authConfig.jwtSecret, authConfig.jwtExpiresIn);

    // NOVO: Configurar serviço de notificação (opcional)
    let notificationService = null;
    let sendPromotionNotificationUseCase = null;
    
    // Verificar se as credenciais do Firebase estão configuradas
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        notificationService = new FirebaseService();
        sendPromotionNotificationUseCase = new SendPromotionNotificationUseCase(
          deviceTokenRepository,
          notificationService,
          favoriteRepository,
          promotionRepository
        );
        console.log('✅ Firebase notification service initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Firebase service:', error instanceof Error ? error.message : 'Unknown error');
        console.warn('📵 Push notifications will be disabled');
      }
    } else {
      console.log('ℹ️ Firebase credentials not configured in environment variables');
      console.log('📵 Push notifications are disabled');
    }

    // Create use cases - ATUALIZADO: incluir notificações opcionais
    const syncPromotionsUseCase = new SyncPromotionsUseCase(
      promotionRepository,
      storeRepository,
      companyRepository,
      sendPromotionNotificationUseCase! // Pode ser null se Firebase não estiver configurado
    );

    const getStorePromotionsUseCase = new GetStorePromotionsUseCase(
      promotionRepository,
      storeRepository
    );

    const getActivePromotionsUseCase = new GetActivePromotionsUseCase(
      promotionRepository,
      storeRepository,
      companyRepository
    );

    // Criar casos de uso para autenticação
    const registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      storeRepository,
      authService
    );

    const loginUserUseCase = new LoginUserUseCase(
      userRepository,
      authService
    );

    const registerCustomerUseCase = new RegisterCustomerUseCase(
      customerRepository,
      authService
    );

    const loginCustomerUseCase = new LoginCustomerUseCase(
      customerRepository,
      authService
    );

    const addFavoriteUseCase = new AddFavoriteUseCase(
      favoriteRepository,
      promotionRepository
    );

    const removeFavoriteUseCase = new RemoveFavoriteUseCase(
      favoriteRepository
    );

    const registerDeviceUseCase = new RegisterDeviceUseCase(
      deviceTokenRepository
    );

    // Create controllers
    const promotionController = new PromotionController(
      syncPromotionsUseCase,
      getStorePromotionsUseCase,
      getActivePromotionsUseCase
    );

    const authController = new AuthController(
      registerUserUseCase,
      loginUserUseCase,
      registerCustomerUseCase,
      loginCustomerUseCase
    );

    const favoriteController = new FavoriteController(
      addFavoriteUseCase,
      removeFavoriteUseCase,
      favoriteRepository
    );

    // Middleware de autenticação JWT para rotas protegidas
    const webAuthMiddleware = jwtAuthMiddleware(authService, userRepository);

    // Set up middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Set up routes
    app.use('/api', promotionRoutes(promotionController));

    // Health check
    app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'UP',
        timestamp: new Date().toISOString(),
        notifications: {
          enabled: !!sendPromotionNotificationUseCase,
          firebase: !!notificationService
        }
      });
    });

    // Configurar rotas de autenticação
    app.use('/api/auth', authRoutes(authController));
    app.use('/api/mobile/favorites', favoriteRoutes(favoriteController, authService, customerRepository));
    app.use('/api/mobile/devices', deviceRoutes(registerDeviceUseCase, authService, customerRepository));

    // Proteger rotas de administração com middleware JWT
    app.use('/api/admin', webAuthMiddleware, (req: Request, res: Response, next: NextFunction): void => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }
      next();
    });

    // Proteger rotas de loja com middleware JWT
    app.use('/api/stores/:storeId/manage', webAuthMiddleware, (req: Request, res: Response, next: NextFunction): void => {
      const { storeId } = req.params;

      // Allow admin to access any store
      if (req.user?.role === 'ADMIN') {
        return next();
      }

      if (req.user?.storeId !== storeId) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      next();
    });

    // Error handling - deve ser registrado após as rotas
    app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
      console.error(err.stack);
       res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
      return;
    });

    // Start server
    app.listen(port, () => {
      console.log(`🚀 API Central server running at http://localhost:${port}`);
      console.log(`🏥 Health check available at http://localhost:${port}/health`);
      
      if (sendPromotionNotificationUseCase) {
        console.log(`🔔 Push notifications are ENABLED`);
      } else {
        console.log(`📵 Push notifications are DISABLED`);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();