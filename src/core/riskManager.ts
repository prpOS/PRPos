import { logger } from '../utils/logger';
import { Config } from '../config';

export interface Account {
  id: string;
  balance: number;
  margin: number;
  leverage: number;
  openPositions: number;
}

export interface Position {
  id: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  timestamp: number;
}

export interface RiskAssessment {
  allowed: boolean;
  reason?: string;
  maxSize?: number;
  suggestedLeverage?: number;
}

export interface PositionRiskAssessment {
  shouldClose: boolean;
  reason?: string;
  liquidationPrice?: number;
  marginCall?: boolean;
}

export class RiskManager {
  private config: Config;
  private maxLeverage: number;
  private riskPerTrade: number;
  private maxPositions: number;

  constructor(config: Config) {
    this.config = config;
    this.maxLeverage = config.maxLeverage;
    this.riskPerTrade = config.riskPerTrade;
    this.maxPositions = config.maxPositions;
  }

  public canOpenPosition(
    account: Account,
    requestedSize: number,
    price: number
  ): RiskAssessment {
    try {
      // Check if account has enough balance
      const requiredMargin = this.calculateRequiredMargin(requestedSize, price);
      if (account.balance < requiredMargin) {
        return {
          allowed: false,
          reason: 'Insufficient balance for required margin',
          maxSize: this.calculateMaxSize(account.balance, price),
        };
      }

      // Check leverage limits
      const leverage = this.calculateLeverage(requestedSize, price, account.balance);
      if (leverage > this.maxLeverage) {
        return {
          allowed: false,
          reason: `Leverage ${leverage.toFixed(2)} exceeds maximum ${this.maxLeverage}`,
          suggestedLeverage: this.maxLeverage,
        };
      }

      // Check position limits
      if (account.openPositions >= this.maxPositions) {
        return {
          allowed: false,
          reason: `Maximum positions (${this.maxPositions}) already open`,
        };
      }

      // Check risk per trade
      const riskAmount = requestedSize * price * this.riskPerTrade;
      if (riskAmount > account.balance * 0.1) { // Max 10% of balance per trade
        return {
          allowed: false,
          reason: 'Trade size exceeds risk limits',
          maxSize: this.calculateMaxSize(account.balance * 0.1 / (price * this.riskPerTrade), price),
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error in risk assessment:', error);
      return {
        allowed: false,
        reason: 'Risk assessment error',
      };
    }
  }

  public evaluatePosition(position: Position, markPrice: number): PositionRiskAssessment {
    try {
      // Update position with current mark price
      const updatedPosition = { ...position, markPrice };
      updatedPosition.unrealizedPnl = this.calculateUnrealizedPnl(updatedPosition);

      // Check for liquidation
      const liquidationPrice = this.calculateLiquidationPrice(updatedPosition);
      const isLiquidated = this.checkLiquidation(updatedPosition, liquidationPrice);

      if (isLiquidated) {
        return {
          shouldClose: true,
          reason: 'Position liquidated',
          liquidationPrice,
        };
      }

      // Check for margin call
      const marginRatio = this.calculateMarginRatio(updatedPosition);
      if (marginRatio < 0.1) { // 10% margin ratio threshold
        return {
          shouldClose: true,
          reason: 'Margin call - insufficient margin',
          marginCall: true,
        };
      }

      // Check stop loss
      const stopLossPrice = this.calculateStopLossPrice(updatedPosition);
      if (this.checkStopLoss(updatedPosition, stopLossPrice)) {
        return {
          shouldClose: true,
          reason: 'Stop loss triggered',
        };
      }

      // Check take profit
      const takeProfitPrice = this.calculateTakeProfitPrice(updatedPosition);
      if (this.checkTakeProfit(updatedPosition, takeProfitPrice)) {
        return {
          shouldClose: true,
          reason: 'Take profit triggered',
        };
      }

      return { shouldClose: false };
    } catch (error) {
      logger.error('Error evaluating position risk:', error);
      return {
        shouldClose: true,
        reason: 'Risk evaluation error',
      };
    }
  }

  private calculateRequiredMargin(size: number, price: number): number {
    return (size * price) / this.maxLeverage;
  }

  private calculateMaxSize(balance: number, price: number): number {
    return (balance * this.maxLeverage) / price;
  }

  private calculateLeverage(size: number, price: number, balance: number): number {
    const notionalValue = size * price;
    return notionalValue / balance;
  }

  private calculateUnrealizedPnl(position: Position): number {
    const priceDiff = position.markPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return position.size * priceDiff * multiplier;
  }

  private calculateLiquidationPrice(position: Position): number {
    const marginRatio = 0.05; // 5% maintenance margin
    const notionalValue = position.size * position.entryPrice;
    const maintenanceMargin = notionalValue * marginRatio;
    
    if (position.side === 'long') {
      return position.entryPrice - (notionalValue - maintenanceMargin) / position.size;
    } else {
      return position.entryPrice + (notionalValue - maintenanceMargin) / position.size;
    }
  }

  private checkLiquidation(position: Position, liquidationPrice: number): boolean {
    if (position.side === 'long') {
      return position.markPrice <= liquidationPrice;
    } else {
      return position.markPrice >= liquidationPrice;
    }
  }

  private calculateMarginRatio(position: Position): number {
    const notionalValue = position.size * position.markPrice;
    const availableMargin = position.margin + position.unrealizedPnl;
    return availableMargin / notionalValue;
  }

  private calculateStopLossPrice(position: Position): number {
    const stopLossPercent = this.config.stopLossPercentage;
    if (position.side === 'long') {
      return position.entryPrice * (1 - stopLossPercent);
    } else {
      return position.entryPrice * (1 + stopLossPercent);
    }
  }

  private checkStopLoss(position: Position, stopLossPrice: number): boolean {
    if (position.side === 'long') {
      return position.markPrice <= stopLossPrice;
    } else {
      return position.markPrice >= stopLossPrice;
    }
  }

  private calculateTakeProfitPrice(position: Position): number {
    const takeProfitPercent = this.config.takeProfitPercentage;
    if (position.side === 'long') {
      return position.entryPrice * (1 + takeProfitPercent);
    } else {
      return position.entryPrice * (1 - takeProfitPercent);
    }
  }

  private checkTakeProfit(position: Position, takeProfitPrice: number): boolean {
    if (position.side === 'long') {
      return position.markPrice >= takeProfitPrice;
    } else {
      return position.markPrice <= takeProfitPrice;
    }
  }

  public getStatus(): any {
    return {
      maxLeverage: this.maxLeverage,
      riskPerTrade: this.riskPerTrade,
      maxPositions: this.maxPositions,
      stopLossPercentage: this.config.stopLossPercentage,
      takeProfitPercentage: this.config.takeProfitPercentage,
    };
  }
}
