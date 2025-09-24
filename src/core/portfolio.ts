import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { Position, Account } from './riskManager';
import { db } from '../services/db';

export interface PortfolioSummary {
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openPositions: number;
  totalTrades: number;
  winRate: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export class Portfolio extends EventEmitter {
  private account: Account;
  private positions: Map<string, Position> = new Map();
  private tradeHistory: any[] = [];
  private metrics: any = {};

  constructor() {
    super();
    this.account = {
      id: 'default',
      balance: 10000, // Starting balance
      margin: 0,
      leverage: 0,
      openPositions: 0,
    };
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      // Load account from database
      const accountData = await db.getAccount();
      if (accountData) {
        this.account = accountData;
      }

      // Load open positions
      const positions = await db.getOpenPositions();
      for (const position of positions) {
        this.positions.set(position.id, position);
      }

      // Load trade history
      this.tradeHistory = await db.getTradeHistory();

      // Calculate metrics
      await this.calculateMetrics();

      logger.info(`Portfolio loaded: ${this.positions.size} positions, ${this.tradeHistory.length} trades`);
    } catch (error) {
      logger.error('Error loading portfolio from database:', error);
    }
  }

  public addPosition(position: Position): void {
    this.positions.set(position.id, position);
    this.account.openPositions = this.positions.size;
    this.emit('positionAdded', position);
  }

  public closePosition(positionId: string): void {
    const position = this.positions.get(positionId);
    if (position) {
      this.positions.delete(positionId);
      this.account.openPositions = this.positions.size;
      this.emit('positionClosed', position);
    }
  }

  public getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  public getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  public getAccount(): Account {
    return { ...this.account };
  }

  public async updateMarkPrice(markPrice: number): Promise<void> {
    try {
      let totalUnrealizedPnl = 0;

      for (const position of this.positions.values()) {
        position.markPrice = markPrice;
        position.unrealizedPnl = this.calculateUnrealizedPnl(position);
        totalUnrealizedPnl += position.unrealizedPnl;
      }

      // Update account with unrealized PnL
      this.account.margin = totalUnrealizedPnl;
    } catch (error) {
      logger.error('Error updating mark price:', error);
    }
  }

  private calculateUnrealizedPnl(position: Position): number {
    const priceDiff = position.markPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return position.size * priceDiff * multiplier;
  }

  public getSummary(): PortfolioSummary {
    const openPositions = this.getOpenPositions();
    const totalUnrealizedPnl = openPositions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    
    return {
      totalValue: this.account.balance + totalUnrealizedPnl,
      realizedPnl: this.metrics.realizedPnl || 0,
      unrealizedPnl: totalUnrealizedPnl,
      openPositions: openPositions.length,
      totalTrades: this.tradeHistory.length,
      winRate: this.metrics.winRate || 0,
      averageReturn: this.metrics.averageReturn || 0,
      maxDrawdown: this.metrics.maxDrawdown || 0,
      sharpeRatio: this.metrics.sharpeRatio || 0,
    };
  }

  private async calculateMetrics(): Promise<void> {
    try {
      if (this.tradeHistory.length === 0) {
        this.metrics = {
          realizedPnl: 0,
          winRate: 0,
          averageReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
        };
        return;
      }

      // Calculate realized PnL
      const realizedPnl = this.tradeHistory.reduce((sum, trade) => {
        return sum + (trade.realizedPnl || 0);
      }, 0);

      // Calculate win rate
      const winningTrades = this.tradeHistory.filter(trade => (trade.realizedPnl || 0) > 0);
      const winRate = winningTrades.length / this.tradeHistory.length;

      // Calculate average return
      const totalReturn = this.tradeHistory.reduce((sum, trade) => {
        return sum + (trade.returnPercent || 0);
      }, 0);
      const averageReturn = totalReturn / this.tradeHistory.length;

      // Calculate max drawdown
      const maxDrawdown = this.calculateMaxDrawdown();

      // Calculate Sharpe ratio
      const sharpeRatio = this.calculateSharpeRatio();

      this.metrics = {
        realizedPnl,
        winRate,
        averageReturn,
        maxDrawdown,
        sharpeRatio,
      };
    } catch (error) {
      logger.error('Error calculating metrics:', error);
    }
  }

  private calculateMaxDrawdown(): number {
    if (this.tradeHistory.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let currentValue = this.account.balance;

    for (const trade of this.tradeHistory) {
      currentValue += trade.realizedPnl || 0;
      
      if (currentValue > peak) {
        peak = currentValue;
      }
      
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateSharpeRatio(): number {
    if (this.tradeHistory.length < 2) return 0;

    const returns = this.tradeHistory.map(trade => trade.returnPercent || 0);
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return mean / stdDev;
  }

  public getMetrics(): any {
    return { ...this.metrics };
  }

  public getTradeHistory(): any[] {
    return [...this.tradeHistory];
  }

  public getStatus(): any {
    return {
      account: this.getAccount(),
      positions: this.getOpenPositions(),
      summary: this.getSummary(),
      metrics: this.getMetrics(),
    };
  }
}
