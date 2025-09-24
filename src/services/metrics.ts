import { logger } from '../utils/logger';
import { db } from './db';

export interface MetricData {
  timestamp: number;
  value: number;
  type: string;
  label?: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

export class MetricsService {
  private metrics: Map<string, MetricData[]> = new Map();
  private performanceCache: PerformanceMetrics | null = null;
  private cacheExpiry: number = 0;
  private cacheDuration: number = 60000; // 1 minute

  constructor() {
    this.loadMetricsFromDatabase();
  }

  private async loadMetricsFromDatabase(): Promise<void> {
    try {
      // Load recent metrics from database
      const trades = await db.getTradeHistory(1000);
      const positions = await db.getPositions();
      
      // Process trades for performance metrics
      this.processTradesForMetrics(trades);
      
      logger.info('Metrics loaded from database');
    } catch (error) {
      logger.error('Error loading metrics from database:', error);
    }
  }

  private processTradesForMetrics(trades: any[]): void {
    const pnlData: MetricData[] = [];
    const returnData: MetricData[] = [];
    
    let cumulativePnl = 0;
    
    for (const trade of trades) {
      const pnl = trade.realizedPnl || 0;
      cumulativePnl += pnl;
      
      pnlData.push({
        timestamp: trade.timestamp.getTime(),
        value: cumulativePnl,
        type: 'cumulative_pnl',
      });
      
      if (trade.returnPercent) {
        returnData.push({
          timestamp: trade.timestamp.getTime(),
          value: trade.returnPercent,
          type: 'return',
        });
      }
    }
    
    this.metrics.set('cumulative_pnl', pnlData);
    this.metrics.set('returns', returnData);
  }

  public async addMetric(type: string, value: number, label?: string): Promise<void> {
    try {
      const metric: MetricData = {
        timestamp: Date.now(),
        value,
        type,
        label,
      };

      if (!this.metrics.has(type)) {
        this.metrics.set(type, []);
      }

      const metrics = this.metrics.get(type)!;
      metrics.push(metric);

      // Keep only last 1000 data points per metric type
      if (metrics.length > 1000) {
        metrics.shift();
      }

      // Store in database
      await this.storeMetricToDatabase(metric);
    } catch (error) {
      logger.error('Error adding metric:', error);
    }
  }

  private async storeMetricToDatabase(metric: MetricData): Promise<void> {
    try {
      // In a real implementation, this would store to a metrics table
      // For now, we'll just log it
      logger.debug(`Metric stored: ${metric.type} = ${metric.value}`);
    } catch (error) {
      logger.error('Error storing metric to database:', error);
    }
  }

  public getMetrics(type: string, limit: number = 100): MetricData[] {
    const metrics = this.metrics.get(type) || [];
    return metrics.slice(-limit);
  }

  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Check cache
      if (this.performanceCache && Date.now() < this.cacheExpiry) {
        return this.performanceCache;
      }

      // Calculate fresh metrics
      const trades = await db.getTradeHistory(1000);
      const positions = await db.getPositions();
      
      const metrics = this.calculatePerformanceMetrics(trades, positions);
      
      // Cache results
      this.performanceCache = metrics;
      this.cacheExpiry = Date.now() + this.cacheDuration;
      
      return metrics;
    } catch (error) {
      logger.error('Error calculating performance metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  private calculatePerformanceMetrics(trades: any[], positions: any[]): PerformanceMetrics {
    if (trades.length === 0) {
      return this.getDefaultMetrics();
    }

    // Calculate returns
    const returns = trades.map(trade => trade.returnPercent || 0);
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(returns);
    
    // Calculate Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(trades);
    
    // Calculate win rate and profit factor
    const winningTrades = trades.filter(trade => (trade.realizedPnl || 0) > 0);
    const losingTrades = trades.filter(trade => (trade.realizedPnl || 0) < 0);
    
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    
    const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
    };
  }

  private calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    const periodsPerYear = 365; // Assuming daily returns
    return totalReturn * periodsPerYear;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    if (volatility === 0) return 0;
    return mean / volatility;
  }

  private calculateMaxDrawdown(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnl = 0;
    
    for (const trade of trades) {
      cumulativePnl += trade.realizedPnl || 0;
      
      if (cumulativePnl > peak) {
        peak = cumulativePnl;
      }
      
      const drawdown = (peak - cumulativePnl) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  public getChartData(type: string, limit: number = 100): ChartData {
    const metrics = this.getMetrics(type, limit);
    
    const labels = metrics.map(m => new Date(m.timestamp).toLocaleString());
    const data = metrics.map(m => m.value);
    
    return {
      labels,
      datasets: [{
        label: type,
        data,
        borderColor: this.getColorForType(type),
        backgroundColor: this.getColorForType(type, 0.1),
      }],
    };
  }

  private getColorForType(type: string, alpha: number = 1): string {
    const colors: { [key: string]: string } = {
      cumulative_pnl: `rgba(34, 197, 94, ${alpha})`,
      returns: `rgba(59, 130, 246, ${alpha})`,
      volatility: `rgba(239, 68, 68, ${alpha})`,
      sharpe_ratio: `rgba(168, 85, 247, ${alpha})`,
    };
    
    return colors[type] || `rgba(107, 114, 128, ${alpha})`;
  }

  public getStatus(): any {
    return {
      metricsCount: this.metrics.size,
      cacheValid: Date.now() < this.cacheExpiry,
      performanceCache: this.performanceCache !== null,
    };
  }
}
