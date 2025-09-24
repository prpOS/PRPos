import { logger } from '../../utils/logger';

export interface TradingSignal {
  side: 'long' | 'short';
  size: number;
  confidence: number;
  strategy: string;
  timestamp: number;
}

export class SMAStrategy {
  private shortWindow: number;
  private longWindow: number;
  private shortSMA: number[] = [];
  private longSMA: number[] = [];
  private lastSignalTime: number = 0;
  private signalCooldown: number = 30000; // 30 seconds cooldown
  private name: string = 'SMA';

  constructor(shortWindow: number = 9, longWindow: number = 21) {
    this.shortWindow = shortWindow;
    this.longWindow = longWindow;
  }

  public generateSignal(tick: { timestamp: number; price: number; volume: number }): TradingSignal | null {
    try {
      // Add price to SMA calculations
      this.shortSMA.push(tick.price);
      this.longSMA.push(tick.price);

      // Keep only necessary history
      if (this.shortSMA.length > this.shortWindow) {
        this.shortSMA.shift();
      }
      if (this.longSMA.length > this.longWindow) {
        this.longSMA.shift();
      }

      // Need enough data for both SMAs
      if (this.shortSMA.length < this.shortWindow || this.longSMA.length < this.longWindow) {
        return null;
      }

      // Check cooldown
      if (tick.timestamp - this.lastSignalTime < this.signalCooldown) {
        return null;
      }

      // Calculate SMAs
      const shortAvg = this.calculateSMA(this.shortSMA);
      const longAvg = this.calculateSMA(this.longSMA);

      // Generate signal based on crossover
      const signal = this.analyzeCrossover(shortAvg, longAvg, tick.price);
      
      if (signal) {
        this.lastSignalTime = tick.timestamp;
        logger.info(`SMA Strategy signal: ${signal.side} at ${tick.price}, short SMA: ${shortAvg.toFixed(4)}, long SMA: ${longAvg.toFixed(4)}`);
      }

      return signal;
    } catch (error) {
      logger.error('Error in SMA strategy:', error);
      return null;
    }
  }

  private calculateSMA(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  private analyzeCrossover(shortSMA: number, longSMA: number, currentPrice: number): TradingSignal | null {
    // Calculate the difference between SMAs
    const smaDifference = shortSMA - longSMA;
    const smaDifferencePercent = (smaDifference / longSMA) * 100;

    // Determine signal strength based on SMA difference
    let signalStrength = Math.abs(smaDifferencePercent);
    let side: 'long' | 'short' | null = null;

    // Golden cross: short SMA crosses above long SMA
    if (smaDifference > 0 && smaDifferencePercent > 0.5) {
      side = 'long';
    }
    // Death cross: short SMA crosses below long SMA
    else if (smaDifference < 0 && smaDifferencePercent < -0.5) {
      side = 'short';
    }

    if (!side) {
      return null;
    }

    // Calculate position size based on signal strength
    const baseSize = 0.1; // Base position size
    const sizeMultiplier = Math.min(signalStrength / 2, 2); // Cap at 2x
    const size = baseSize * sizeMultiplier;

    // Calculate confidence based on signal strength and price momentum
    const priceMomentum = this.calculatePriceMomentum();
    const confidence = Math.min((signalStrength + priceMomentum) / 10, 1);

    return {
      side,
      size: Math.max(size, 0.01), // Minimum size
      confidence,
      strategy: this.name,
      timestamp: Date.now(),
    };
  }

  private calculatePriceMomentum(): number {
    if (this.shortSMA.length < 5) return 0;

    const recent = this.shortSMA.slice(-5);
    const older = this.shortSMA.slice(-10, -5);
    
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  public getStatus(): any {
    return {
      name: this.name,
      shortWindow: this.shortWindow,
      longWindow: this.longWindow,
      shortSMA: this.shortSMA.length > 0 ? this.calculateSMA(this.shortSMA) : null,
      longSMA: this.longSMA.length > 0 ? this.calculateSMA(this.longSMA) : null,
      dataPoints: Math.min(this.shortSMA.length, this.longSMA.length),
    };
  }

  public reset(): void {
    this.shortSMA = [];
    this.longSMA = [];
    this.lastSignalTime = 0;
  }
}
