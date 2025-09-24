import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger';
import { Config } from '../config';
import { db } from '../services/db';
import { MetricsService } from '../services/metrics';
import { SerializerService } from '../services/serializer';
import { Validators } from '../utils/validators';

export class TelegramBot {
  private bot: TelegramBot;
  private config: Config;
  private metricsService: MetricsService;
  private serializer: SerializerService;
  private isRunning: boolean = false;

  constructor(config: Config) {
    this.config = config;
    this.bot = new TelegramBot(config.telegramBotToken!, { polling: true });
    this.metricsService = new MetricsService();
    this.serializer = new SerializerService();
    
    this.setupCommands();
  }

  private setupCommands(): void {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!userId) return;
      
      // Check if user is authorized
      if (!this.isAuthorized(userId)) {
        await this.bot.sendMessage(chatId, '❌ Unauthorized access. Contact administrator.');
        return;
      }
      
      const welcomeMessage = `
🤖 *PRPos Bot - The Perp Positioning System*

Welcome to PRPos Bot! Here are the available commands:

/status - Get bot status
/positions - View open positions
/trades - View recent trades
/metrics - View performance metrics
/close <position_id> - Close a position
/download-logs - Download bot logs
/help - Show this help message

Bot is ready for trading! 🚀
      `;
      
      await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      try {
        const account = await db.getAccount();
        const positions = await db.getOpenPositions();
        const trades = await db.getTrades({ limit: 5 });
        
        const statusMessage = `
📊 *Bot Status*

💰 Account Balance: $${account?.balance?.toFixed(2) || '0.00'}
📈 Open Positions: ${positions.length}
📋 Recent Trades: ${trades.length}
🔄 Bot Status: ${this.isRunning ? 'Running' : 'Stopped'}

Last updated: ${new Date().toLocaleString()}
        `;
        
        await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error getting status:', error);
        await this.bot.sendMessage(chatId, '❌ Error getting status');
      }
    });

    // Positions command
    this.bot.onText(/\/positions/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      try {
        const positions = await db.getOpenPositions();
        
        if (positions.length === 0) {
          await this.bot.sendMessage(chatId, '📊 No open positions');
          return;
        }
        
        let message = '📊 *Open Positions*\n\n';
        
        for (const position of positions.slice(0, 10)) { // Limit to 10 positions
          const pnl = position.unrealizedPnl || 0;
          const pnlEmoji = pnl >= 0 ? '📈' : '📉';
          
          message += `${pnlEmoji} *${position.side.toUpperCase()}* ${position.size}\n`;
          message += `Entry: $${position.entryPrice}\n`;
          message += `Mark: $${position.markPrice}\n`;
          message += `PnL: $${pnl.toFixed(2)}\n`;
          message += `Leverage: ${position.leverage}x\n\n`;
        }
        
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error getting positions:', error);
        await this.bot.sendMessage(chatId, '❌ Error getting positions');
      }
    });

    // Trades command
    this.bot.onText(/\/trades/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      try {
        const trades = await db.getTrades({ limit: 10 });
        
        if (trades.length === 0) {
          await this.bot.sendMessage(chatId, '📋 No recent trades');
          return;
        }
        
        let message = '📋 *Recent Trades*\n\n';
        
        for (const trade of trades) {
          const sideEmoji = trade.side === 'long' ? '🟢' : '🔴';
          const statusEmoji = trade.status === 'filled' ? '✅' : '⏳';
          
          message += `${sideEmoji} ${statusEmoji} *${trade.side.toUpperCase()}* ${trade.size} @ $${trade.price}\n`;
          message += `Strategy: ${trade.strategy}\n`;
          message += `Time: ${new Date(trade.timestamp).toLocaleString()}\n\n`;
        }
        
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error getting trades:', error);
        await this.bot.sendMessage(chatId, '❌ Error getting trades');
      }
    });

    // Metrics command
    this.bot.onText(/\/metrics/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      try {
        const metrics = await this.metricsService.getPerformanceMetrics();
        
        const metricsMessage = `
📊 *Performance Metrics*

💰 Total Return: ${(metrics.totalReturn * 100).toFixed(2)}%
🎯 Win Rate: ${(metrics.winRate * 100).toFixed(2)}%
📈 Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
📉 Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%
📋 Total Trades: ${metrics.totalTrades}
✅ Winning Trades: ${metrics.winningTrades}
❌ Losing Trades: ${metrics.losingTrades}
📊 Average Win: $${metrics.averageWin.toFixed(2)}
📊 Average Loss: $${metrics.averageLoss.toFixed(2)}
        `;
        
        await this.bot.sendMessage(chatId, metricsMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error getting metrics:', error);
        await this.bot.sendMessage(chatId, '❌ Error getting metrics');
      }
    });

    // Close position command
    this.bot.onText(/\/close (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const positionId = match?.[1];
      
      if (!this.isAuthorized(userId)) return;
      
      if (!positionId) {
        await this.bot.sendMessage(chatId, '❌ Please provide a position ID');
        return;
      }
      
      try {
        const positions = await db.getPositions({ id: positionId });
        const position = positions[0];
        
        if (!position) {
          await this.bot.sendMessage(chatId, '❌ Position not found');
          return;
        }
        
        if (position.status !== 'open') {
          await this.bot.sendMessage(chatId, '❌ Position is not open');
          return;
        }
        
        // Close position
        await db.updatePosition(positionId, {
          status: 'closed',
          closeTimestamp: new Date(),
          closeReason: 'telegram_close',
        });
        
        await this.bot.sendMessage(chatId, `✅ Position ${positionId} closed successfully`);
      } catch (error) {
        logger.error('Error closing position:', error);
        await this.bot.sendMessage(chatId, '❌ Error closing position');
      }
    });

    // Download logs command
    this.bot.onText(/\/download-logs/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      try {
        // Create logs file
        const logsPath = path.join(process.cwd(), 'logs', 'combined.log');
        
        if (!fs.existsSync(logsPath)) {
          await this.bot.sendMessage(chatId, '❌ No logs found');
          return;
        }
        
        // Send logs file
        await this.bot.sendDocument(chatId, logsPath, {
          caption: '📄 Bot logs',
        });
      } catch (error) {
        logger.error('Error downloading logs:', error);
        await this.bot.sendMessage(chatId, '❌ Error downloading logs');
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (!this.isAuthorized(userId)) return;
      
      const helpMessage = `
🤖 *PRPos Bot Commands*

/start - Start the bot
/status - Get bot status
/positions - View open positions
/trades - View recent trades
/metrics - View performance metrics
/close <position_id> - Close a position
/download-logs - Download bot logs
/help - Show this help message

For support, contact the administrator.
      `;
      
      await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Error handling
    this.bot.on('error', (error) => {
      logger.error('Telegram bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      logger.error('Telegram polling error:', error);
    });
  }

  private isAuthorized(userId: number): boolean {
    return this.config.adminTelegramIds.includes(userId);
  }

  public async start(): Promise<void> {
    try {
      this.isRunning = true;
      logger.info('Telegram bot started');
    } catch (error) {
      logger.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.isRunning = false;
      await this.bot.stopPolling();
      logger.info('Telegram bot stopped');
    } catch (error) {
      logger.error('Error stopping Telegram bot:', error);
    }
  }

  public async sendMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
    }
  }

  public async sendAlert(message: string): Promise<void> {
    try {
      for (const adminId of this.config.adminTelegramIds) {
        await this.sendMessage(adminId, `🚨 Alert: ${message}`);
      }
    } catch (error) {
      logger.error('Error sending alert:', error);
    }
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      adminIds: this.config.adminTelegramIds,
    };
  }
}
