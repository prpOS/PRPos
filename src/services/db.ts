import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }

  // Account operations
  public async getAccount(): Promise<any> {
    try {
      return await this.prisma.account.findFirst();
    } catch (error) {
      logger.error('Error fetching account:', error);
      return null;
    }
  }

  public async createAccount(accountData: any): Promise<any> {
    try {
      return await this.prisma.account.create({
        data: accountData,
      });
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  public async updateAccount(accountId: string, updates: any): Promise<any> {
    try {
      return await this.prisma.account.update({
        where: { id: accountId },
        data: updates,
      });
    } catch (error) {
      logger.error('Error updating account:', error);
      throw error;
    }
  }

  // Trade operations
  public async storeTrade(tradeData: any): Promise<any> {
    try {
      return await this.prisma.trade.create({
        data: tradeData,
      });
    } catch (error) {
      logger.error('Error storing trade:', error);
      throw error;
    }
  }

  public async getTrades(filter?: any): Promise<any[]> {
    try {
      return await this.prisma.trade.findMany({
        where: filter,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching trades:', error);
      return [];
    }
  }

  public async getTradeHistory(limit: number = 100): Promise<any[]> {
    try {
      return await this.prisma.trade.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching trade history:', error);
      return [];
    }
  }

  // Position operations
  public async storePosition(positionData: any): Promise<any> {
    try {
      return await this.prisma.position.create({
        data: positionData,
      });
    } catch (error) {
      logger.error('Error storing position:', error);
      throw error;
    }
  }

  public async getPositions(filter?: any): Promise<any[]> {
    try {
      return await this.prisma.position.findMany({
        where: filter,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching positions:', error);
      return [];
    }
  }

  public async getOpenPositions(): Promise<any[]> {
    try {
      return await this.prisma.position.findMany({
        where: { status: 'open' },
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching open positions:', error);
      return [];
    }
  }

  public async updatePosition(positionId: string, updates: any): Promise<any> {
    try {
      return await this.prisma.position.update({
        where: { id: positionId },
        data: updates,
      });
    } catch (error) {
      logger.error('Error updating position:', error);
      throw error;
    }
  }

  // Order operations
  public async storeOrder(orderData: any): Promise<any> {
    try {
      return await this.prisma.order.create({
        data: orderData,
      });
    } catch (error) {
      logger.error('Error storing order:', error);
      throw error;
    }
  }

  public async getOrders(filter?: any): Promise<any[]> {
    try {
      return await this.prisma.order.findMany({
        where: filter,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching orders:', error);
      return [];
    }
  }

  public async updateOrder(orderId: string, updates: any): Promise<any> {
    try {
      return await this.prisma.order.update({
        where: { id: orderId },
        data: updates,
      });
    } catch (error) {
      logger.error('Error updating order:', error);
      throw error;
    }
  }

  // Price tick operations
  public async storePriceTick(tickData: any): Promise<any> {
    try {
      return await this.prisma.priceTick.create({
        data: tickData,
      });
    } catch (error) {
      logger.error('Error storing price tick:', error);
      throw error;
    }
  }

  public async getPriceTicks(limit: number = 1000): Promise<any[]> {
    try {
      return await this.prisma.priceTick.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching price ticks:', error);
      return [];
    }
  }

  // Strategy configuration operations
  public async getStrategyConfigs(): Promise<any[]> {
    try {
      return await this.prisma.strategyConfig.findMany();
    } catch (error) {
      logger.error('Error fetching strategy configs:', error);
      return [];
    }
  }

  public async updateStrategyConfig(strategyId: string, updates: any): Promise<any> {
    try {
      return await this.prisma.strategyConfig.update({
        where: { id: strategyId },
        data: updates,
      });
    } catch (error) {
      logger.error('Error updating strategy config:', error);
      throw error;
    }
  }

  // Telegram user operations
  public async getTelegramUsers(): Promise<any[]> {
    try {
      return await this.prisma.telegramUser.findMany();
    } catch (error) {
      logger.error('Error fetching telegram users:', error);
      return [];
    }
  }

  public async createTelegramUser(userData: any): Promise<any> {
    try {
      return await this.prisma.telegramUser.create({
        data: userData,
      });
    } catch (error) {
      logger.error('Error creating telegram user:', error);
      throw error;
    }
  }

  // Transaction helpers
  public async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public getStatus(): any {
    return {
      isConnected: this.isConnected,
      database: 'sqlite',
    };
  }
}

// Export singleton instance
export const db = new DatabaseService();
