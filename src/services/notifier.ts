import axios from 'axios';
import { logger } from '../utils/logger';
import { Config } from '../config';

export interface NotificationData {
  type: 'trade' | 'position' | 'alert' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
}

export interface WebhookPayload {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  botId: string;
}

export class NotifierService {
  private config: Config;
  private webhookUrl?: string;
  private isEnabled: boolean = false;

  constructor(config: Config) {
    this.config = config;
    this.webhookUrl = config.notifierWebhookUrl;
    this.isEnabled = !!this.webhookUrl;
  }

  public async notify(notification: NotificationData): Promise<void> {
    try {
      if (!this.isEnabled) {
        logger.debug('Notifications disabled, skipping notification');
        return;
      }

      logger.info(`Sending notification: ${notification.title}`);

      // Send webhook notification
      if (this.webhookUrl) {
        await this.sendWebhook(notification);
      }

      // Log notification
      logger.info(`Notification sent: ${notification.title} - ${notification.message}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  private async sendWebhook(notification: NotificationData): Promise<void> {
    try {
      const payload: WebhookPayload = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.timestamp,
        botId: 'prpos-bot',
      };

      await axios.post(this.webhookUrl!, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PRPos-Bot/1.0',
        },
        timeout: 5000,
      });

      logger.debug('Webhook notification sent successfully');
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  public async notifyTradeExecuted(trade: any): Promise<void> {
    const notification: NotificationData = {
      type: 'trade',
      title: 'Trade Executed',
      message: `${trade.side.toUpperCase()} ${trade.size} @ ${trade.price}`,
      data: {
        tradeId: trade.id,
        side: trade.side,
        size: trade.size,
        price: trade.price,
        fees: trade.fees,
      },
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyPositionOpened(position: any): Promise<void> {
    const notification: NotificationData = {
      type: 'position',
      title: 'Position Opened',
      message: `${position.side.toUpperCase()} ${position.size} @ ${position.entryPrice}`,
      data: {
        positionId: position.id,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        leverage: position.leverage,
      },
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyPositionClosed(position: any, reason: string): Promise<void> {
    const notification: NotificationData = {
      type: 'position',
      title: 'Position Closed',
      message: `${position.side.toUpperCase()} position closed: ${reason}`,
      data: {
        positionId: position.id,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        closePrice: position.closePrice,
        pnl: position.realizedPnl,
        reason,
      },
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyAlert(alert: string, data?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'alert',
      title: 'Trading Alert',
      message: alert,
      data,
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyError(error: string, data?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'error',
      title: 'Trading Error',
      message: error,
      data,
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyRiskAlert(alert: string, data?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'alert',
      title: 'Risk Alert',
      message: alert,
      data,
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyStrategySignal(signal: any): Promise<void> {
    const notification: NotificationData = {
      type: 'alert',
      title: 'Strategy Signal',
      message: `${signal.strategy} signal: ${signal.side.toUpperCase()} ${signal.size}`,
      data: {
        strategy: signal.strategy,
        side: signal.side,
        size: signal.size,
        confidence: signal.confidence,
      },
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyBotStatus(status: string, data?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'alert',
      title: 'Bot Status',
      message: status,
      data,
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public async notifyPerformanceUpdate(metrics: any): Promise<void> {
    const notification: NotificationData = {
      type: 'alert',
      title: 'Performance Update',
      message: `Total PnL: ${metrics.totalPnl?.toFixed(4)}, Win Rate: ${(metrics.winRate * 100)?.toFixed(2)}%`,
      data: metrics,
      timestamp: Date.now(),
    };

    await this.notify(notification);
  }

  public enable(): void {
    this.isEnabled = true;
    logger.info('Notifications enabled');
  }

  public disable(): void {
    this.isEnabled = false;
    logger.info('Notifications disabled');
  }

  public getStatus(): any {
    return {
      isEnabled: this.isEnabled,
      webhookUrl: this.webhookUrl,
    };
  }
}
