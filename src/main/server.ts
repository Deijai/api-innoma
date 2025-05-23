// src/main/server.ts - VERSÃO ATUALIZADA PARA EXPO
import express, { Request, Response, NextFunction } from 'express';
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

// ATUALIZADO: Importações para Expo Push Notifications
import { ExpoPushService } from '../infrastructure/services/expo-push-service';
import { NotificationSchedulerService } from '../infrastructure/services/notification-scheduler.service';
import { SendPromotionNotificationUseCase } from '../application/use-cases/notifications/send-promotion-notification.use-case';
import { ValidateTokenUseCase } from '../application/use-cases/auth/validate-token.use-case';
import { GetPromotionDetailsUseCase } from '../application/use-cases/get-promotion-details.use-case';
import { LogoutUseCase } from '../application/use-cases/auth/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/auth/refresh-token.use-case';
import { RefreshTokenRepository } from '../infrastructure/repositories/refresh-token-repository';
import { RefreshTokenModel } from '../infrastructure/database/models/refresh-token.model';

async function bootstrap() {
  try {
    const app = express();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    console.log('🚀 Iniciando API Central com Expo Push Notifications...');

    // Connect to database
    const database = new SequelizeDatabase(databaseConfig);
    await database.connect();
    await database.sync(process.env.NODE_ENV === 'development' && process.env.FORCE_DB_SYNC === 'true');

    // Inicializar modelos do Sequelize
    UserModel.initialize(database.getSequelize());
    CustomerModel.initialize(database.getSequelize());
    FavoriteModel.initialize(database.getSequelize());
    DeviceTokenModel.initialize(database.getSequelize());
    RefreshTokenModel.initialize(database.getSequelize()); // <- NOVO
    DeviceTokenModel.associate?.();

    // Create repositories
    const promotionRepository = new PromotionRepository();
    const storeRepository = new StoreRepository();
    const companyRepository = new CompanyRepository();
    const userRepository = new UserRepository();
    const customerRepository = new CustomerRepository();
    const favoriteRepository = new FavoriteRepository();
    const deviceTokenRepository = new DeviceTokenRepository();
    const refreshTokenRepository = new RefreshTokenRepository(); // <- NOVO

    // Criar serviço de autenticação
    const authService = new AuthService(authConfig.jwtSecret, authConfig.jwtExpiresIn, authConfig.refreshTokenSecret, authConfig.refreshTokenExpiresIn);

    // NOVO: Configurar Expo Push Service
    let expoPushService: ExpoPushService | null = null;
    let notificationScheduler: NotificationSchedulerService | null = null;
    let sendPromotionNotificationUseCase: SendPromotionNotificationUseCase | null = null;

    // Verificar se o Expo Access Token está configurado
    if (process.env.EXPO_ACCESS_TOKEN) {
      try {
        console.log('🔧 Configurando Expo Push Service...');
        expoPushService = new ExpoPushService(deviceTokenRepository);

        // Verificar se o serviço está funcionando
        const isHealthy = await expoPushService.healthCheck();

        if (isHealthy) {
          // Criar serviço de notificações para promoções
          sendPromotionNotificationUseCase = new SendPromotionNotificationUseCase(
            deviceTokenRepository,
            expoPushService,
            favoriteRepository,
            promotionRepository
          );

          // Criar e iniciar scheduler
          notificationScheduler = new NotificationSchedulerService(
            deviceTokenRepository,
            expoPushService
          );

          // Iniciar scheduler apenas em produção ou se explicitamente configurado
          if (process.env.NODE_ENV === 'production' || process.env.START_SCHEDULER === 'true') {
            notificationScheduler.startScheduler();
          }

          console.log('✅ Expo Push Service inicializado com sucesso');
          console.log('🔔 Push notifications: HABILITADAS');
          console.log('🔧 Validação de tokens: HABILITADA');
          console.log('🧹 Limpeza automática: HABILITADA');

          if (process.env.PUSH_NOTIFICATIONS_DEBUG === 'true') {
            console.log('🐛 Debug mode: HABILITADO');
          }
        } else {
          console.warn('⚠️ Expo Push Service health check falhou');
          expoPushService = null;
        }
      } catch (error) {
        console.error('❌ Falha ao inicializar Expo Push Service:', error instanceof Error ? error.message : 'Erro desconhecido');
        console.warn('📵 Push notifications serão desabilitadas');
        expoPushService = null;
        sendPromotionNotificationUseCase = null; // ADICIONADO: garantir que seja null
        notificationScheduler = null; // ADICIONADO: garantir que seja null
      }
    } else {
      console.log('ℹ️ EXPO_ACCESS_TOKEN não configurado');
      console.log('💡 Para habilitar push notifications:');
      console.log('   1. Acesse https://expo.dev/');
      console.log('   2. Vá em Account Settings > Access Tokens');
      console.log('   3. Gere um novo token e configure EXPO_ACCESS_TOKEN no .env');
      console.log('📵 Push notifications: DESABILITADAS');
    }

    // Create use cases
    const syncPromotionsUseCase = new SyncPromotionsUseCase(
      promotionRepository,
      storeRepository,
      companyRepository,
      sendPromotionNotificationUseCase // Pode ser null se Expo não estiver configurado
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

    // NOVO: Adicionar GetPromotionDetailsUseCase
    const getPromotionDetailsUseCase = new GetPromotionDetailsUseCase(
      promotionRepository,
      storeRepository,
      companyRepository
    );

    // Criar casos de uso para autenticação
    const registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      storeRepository,
      refreshTokenRepository, // <- ADICIONADO
      authService
    );

    const loginUserUseCase = new LoginUserUseCase(
      userRepository,
      refreshTokenRepository, // <- ADICIONADO
      authService
    );

    const registerCustomerUseCase = new RegisterCustomerUseCase(
      customerRepository,
      refreshTokenRepository, // <- ADICIONADO
      authService
    );

    const loginCustomerUseCase = new LoginCustomerUseCase(
      customerRepository,
      refreshTokenRepository, // <- ADICIONADO
      authService
    );
    // NOVO: RefreshTokenUseCase
    const refreshTokenUseCase = new RefreshTokenUseCase(
      refreshTokenRepository,
      userRepository,
      customerRepository,
      authService
    );

    // NOVO: Adicionar ValidateTokenUseCase
    const validateTokenUseCase = new ValidateTokenUseCase(
      userRepository,
      customerRepository,
      authService
    );

    // NOVO: Adicionar LogoutUseCase
    const logoutUseCase = new LogoutUseCase(authService);

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

    // ATUALIZAR: PromotionController com o novo use case
    const promotionController = new PromotionController(
      syncPromotionsUseCase,
      getStorePromotionsUseCase,
      getActivePromotionsUseCase,
      getPromotionDetailsUseCase  // <- ADICIONADO
    );

    // ATUALIZAR: AuthController com RefreshTokenUseCase
    const authController = new AuthController(
      registerUserUseCase,
      loginUserUseCase,
      registerCustomerUseCase,
      loginCustomerUseCase,
      validateTokenUseCase,
      logoutUseCase,
      refreshTokenUseCase // <- ADICIONADO
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
    app.use(express.json({ limit: '10mb' }));

    // Set up routes
    app.use('/api', promotionRoutes(promotionController));
    app.use('/api/auth', authRoutes(authController));
    app.use('/api/mobile/favorites', favoriteRoutes(favoriteController, authService, customerRepository));
    app.use('/api/mobile/devices', deviceRoutes(registerDeviceUseCase, authService, customerRepository));

    // NOVO: Health check expandido
    app.get('/api/health', async (req, res) => {
      try {
        // Obter estatísticas se disponível
        let deviceStats = null;
        if (deviceTokenRepository.getGeneralStats) {
          deviceStats = await deviceTokenRepository.getGeneralStats();
        }

        // Obter status do scheduler
        let schedulerStatus = null;
        if (notificationScheduler) {
          schedulerStatus = notificationScheduler.getSchedulerStatus();
        }

        // Obter stats do Expo service
        let expoStats = null;
        if (expoPushService && expoPushService.getServiceStats) {
          expoStats = await expoPushService.getServiceStats();
        }

        res.status(200).json({
          status: 'UP',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: {
              connected: true,
              models: ['users', 'customers', 'favorites', 'deviceTokens', 'promotions', 'stores', 'companies']
            },
            notifications: {
              service: 'expo-push-notifications',
              enabled: !!expoPushService,
              healthCheck: expoPushService ? await expoPushService.healthCheck() : false,
              stats: expoStats
            },
            scheduler: {
              enabled: !!notificationScheduler,
              status: schedulerStatus
            }
          },
          statistics: deviceStats,
          configuration: {
            maxDevicesPerCustomer: parseInt(process.env.MAX_DEVICES_PER_CUSTOMER || '10'),
            tokenCleanupDays: parseInt(process.env.TOKEN_CLEANUP_DAYS || '90'),
            debugMode: process.env.PUSH_NOTIFICATIONS_DEBUG === 'true'
          }
        });
      } catch (error) {
        console.error('❌ Erro no health check:', error);
        res.status(500).json({
          status: 'DOWN',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // NOVO: Endpoints administrativos para notificações
    app.post('/api/admin/notifications/test', webAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      if (!expoPushService) {
        res.status(503).json({
          success: false,
          message: 'Expo Push Service not available',
          code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      try {
        const result = notificationScheduler
          ? await notificationScheduler.sendTestNotification()
          : { success: false, tokensUsed: 0 };

        res.json({
          success: result.success,
          message: result.success
            ? `Test notification sent to ${result.tokensUsed} devices`
            : 'Failed to send test notification',
          data: result
        });
      } catch (error) {
        console.error('❌ Erro ao enviar notificação de teste:', error);
        res.status(500).json({
          success: false,
          message: 'Error sending test notification',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.post('/api/admin/notifications/cleanup', webAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      if (!notificationScheduler) {
        res.status(503).json({
          success: false,
          message: 'Notification Scheduler not available',
          code: 'SERVICE_UNAVAILABLE'
        });
        return;
      }

      try {
        const result = await notificationScheduler.runImmediateCleanup();

        res.json({
          success: true,
          message: 'Cleanup completed successfully',
          data: result
        });
      } catch (error) {
        console.error('❌ Erro na limpeza administrativa:', error);
        res.status(500).json({
          success: false,
          message: 'Error during cleanup',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/api/admin/notifications/stats', webAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      try {
        let stats = null;
        if (deviceTokenRepository.getGeneralStats) {
          stats = await deviceTokenRepository.getGeneralStats();
        }

        let schedulerStatus = null;
        if (notificationScheduler) {
          schedulerStatus = notificationScheduler.getSchedulerStatus();
        }

        res.json({
          success: true,
          message: 'Statistics retrieved successfully',
          data: {
            deviceTokens: stats,
            scheduler: schedulerStatus,
            service: {
              type: 'expo-push-notifications',
              healthy: expoPushService ? await expoPushService.healthCheck() : false,
              configured: !!expoPushService
            }
          }
        });
      } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
          success: false,
          message: 'Error retrieving statistics',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Proteger rotas de administração
    app.use('/api/admin', webAuthMiddleware, (req: Request, res: Response, next: NextFunction): void => {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }
      next();
    });

    // Error handling
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
      console.log('');
      console.log('🎉 API Central inicializada com sucesso!');
      console.log(`📡 Servidor rodando em http://localhost:${port}`);
      console.log(`🏥 Health check disponível em http://localhost:${port}/api/health`);
      console.log('');

      // Status das funcionalidades
      console.log('📋 Status dos Serviços:');
      if (expoPushService) {
        console.log('  🔔 Push Notifications: ✅ HABILITADAS (Expo)');
        console.log('  🔧 Validação de Tokens: ✅ HABILITADA');
        console.log('  🧹 Limpeza Automática: ✅ HABILITADA');

        if (notificationScheduler?.getSchedulerStatus().isRunning) {
          console.log('  ⏰ Agendador: ✅ ATIVO');
        } else {
          console.log('  ⏰ Agendador: ⏸️ INATIVO (configure START_SCHEDULER=true)');
        }
      } else {
        console.log('  📵 Push Notifications: ❌ DESABILITADAS');
        console.log('  💡 Configure EXPO_ACCESS_TOKEN para habilitar');
      }

      console.log('');
      console.log('🌐 Endpoints Principais:');
      console.log('  📱 Mobile App:');
      console.log('    - POST /api/auth/mobile/register');
      console.log('    - POST /api/auth/mobile/login');
      console.log('    - POST /api/mobile/devices/register');
      console.log('    - GET  /api/mobile/devices');
      console.log('    - POST /api/mobile/favorites');
      console.log('    - GET  /api/promotions/active');
      console.log('');
      console.log('  🖥️ Web Panel:');
      console.log('    - POST /api/auth/register');
      console.log('    - POST /api/auth/login');
      console.log('    - POST /api/promotions');
      console.log('    - GET  /api/stores/:id/promotions');
      console.log('');
      console.log('  👨‍💼 Admin:');
      console.log('    - POST /api/admin/notifications/test');
      console.log('    - POST /api/admin/notifications/cleanup');
      console.log('    - GET  /api/admin/notifications/stats');
      console.log('');
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`📤 Recebido ${signal}. Encerrando graciosamente...`);

      try {
        // Parar scheduler se estiver rodando
        if (notificationScheduler) {
          console.log('⏰ Parando notification scheduler...');
          notificationScheduler.stopScheduler();
        }

        // Fechar conexão com o banco
        console.log('🗄️ Fechando conexão com banco de dados...');
        await database.getSequelize().close();

        console.log('👋 Servidor encerrado com sucesso');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante encerramento:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('💥 Falha ao iniciar servidor:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

bootstrap();