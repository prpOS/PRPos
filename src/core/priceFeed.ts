import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { Config } from '../config';

export interface PriceTick {
  timestamp: number;
  price: number;
  volume: number;
}

export class PriceFeed extends EventEmitter {
  private connection: Connection;
  private config: Config;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private lastPrice: number = 100; // Starting price for simulation
  private priceHistory: number[] = [];
  private randomSeed: number;

  constructor(config: Config) {
    super();
    this.config = config;
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.randomSeed = config.simulationSeed;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Price feed is already running');
      return;
    }

    try {
      if (this.config.simulationMode) {
        await this.startSimulation();
      } else {
        await this.startRealTime();
      }
      
      this.isRunning = true;
      logger.info('Price feed started');
    } catch (error) {
      logger.error('Failed to start price feed:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Price feed is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    logger.info('Price feed stopped');
  }

  private async startSimulation(): Promise<void> {
    logger.info('Starting price feed in simulation mode');
    
    // Initialize price history with some realistic data
    this.initializePriceHistory();
    
    this.intervalId = setInterval(() => {
      this.generateSimulatedTick();
    }, this.config.priceFeedInterval);
  }

  private async startRealTime(): Promise<void> {
    logger.info('Starting real-time price feed');
    
    try {
      // In a real implementation, this would connect to a WebSocket feed
      // For now, we'll simulate with a more realistic price feed
      this.intervalId = setInterval(() => {
        this.generateRealisticTick();
      }, this.config.priceFeedInterval);
    } catch (error) {
      logger.error('Failed to connect to real-time price feed:', error);
      throw error;
    }
  }

  private initializePriceHistory(): void {
    // Generate initial price history using a simple random walk
    const initialPrice = 100;
    this.priceHistory = [initialPrice];
    
    for (let i = 1; i < 100; i++) {
      const change = (Math.random() - 0.5) * 0.02; // 2% max change
      const newPrice = this.priceHistory[i - 1] * (1 + change);
      this.priceHistory.push(Math.max(newPrice, 0.01)); // Prevent negative prices
    }
    
    this.lastPrice = this.priceHistory[this.priceHistory.length - 1];
  }

  private generateSimulatedTick(): void {
    // Simple random walk with mean reversion
    const volatility = 0.01; // 1% volatility
    const meanReversion = 0.0001; // Small mean reversion force
    const targetPrice = 100; // Mean reversion target
    
    const randomChange = (Math.random() - 0.5) * volatility;
    const reversionForce = (targetPrice - this.lastPrice) * meanReversion;
    const totalChange = randomChange + reversionForce;
    
    const newPrice = this.lastPrice * (1 + totalChange);
    const volume = Math.random() * 1000 + 100; // Random volume between 100-1100
    
    this.emitTick({
      timestamp: Date.now(),
      price: Math.max(newPrice, 0.01),
      volume,
    });
    
    this.lastPrice = newPrice;
    this.priceHistory.push(newPrice);
    
    // Keep only last 1000 prices in memory
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }
  }

  private generateRealisticTick(): void {
    // More realistic price simulation with trends and volatility clustering
    const trend = this.calculateTrend();
    const volatility = this.calculateVolatility();
    const randomChange = (Math.random() - 0.5) * volatility;
    const trendComponent = trend * 0.1;
    
    const newPrice = this.lastPrice * (1 + randomChange + trendComponent);
    const volume = this.calculateVolume();
    
    this.emitTick({
      timestamp: Date.now(),
      price: Math.max(newPrice, 0.01),
      volume,
    });
    
    this.lastPrice = newPrice;
    this.priceHistory.push(newPrice);
    
    // Keep only last 1000 prices in memory
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }
  }

  private calculateTrend(): number {
    if (this.priceHistory.length < 20) return 0;
    
    const recent = this.priceHistory.slice(-20);
    const older = this.priceHistory.slice(-40, -20);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private calculateVolatility(): number {
    if (this.priceHistory.length < 20) return 0.01;
    
    const recent = this.priceHistory.slice(-20);
    const returns = [];
    
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 2; // Scale volatility
  }

  private calculateVolume(): number {
    // Volume tends to be higher during volatile periods
    const recentVolatility = this.calculateVolatility();
    const baseVolume = 500;
    const volatilityMultiplier = 1 + recentVolatility * 10;
    
    return baseVolume * volatilityMultiplier * (0.5 + Math.random());
  }

  private emitTick(tick: PriceTick): void {
    this.emit('tick', tick);
  }

  public getLatest(): PriceTick {
    return {
      timestamp: Date.now(),
      price: this.lastPrice,
      volume: 0,
    };
  }

  public getPriceHistory(): number[] {
    return [...this.priceHistory];
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      lastPrice: this.lastPrice,
      historyLength: this.priceHistory.length,
      simulationMode: this.config.simulationMode,
    };
  }
}
