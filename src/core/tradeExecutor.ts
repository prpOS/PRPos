import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { RiskManager, Account, Position } from './riskManager';
import { Portfolio } from './portfolio';
import { Config } from '../config';
import { db } from '../services/db';
import { DEXClient } from '../dex/client';

export interface TradeRequest {
  side: 'long' | 'short';
  size: number;
  price: number;
  type: 'market' | 'limit';
  strategy: string;
}

export interface TradeResult {
  id: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  fees: number;
  timestamp: number;
  status: 'filled' | 'partial' | 'failed';
  orderId?: string;
}

export class TradeExecutor extends EventEmitter {
  private riskManager: RiskManager;
  private portfolio: Portfolio;
  private config: Config;
  private dexClient: DEXClient;

  constructor(riskManager: RiskManager, portfolio: Portfolio, config: Config) {
    super();
    this.riskManager = riskManager;
    this.portfolio = portfolio;
    this.config = config;
    this.dexClient = new DEXClient(config);
  }

  public async executeTrade(tradeRequest: TradeRequest): Promise<TradeResult | null> {
    try {
      logger.info(`Executing trade: ${tradeRequest.side} ${tradeRequest.size} @ ${tradeRequest.price}`);

      // Get current account state
      const account = this.portfolio.getAccount();

      // Risk check
      const riskAssessment = this.riskManager.canOpenPosition(
        account,
        tradeRequest.size,
        tradeRequest.price
      );

      if (!riskAssessment.allowed) {
        logger.warn(`Trade rejected by risk manager: ${riskAssessment.reason}`);
        return null;
      }

      // Execute trade on DEX
      const orderResult = await this.dexClient.placeOrder({
        side: tradeRequest.side,
        size: tradeRequest.size,
        price: tradeRequest.price,
        type: tradeRequest.type,
      });

      if (!orderResult || orderResult.status === 'failed') {
        logger.error('Trade execution failed on DEX');
        return null;
      }

      // Create trade record
      const trade: TradeResult = {
        id: this.generateTradeId(),
        side: tradeRequest.side,
        size: orderResult.filledSize,
        price: orderResult.avgPrice,
        fees: orderResult.fees,
        timestamp: Date.now(),
        status: orderResult.status,
        orderId: orderResult.orderId,
      };

      // Persist trade to database
      await db.storeTrade({
        id: trade.id,
        side: trade.side,
        size: trade.size,
        price: trade.price,
        fees: trade.fees,
        timestamp: new Date(trade.timestamp),
        status: trade.status,
        orderId: trade.orderId,
        strategy: tradeRequest.strategy,
      });

      // Update portfolio
      await this.updatePortfolioAfterTrade(trade);

      // Emit events
      this.emit('tradeExecuted', trade);

      logger.info(`Trade executed successfully: ${trade.id}`);
      return trade;
    } catch (error) {
      logger.error('Error executing trade:', error);
      this.emit('error', error);
      return null;
    }
  }

  public async closePosition(positionId: string, reason: string): Promise<boolean> {
    try {
      logger.info(`Closing position: ${positionId}, reason: ${reason}`);

      const position = this.portfolio.getPosition(positionId);
      if (!position) {
        logger.warn(`Position not found: ${positionId}`);
        return false;
      }

      // Create opposite trade to close position
      const closeTrade: TradeRequest = {
        side: position.side === 'long' ? 'short' : 'long',
        size: position.size,
        price: position.markPrice,
        type: 'market',
        strategy: 'position_close',
      };

      const tradeResult = await this.executeTrade(closeTrade);
      if (!tradeResult) {
        logger.error(`Failed to close position: ${positionId}`);
        return false;
      }

      // Update position status
      await db.updatePosition(positionId, {
        status: 'closed',
        closePrice: tradeResult.price,
        closeTimestamp: new Date(tradeResult.timestamp),
        closeReason: reason,
      });

      // Update portfolio
      this.portfolio.closePosition(positionId);

      this.emit('positionClosed', { positionId, reason, trade: tradeResult });
      logger.info(`Position closed successfully: ${positionId}`);
      return true;
    } catch (error) {
      logger.error('Error closing position:', error);
      return false;
    }
  }

  private async updatePortfolioAfterTrade(trade: TradeResult): Promise<void> {
    try {
      // Update account balance (subtract fees)
      const account = this.portfolio.getAccount();
      account.balance -= trade.fees;

      // If this is a new position, create it
      if (trade.status === 'filled') {
        const position: Position = {
          id: this.generatePositionId(),
          side: trade.side,
          size: trade.size,
          entryPrice: trade.price,
          markPrice: trade.price,
          leverage: this.calculateLeverage(trade.size, trade.price, account.balance),
          margin: this.calculateMargin(trade.size, trade.price),
          unrealizedPnl: 0,
          timestamp: trade.timestamp,
        };

        // Add to portfolio
        this.portfolio.addPosition(position);

        // Persist to database
        await db.storePosition({
          id: position.id,
          side: position.side,
          size: position.size,
          entryPrice: position.entryPrice,
          markPrice: position.markPrice,
          leverage: position.leverage,
          margin: position.margin,
          unrealizedPnl: position.unrealizedPnl,
          timestamp: new Date(position.timestamp),
          status: 'open',
        });

        this.emit('positionOpened', position);
      }
    } catch (error) {
      logger.error('Error updating portfolio after trade:', error);
    }
  }

  private calculateLeverage(size: number, price: number, balance: number): number {
    const notionalValue = size * price;
    return notionalValue / balance;
  }

  private calculateMargin(size: number, price: number): number {
    return (size * price) / this.config.maxLeverage;
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStatus(): any {
    return {
      dexClient: this.dexClient.getStatus(),
      portfolio: this.portfolio.getSummary(),
    };
  }
}
