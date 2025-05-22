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

    // ATUALIZADO: Configurar serviço de notificação com deviceTokenRepository
    let notificationService = null;
    let sendPromotionNotificationUseCase = null;
    
    // Verificar se as credenciais do Firebase estão configuradas
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        // CORRIGIDO: Passar o deviceTokenRepository para o FirebaseService
        notificationService = new FirebaseService(deviceTokenRepository);
        sendPromotionNotificationUseCase = new SendPromotionNotificationUseCase(
          deviceTokenRepository,
          notificationService,
          favoriteRepository,
          promotionRepository
        );
        console.log('✅ Firebase notification service initialized successfully');
        console.log('🔧 Token validation and cleanup enabled');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Firebase service:', error instanceof Error ? error.message : 'Unknown error');
        console.warn('📵 Push notifications will be disabled');
      }
    } else {
      console.log('ℹ️ Firebase credentials not configured in environment variables');
      console.log('💡 To enable push notifications, configure:');
      console.log('   - FIREBASE_PROJECT_ID');
      console.log('   - FIREBASE_CLIENT_EMAIL'); 
      console.log('   - FIREBASE_PRIVATE_KEY');
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

    // Health check - ATUALIZADO com mais informações
    app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'UP',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        notifications: {
          enabled: !!sendPromotionNotificationUseCase,
          firebase: !!notificationService,
          tokenValidation: !!notificationService,
          autoCleanup: !!notificationService
        },
        database: {
          connected: !!database,
          models: {
            users: !!UserModel,
            customers: !!CustomerModel,
            favorites: !!FavoriteModel,
            deviceTokens: !!DeviceTokenModel
          }
        }
      });
    });

    // Configurar rotas de autenticação
    app.use('/api/auth', authRoutes(authController));
    app.use('/api/mobile/favorites', favoriteRoutes(favoriteController, authService, customerRepository));
    app.use('/api/mobile/devices', deviceRoutes(registerDeviceUseCase, authService, customerRepository));

    // NOVO: Endpoint para limpeza manual de tokens (útil para debug)
    app.post('/api/admin/cleanup-tokens', webAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      if (!notificationService) {
        res.status(503).json({ message: 'Firebase service not available' });
        return;
      }

      try {
        // Buscar todos os tokens
        const allTokens = await DeviceTokenModel.findAll();
        const tokenList = allTokens.map(t => t.token);
        
        console.log(`🧹 Admin cleanup: Validating ${tokenList.length} tokens...`);
        
        // O FirebaseService irá validar e limpar automaticamente
        await notificationService.sendNotificationToTokens(
          tokenList,
          'Test Cleanup',
          'This is a cleanup test',
          { type: 'cleanup_test' }
        );
        
        res.json({ 
          message: 'Token cleanup completed',
          tokensProcessed: tokenList.length 
        });
      } catch (error) {
        console.error('❌ Admin cleanup error:', error);
        res.status(500).json({ 
          message: 'Cleanup failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

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
      console.error('🚨 Server Error:', err.stack);
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
      return;
    });

    // Start server
    app.listen(port, () => {
      console.log('🚀 API Central server started successfully!');
      console.log(`📡 Server running at http://localhost:${port}`);
      console.log(`🏥 Health check available at http://localhost:${port}/api/health`);
      console.log('');
      
      // Status das funcionalidades
      if (sendPromotionNotificationUseCase) {
        console.log('🔔 Push notifications: ENABLED');
        console.log('🔧 Token validation: ENABLED');
        console.log('🧹 Auto cleanup: ENABLED');
      } else {
        console.log('📵 Push notifications: DISABLED');
        console.log('💡 Configure Firebase credentials to enable notifications');
      }
      
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('   - POST /api/auth/register (Web panel user registration)');
      console.log('   - POST /api/auth/login (Web panel user login)');
      console.log('   - POST /api/auth/mobile/register (Mobile customer registration)');
      console.log('   - POST /api/auth/mobile/login (Mobile customer login)');
      console.log('   - POST /api/mobile/devices (Device token registration)');
      console.log('   - POST /api/mobile/favorites (Add favorite)');
      console.log('   - GET  /api/mobile/favorites (Get favorites)');
      console.log('   - POST /api/promotions (Sync promotions)');
      console.log('   - GET  /api/promotions/active (Get active promotions)');
      console.log('   - POST /api/admin/cleanup-tokens (Manual token cleanup - Admin only)');
      console.log('');
    });

    // Handle graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`📤 Received ${signal}. Shutting down gracefully...`);
      
      // Aqui você pode adicionar lógica de cleanup se necessário
      // Por exemplo: fechar conexões de banco, parar jobs, etc.
      
      console.log('👋 Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

bootstrap();