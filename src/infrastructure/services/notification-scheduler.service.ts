// src/infrastructure/services/notification-scheduler.service.ts
import * as cron from 'node-cron';
import { IDeviceTokenRepository } from '../../domain/interfaces/repositories/device-token-repository.interface';
import { ExpoPushService } from './expo-push-service';

export class NotificationSchedulerService {
  private isSchedulerRunning = false;
  private scheduledTasks: cron.ScheduledTask[] = [];

  constructor(
    private readonly deviceTokenRepository: IDeviceTokenRepository,
    private readonly expoPushService: ExpoPushService
  ) {}

  // Iniciar scheduler de limpeza automática
  startScheduler(): void {
    if (this.isSchedulerRunning) {
      console.log('⚠️ Notification Scheduler já está rodando');
      return;
    }

    console.log('🚀 Iniciando Notification Scheduler...');

    // Limpeza diária às 2h da manhã
    const cleanupTask = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 [SCHEDULER] Iniciando limpeza automática de tokens...');
      await this.cleanupExpiredTokens();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // Health check do Expo Push Service a cada 6 horas
    const healthCheckTask = cron.schedule('0 */6 * * *', async () => {
      console.log('🏥 [SCHEDULER] Executando health check do Expo Push Service...');
      await this.healthCheck();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // Relatório de estatísticas diário às 8h
    const statsTask = cron.schedule('0 8 * * *', async () => {
      console.log('📊 [SCHEDULER] Gerando relatório de estatísticas...');
      await this.generateDailyStats();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // As tarefas já iniciam automaticamente por padrão

    // Salvar referências das tarefas
    this.scheduledTasks = [cleanupTask, healthCheckTask, statsTask];
    this.isSchedulerRunning = true;

    console.log('✅ Notification Scheduler iniciado com sucesso');
    console.log('⏰ Tarefas agendadas:');
    console.log('   - Limpeza de tokens: 02:00 (diário)');
    console.log('   - Health check: a cada 6 horas');
    console.log('   - Relatório de stats: 08:00 (diário)');
  }

  // Parar scheduler
  stopScheduler(): void {
    if (!this.isSchedulerRunning) {
      console.log('⚠️ Scheduler não está rodando');
      return;
    }
    
    // Parar todas as tarefas agendadas
    this.scheduledTasks.forEach(task => {
      task.stop();
      task.destroy();
    });
    
    this.scheduledTasks = [];
    this.isSchedulerRunning = false;
    console.log('🛑 Notification Scheduler parado');
  }

  // Limpeza manual de tokens expirados
  async cleanupExpiredTokens(): Promise<{ removed: number }> {
    try {
      console.log('🧹 Iniciando limpeza de tokens expirados...');
      
      const cleanupDays = parseInt(process.env.TOKEN_CLEANUP_DAYS || '90');
      const removedCount = await this.deviceTokenRepository.cleanupOldTokens(cleanupDays);
      
      console.log(`✅ Limpeza concluída: ${removedCount} tokens antigos removidos`);
      
      return { removed: removedCount };
    } catch (error) {
      console.error('❌ Erro na limpeza automática:', error);
      return { removed: 0 };
    }
  }

  // Health check do serviço
  async healthCheck(): Promise<boolean> {
    try {
      const isHealthy = await this.expoPushService.healthCheck();
      
      if (isHealthy) {
        console.log('✅ [HEALTH] Expo Push Service está funcionando corretamente');
      } else {
        console.error('❌ [HEALTH] Expo Push Service com problemas');
        // Aqui você poderia enviar alertas para administradores
        // await this.sendAdminAlert('Expo Push Service com problemas');
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ [HEALTH] Erro no health check:', error);
      return false;
    }
  }

  // Gerar estatísticas diárias
  async generateDailyStats(): Promise<void> {
    try {
      console.log('📊 [STATS] Gerando relatório de estatísticas diárias...');
      
      if (this.deviceTokenRepository.getGeneralStats) {
        const stats = await this.deviceTokenRepository.getGeneralStats();
        
        console.log('📊 [STATS] Relatório do dia:');
        console.log(`   📱 Total de tokens: ${stats.totalTokens}`);
        console.log(`   ✅ Tokens ativos: ${stats.activeTokens}`);
        console.log(`   🍎 Dispositivos iOS: ${stats.iosTokens}`);
        console.log(`   🤖 Dispositivos Android: ${stats.androidTokens}`);
        
        // Calcular porcentagens
        const activePercentage = stats.totalTokens > 0 
          ? ((stats.activeTokens / stats.totalTokens) * 100).toFixed(1) 
          : '0';
        
        console.log(`   📈 Taxa de tokens ativos: ${activePercentage}%`);
        
        // Você poderia salvar essas estatísticas em um banco de dados
        // ou enviar para um sistema de monitoramento
      }
    } catch (error) {
      console.error('❌ [STATS] Erro ao gerar estatísticas:', error);
    }
  }

  // Enviar notificação de teste
  async sendTestNotification(): Promise<{ success: boolean, tokensUsed: number }> {
    try {
      console.log('🧪 Enviando notificação de teste...');
      
      // Buscar um pequeno conjunto de tokens válidos para teste
      const activeTokens = await this.deviceTokenRepository.findAllActiveTokens();
      
      if (activeTokens.length === 0) {
        console.log('📭 Nenhum token ativo para teste');
        return { success: false, tokensUsed: 0 };
      }

      // Usar apenas os primeiros 5 tokens para teste
      const testTokens = activeTokens.slice(0, 5).map(deviceToken => deviceToken.token);
      
      await this.expoPushService.sendNotificationToTokens(
        testTokens,
        '🧪 Teste do Sistema',
        'Esta é uma notificação de teste do sistema de push notifications com Expo',
        { 
          type: 'test', 
          timestamp: new Date().toISOString(),
          service: 'expo-push-notifications'
        }
      );
      
      console.log(`✅ Notificação de teste enviada para ${testTokens.length} dispositivos`);
      return { success: true, tokensUsed: testTokens.length };
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      return { success: false, tokensUsed: 0 };
    }
  }

  // Verificar status do scheduler
  getSchedulerStatus(): {
    isRunning: boolean;
    tasksCount: number;
    startedAt?: Date;
  } {
    return {
      isRunning: this.isSchedulerRunning,
      tasksCount: this.scheduledTasks.length,
      startedAt: this.isSchedulerRunning ? new Date() : undefined
    };
  }

  // Executar limpeza manual imediata
  async runImmediateCleanup(): Promise<{ 
    removed: number; 
    healthCheck: boolean; 
    stats: any 
  }> {
    try {
      console.log('🚀 Executando limpeza imediata...');
      
      // Executar limpeza
      const cleanupResult = await this.cleanupExpiredTokens();
      
      // Executar health check
      const healthResult = await this.healthCheck();
      
      // Obter estatísticas atualizadas
      let statsResult = null;
      if (this.deviceTokenRepository.getGeneralStats) {
        statsResult = await this.deviceTokenRepository.getGeneralStats();
      }
      
      console.log('✅ Limpeza imediata concluída');
      
      return {
        removed: cleanupResult.removed,
        healthCheck: healthResult,
        stats: statsResult
      };
    } catch (error) {
      console.error('❌ Erro na limpeza imediata:', error);
      throw error;
    }
  }
}