import { logger } from '../utils/logger';
import { db } from '../services/db';

export interface Position {
  id: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  status: 'open' | 'closed';
  timestamp: number;
  closeTimestamp?: number;
  closePrice?: number;
  closeReason?: string;
  strategy: string;
}

export interface PositionFilter {
  status?: 'open' | 'closed';
  side?: 'long' | 'short';
  strategy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class PositionManager {
  private positions: Map<string, Position> = new Map();

  constructor() {
    this.loadPositionsFromDatabase();
  }

  private async loadPositionsFromDatabase(): Promise<void> {
    try {
      const positions = await db.getPositions();
      for (const position of positions) {
        this.positions.set(position.id, position);
      }
      logger.info(`Loaded ${positions.length} positions from database`);
    } catch (error) {
      logger.error('Error loading positions from database:', error);
    }
  }

  public async createPosition(positionData: Partial<Position>): Promise<Position> {
    try {
      const position: Position = {
        id: this.generatePositionId(),
        side: positionData.side || 'long',
        size: positionData.size || 0,
        entryPrice: positionData.entryPrice || 0,
        markPrice: positionData.markPrice || positionData.entryPrice || 0,
        leverage: positionData.leverage || 1,
        margin: positionData.margin || 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        status: 'open',
        timestamp: Date.now(),
        strategy: positionData.strategy || 'manual',
      };

      // Store in memory
      this.positions.set(position.id, position);

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
        realizedPnl: position.realizedPnl,
        status: position.status,
        timestamp: new Date(position.timestamp),
        strategy: position.strategy,
      });

      logger.info(`Position created: ${position.id}`);
      return position;
    } catch (error) {
      logger.error('Error creating position:', error);
      throw error;
    }
  }

  public async updatePosition(positionId: string, updates: Partial<Position>): Promise<boolean> {
    try {
      const position = this.positions.get(positionId);
      if (!position) {
        logger.warn(`Position not found: ${positionId}`);
        return false;
      }

      // Update position
      const updatedPosition = { ...position, ...updates };
      this.positions.set(positionId, updatedPosition);

      // Persist to database
      await db.updatePosition(positionId, {
        markPrice: updatedPosition.markPrice,
        unrealizedPnl: updatedPosition.unrealizedPnl,
        realizedPnl: updatedPosition.realizedPnl,
        status: updatedPosition.status,
        closeTimestamp: updatedPosition.closeTimestamp ? new Date(updatedPosition.closeTimestamp) : undefined,
        closePrice: updatedPosition.closePrice,
        closeReason: updatedPosition.closeReason,
      });

      logger.info(`Position updated: ${positionId}`);
      return true;
    } catch (error) {
      logger.error('Error updating position:', error);
      return false;
    }
  }

  public getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  public getPositions(filter?: PositionFilter): Position[] {
    let positions = Array.from(this.positions.values());

    if (filter) {
      if (filter.status) {
        positions = positions.filter(position => position.status === filter.status);
      }
      if (filter.side) {
        positions = positions.filter(position => position.side === filter.side);
      }
      if (filter.strategy) {
        positions = positions.filter(position => position.strategy === filter.strategy);
      }
      if (filter.startDate) {
        positions = positions.filter(position => new Date(position.timestamp) >= filter.startDate!);
      }
      if (filter.endDate) {
        positions = positions.filter(position => new Date(position.timestamp) <= filter.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    positions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (filter?.limit) {
      const offset = filter.offset || 0;
      positions = positions.slice(offset, offset + filter.limit);
    }

    return positions;
  }

  public getOpenPositions(): Position[] {
    return this.getPositions({ status: 'open' });
  }

  public getClosedPositions(): Position[] {
    return this.getPositions({ status: 'closed' });
  }

  public async closePosition(positionId: string, closePrice: number, reason: string): Promise<boolean> {
    try {
      const position = this.positions.get(positionId);
      if (!position) {
        logger.warn(`Position not found: ${positionId}`);
        return false;
      }

      if (position.status === 'closed') {
        logger.warn(`Position already closed: ${positionId}`);
        return false;
      }

      // Calculate realized PnL
      const realizedPnl = this.calculateRealizedPnl(position, closePrice);

      // Update position
      await this.updatePosition(positionId, {
        status: 'closed',
        closePrice,
        closeTimestamp: Date.now(),
        closeReason: reason,
        realizedPnl,
        unrealizedPnl: 0,
      });

      logger.info(`Position closed: ${positionId}, PnL: ${realizedPnl.toFixed(4)}`);
      return true;
    } catch (error) {
      logger.error('Error closing position:', error);
      return false;
    }
  }

  private calculateRealizedPnl(position: Position, closePrice: number): number {
    const priceDiff = closePrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return position.size * priceDiff * multiplier;
  }

  public updateMarkPrice(positionId: string, markPrice: number): void {
    const position = this.positions.get(positionId);
    if (position && position.status === 'open') {
      position.markPrice = markPrice;
      position.unrealizedPnl = this.calculateUnrealizedPnl(position);
    }
  }

  private calculateUnrealizedPnl(position: Position): number {
    const priceDiff = position.markPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return position.size * priceDiff * multiplier;
  }

  public getPositionStats(): any {
    const positions = Array.from(this.positions.values());
    const openPositions = positions.filter(p => p.status === 'open');
    const closedPositions = positions.filter(p => p.status === 'closed');

    const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + p.realizedPnl, 0);

    const winningPositions = closedPositions.filter(p => p.realizedPnl > 0);
    const losingPositions = closedPositions.filter(p => p.realizedPnl < 0);

    const winRate = closedPositions.length > 0 ? winningPositions.length / closedPositions.length : 0;
    const averageWin = winningPositions.length > 0 
      ? winningPositions.reduce((sum, p) => sum + p.realizedPnl, 0) / winningPositions.length 
      : 0;
    const averageLoss = losingPositions.length > 0 
      ? losingPositions.reduce((sum, p) => sum + p.realizedPnl, 0) / losingPositions.length 
      : 0;

    return {
      totalPositions: positions.length,
      openPositions: openPositions.length,
      closedPositions: closedPositions.length,
      totalUnrealizedPnl,
      totalRealizedPnl,
      winRate,
      averageWin,
      averageLoss,
      profitFactor: averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0,
    };
  }

  public getPositionsByStrategy(strategy: string): Position[] {
    return Array.from(this.positions.values()).filter(position => position.strategy === strategy);
  }

  public getRecentPositions(limit: number = 10): Position[] {
    return this.getPositions({ limit });
  }

  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStatus(): any {
    const stats = this.getPositionStats();
    return {
      ...stats,
      totalPositions: this.positions.size,
    };
  }
}
