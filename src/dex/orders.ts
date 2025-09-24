import { logger } from '../utils/logger';
import { db } from '../services/db';

export interface Order {
  id: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  type: 'market' | 'limit';
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'failed';
  filledSize: number;
  avgPrice: number;
  fees: number;
  timestamp: number;
  strategy: string;
  orderId?: string;
}

export interface OrderFilter {
  status?: string;
  side?: 'long' | 'short';
  strategy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class OrderManager {
  private orders: Map<string, Order> = new Map();

  constructor() {
    this.loadOrdersFromDatabase();
  }

  private async loadOrdersFromDatabase(): Promise<void> {
    try {
      const orders = await db.getOrders();
      for (const order of orders) {
        this.orders.set(order.id, order);
      }
      logger.info(`Loaded ${orders.length} orders from database`);
    } catch (error) {
      logger.error('Error loading orders from database:', error);
    }
  }

  public async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      const order: Order = {
        id: this.generateOrderId(),
        side: orderData.side || 'long',
        size: orderData.size || 0,
        price: orderData.price || 0,
        type: orderData.type || 'market',
        status: 'pending',
        filledSize: 0,
        avgPrice: 0,
        fees: 0,
        timestamp: Date.now(),
        strategy: orderData.strategy || 'manual',
        orderId: orderData.orderId,
      };

      // Store in memory
      this.orders.set(order.id, order);

      // Persist to database
      await db.storeOrder({
        id: order.id,
        side: order.side,
        size: order.size,
        price: order.price,
        type: order.type,
        status: order.status,
        filledSize: order.filledSize,
        avgPrice: order.avgPrice,
        fees: order.fees,
        timestamp: new Date(order.timestamp),
        strategy: order.strategy,
        orderId: order.orderId,
      });

      logger.info(`Order created: ${order.id}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  public async updateOrder(orderId: string, updates: Partial<Order>): Promise<boolean> {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        logger.warn(`Order not found: ${orderId}`);
        return false;
      }

      // Update order
      const updatedOrder = { ...order, ...updates };
      this.orders.set(orderId, updatedOrder);

      // Persist to database
      await db.updateOrder(orderId, {
        status: updatedOrder.status,
        filledSize: updatedOrder.filledSize,
        avgPrice: updatedOrder.avgPrice,
        fees: updatedOrder.fees,
      });

      logger.info(`Order updated: ${orderId}`);
      return true;
    } catch (error) {
      logger.error('Error updating order:', error);
      return false;
    }
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public getOrders(filter?: OrderFilter): Order[] {
    let orders = Array.from(this.orders.values());

    if (filter) {
      if (filter.status) {
        orders = orders.filter(order => order.status === filter.status);
      }
      if (filter.side) {
        orders = orders.filter(order => order.side === filter.side);
      }
      if (filter.strategy) {
        orders = orders.filter(order => order.strategy === filter.strategy);
      }
      if (filter.startDate) {
        orders = orders.filter(order => new Date(order.timestamp) >= filter.startDate!);
      }
      if (filter.endDate) {
        orders = orders.filter(order => new Date(order.timestamp) <= filter.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    orders.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (filter?.limit) {
      const offset = filter.offset || 0;
      orders = orders.slice(offset, offset + filter.limit);
    }

    return orders;
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        logger.warn(`Order not found: ${orderId}`);
        return false;
      }

      if (order.status === 'filled') {
        logger.warn(`Cannot cancel filled order: ${orderId}`);
        return false;
      }

      if (order.status === 'cancelled') {
        logger.warn(`Order already cancelled: ${orderId}`);
        return false;
      }

      // Update order status
      await this.updateOrder(orderId, { status: 'cancelled' });

      logger.info(`Order cancelled: ${orderId}`);
      return true;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      return false;
    }
  }

  public getOrderStats(): any {
    const orders = Array.from(this.orders.values());
    const totalOrders = orders.length;
    const filledOrders = orders.filter(o => o.status === 'filled').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;

    const totalFees = orders.reduce((sum, o) => sum + o.fees, 0);
    const totalVolume = orders.reduce((sum, o) => sum + o.filledSize * o.avgPrice, 0);

    return {
      totalOrders,
      filledOrders,
      pendingOrders,
      cancelledOrders,
      failedOrders,
      fillRate: totalOrders > 0 ? filledOrders / totalOrders : 0,
      totalFees,
      totalVolume,
    };
  }

  public getOrdersByStrategy(strategy: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.strategy === strategy);
  }

  public getRecentOrders(limit: number = 10): Order[] {
    return this.getOrders({ limit });
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStatus(): any {
    const stats = this.getOrderStats();
    return {
      ...stats,
      totalOrders: this.orders.size,
    };
  }
}
