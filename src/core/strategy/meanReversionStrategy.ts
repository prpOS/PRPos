import { logger } from '../../utils/logger';

export interface TradingSignal {
  side: 'long' | 'short';
  size: number;
  confidence: number;
  strategy: string;
  timestamp: number;
}

export class MeanReversionStrategy {
  private window: number;
  private threshold: number;
  private returns: number[] = [];
  private lastSignalTime: number = 0;
  private signalCooldown: number = 60000; // 60 seconds cooldown
  private name: string = 'MeanReversion';

  constructor(window: number = 20, threshold: number = 2.0) {
    this.window = window;
    this.threshold = threshold;
  }

  public generateSignal(tick: { timestamp: number; price: number; volume: number }): TradingSignal | null {
    try {
      // Add price to returns calculation
      if (this.returns.length > 0) {
        const lastPrice = this.getLastPrice();
        const returnValue = (tick.price - lastPrice) / lastPrice;
        this.returns.push(returnValue);
      }

      // Keep only necessary history
      if (this.returns.length > this.window) {
        this.returns.shift();
      }

      // Need enough data for z-score calculation
      if (this.returns.length < this.window) {
        return null;
      }

      // Check cooldown
      if (tick.timestamp - this.lastSignalTime < this.signalCooldown) {
        return null;
      }

      // Calculate z-score
      const zScore = this.calculateZScore();
      
      // Generate signal based on z-score
      const signal = this.analyzeZScore(zScore, tick.price);
      
      if (signal) {
        this.lastSignalTime = tick.timestamp;
        logger.info(`Mean Reversion Strategy signal: ${signal.side} at ${tick.price}, z-score: ${zScore.toFixed(4)}`);
      }

      return signal;
    } catch (error) {
      logger.error('Error in Mean Reversion strategy:', error);
      return null;
    }
  }

  private getLastPrice(): number {
    // In a real implementation, this would track the last price
    // For simulation, we'll use a simple approach
    return 100; // This should be replaced with actual price tracking
  }

  private calculateZScore(): number {
    if (this.returns.length < 2) return 0;

    // Calculate mean
    const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    
    // Calculate standard deviation
    const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    // Calculate z-score of the most recent return
    const latestReturn = this.returns[this.returns.length - 1];
    return (latestReturn - mean) / stdDev;
  }

  private analyzeZScore(zScore: number, currentPrice: number): TradingSignal | null {
    // Mean reversion signals
    let side: 'long' | 'short' | null = null;
    let confidence = 0;

    // Strong negative z-score suggests oversold condition (buy signal)
    if (zScore < -this.threshold) {
      side = 'long';
      confidence = Math.min(Math.abs(zScore) / this.threshold, 1);
    }
    // Strong positive z-score suggests overbought condition (sell signal)
    else if (zScore > this.threshold) {
      side = 'short';
      confidence = Math.min(zScore / this.threshold, 1);
    }

    if (!side) {
      return null;
    }

    // Calculate position size based on z-score magnitude
    const baseSize = 0.1;
    const sizeMultiplier = Math.min(Math.abs(zScore) / this.threshold, 2);
    const size = baseSize * sizeMultiplier;

    // Additional confidence factors
    const volatilityFactor = this.calculateVolatilityFactor();
    const momentumFactor = this.calculateMomentumFactor();
    
    const finalConfidence = Math.min(confidence * volatilityFactor * momentumFactor, 1);

    return {
      side,
      size: Math.max(size, 0.01), // Minimum size
      confidence: finalConfidence,
      strategy: this.name,
      timestamp: Date.now(),
    };
  }

  private calculateVolatilityFactor(): number {
    if (this.returns.length < 5) return 1;

    // Calculate recent volatility
    const recentReturns = this.returns.slice(-5);
    const mean = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;
    const volatility = Math.sqrt(variance);

    // Higher volatility increases confidence in mean reversion
    return Math.min(1 + volatility * 10, 2);
  }

  private calculateMomentumFactor(): number {
    if (this.returns.length < 3) return 1;

    // Check if recent returns show momentum that supports mean reversion
    const recentReturns = this.returns.slice(-3);
    const momentum = recentReturns.reduce((sum, ret) => sum + ret, 0);
    
    // If momentum is strong in one direction, mean reversion is more likely
    return Math.min(1 + Math.abs(momentum) * 5, 1.5);
  }

  public getStatus(): any {
    const zScore = this.returns.length >= this.window ? this.calculateZScore() : null;
    const mean = this.returns.length > 0 ? this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length : null;
    const volatility = this.calculateVolatility();

    return {
      name: this.name,
      window: this.window,
      threshold: this.threshold,
      zScore,
      mean,
      volatility,
      dataPoints: this.returns.length,
    };
  }

  private calculateVolatility(): number {
    if (this.returns.length < 2) return 0;

    const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / this.returns.length;
    return Math.sqrt(variance);
  }

  public reset(): void {
    this.returns = [];
    this.lastSignalTime = 0;
  }
}
