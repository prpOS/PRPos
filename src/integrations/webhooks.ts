import crypto from 'crypto';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../services/db';
import { NotifierService } from '../services/notifier';
import { Validators } from '../utils/validators';

export interface WebhookPayload {
  type: string;
  data: any;
  timestamp: number;
  signature: string;
}

export class WebhookHandler {
  private notifier: NotifierService;
  private secretKey: string;

  constructor(secretKey: string) {
    this.notifier = new NotifierService();
    this.secretKey = secretKey;
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const signature = req.headers['x-signature'] as string;
      
      // Verify signature
      if (!this.verifySignature(payload, signature)) {
        logger.warn('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      
      // Process webhook based on type
      await this.processWebhook(payload);
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }

  private async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      switch (payload.type) {
        case 'trade_executed':
          await this.handleTradeExecuted(payload.data);
          break;
        case 'position_opened':
          await this.handlePositionOpened(payload.data);
          break;
        case 'position_closed':
          await this.handlePositionClosed(payload.data);
          break;
        case 'risk_alert':
          await this.handleRiskAlert(payload.data);
          break;
        case 'strategy_signal':
          await this.handleStrategySignal(payload.data);
          break;
        case 'bot_status':
          await this.handleBotStatus(payload.data);
          break;
        default:
          logger.warn(`Unknown webhook type: ${payload.type}`);
      }
    } catch (error) {
      logger.error('Error processing webhook:', error);
    }
  }

  private async handleTradeExecuted(data: any): Promise<void> {
    try {
      // Validate trade data
      const validation = Validators.validateTradeRequest(data);
      if (!validation.isValid) {
        logger.warn('Invalid trade data in webhook:', validation.errors);
        return;
      }
      
      // Store trade
      await db.storeTrade({
        side: data.side,
        size: data.size,
        price: data.price,
        fees: data.fees || 0,
        timestamp: new Date(data.timestamp || Date.now()),
        status: 'filled',
        strategy: data.strategy || 'webhook',
      });
      
      // Send notification
      await this.notifier.notifyTradeExecuted(data);
      
      logger.info(`Trade executed via webhook: ${data.side} ${data.size} @ ${data.price}`);
    } catch (error) {
      logger.error('Error handling trade executed webhook:', error);
    }
  }

  private async handlePositionOpened(data: any): Promise<void> {
    try {
      // Validate position data
      const validation = Validators.validatePosition(data);
      if (!validation.isValid) {
        logger.warn('Invalid position data in webhook:', validation.errors);
        return;
      }
      
      // Store position
      await db.storePosition({
        side: data.side,
        size: data.size,
        entryPrice: data.entryPrice,
        markPrice: data.markPrice || data.entryPrice,
        leverage: data.leverage || 1,
        margin: data.margin || 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        status: 'open',
        timestamp: new Date(data.timestamp || Date.now()),
        strategy: data.strategy || 'webhook',
      });
      
      // Send notification
      await this.notifier.notifyPositionOpened(data);
      
      logger.info(`Position opened via webhook: ${data.side} ${data.size} @ ${data.entryPrice}`);
    } catch (error) {
      logger.error('Error handling position opened webhook:', error);
    }
  }

  private async handlePositionClosed(data: any): Promise<void> {
    try {
      const { positionId, closePrice, reason } = data;
      
      if (!positionId) {
        logger.warn('Position ID missing in webhook');
        return;
      }
      
      // Update position
      await db.updatePosition(positionId, {
        status: 'closed',
        closePrice,
        closeTimestamp: new Date(),
        closeReason: reason || 'webhook_close',
      });
      
      // Send notification
      await this.notifier.notifyPositionClosed(data, reason);
      
      logger.info(`Position closed via webhook: ${positionId}`);
    } catch (error) {
      logger.error('Error handling position closed webhook:', error);
    }
  }

  private async handleRiskAlert(data: any): Promise<void> {
    try {
      const { alert, severity, data: alertData } = data;
      
      // Store risk event
      await db.storeRiskEvent({
        type: 'risk_alert',
        message: alert,
        severity: severity || 'medium',
        data: JSON.stringify(alertData),
        timestamp: new Date(),
      });
      
      // Send notification
      await this.notifier.notifyRiskAlert(alert, alertData);
      
      logger.warn(`Risk alert via webhook: ${alert}`);
    } catch (error) {
      logger.error('Error handling risk alert webhook:', error);
    }
  }

  private async handleStrategySignal(data: any): Promise<void> {
    try {
      const { strategy, side, size, confidence } = data;
      
      // Send notification
      await this.notifier.notifyStrategySignal({
        strategy,
        side,
        size,
        confidence,
        timestamp: Date.now(),
      });
      
      logger.info(`Strategy signal via webhook: ${strategy} ${side} ${size}`);
    } catch (error) {
      logger.error('Error handling strategy signal webhook:', error);
    }
  }

  private async handleBotStatus(data: any): Promise<void> {
    try {
      const { status, message, data: statusData } = data;
      
      // Send notification
      await this.notifier.notifyBotStatus(message, statusData);
      
      logger.info(`Bot status via webhook: ${status} - ${message}`);
    } catch (error) {
      logger.error('Error handling bot status webhook:', error);
    }
  }

  public async sendWebhook(url: string, payload: any, secretKey: string): Promise<boolean> {
    try {
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        logger.error(`Webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }
      
      logger.info(`Webhook sent successfully to ${url}`);
      return true;
    } catch (error) {
      logger.error('Error sending webhook:', error);
      return false;
    }
  }

  public getStatus(): any {
    return {
      secretKey: this.secretKey ? 'configured' : 'not configured',
      notifier: this.notifier.getStatus(),
    };
  }
}
