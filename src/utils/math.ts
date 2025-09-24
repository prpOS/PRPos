/**
 * Mathematical utilities for trading calculations
 */

export class MathUtils {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  public static sma(values: number[], period: number): number[] {
    if (values.length < period) return [];
    
    const result: number[] = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    
    return result;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  public static ema(values: number[], period: number): number[] {
    if (values.length < period) return [];
    
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is the SMA of the first period values
    const firstSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(firstSMA);
    
    for (let i = period; i < values.length; i++) {
      const ema = (values[i] * multiplier) + (result[result.length - 1] * (1 - multiplier));
      result.push(ema);
    }
    
    return result;
  }

  /**
   * Calculate Standard Deviation
   */
  public static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate Z-Score
   */
  public static zScore(value: number, values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.standardDeviation(values);
    
    if (stdDev === 0) return 0;
    
    return (value - mean) / stdDev;
  }

  /**
   * Calculate Sharpe Ratio
   */
  public static sharpeRatio(returns: number[], riskFreeRate: number = 0): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const excessReturn = meanReturn - riskFreeRate;
    const volatility = this.standardDeviation(returns);
    
    if (volatility === 0) return 0;
    
    return excessReturn / volatility;
  }

  /**
   * Calculate Maximum Drawdown
   */
  public static maxDrawdown(values: number[]): number {
    if (values.length === 0) return 0;
    
    let peak = values[0];
    let maxDrawdown = 0;
    
    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate Win Rate
   */
  public static winRate(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const winningTrades = returns.filter(r => r > 0).length;
    return winningTrades / returns.length;
  }

  /**
   * Calculate Profit Factor
   */
  public static profitFactor(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalWins = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const totalLosses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    
    if (totalLosses === 0) return totalWins > 0 ? Infinity : 0;
    
    return totalWins / totalLosses;
  }

  /**
   * Calculate Average Win
   */
  public static averageWin(returns: number[]): number {
    const wins = returns.filter(r => r > 0);
    if (wins.length === 0) return 0;
    
    return wins.reduce((a, b) => a + b, 0) / wins.length;
  }

  /**
   * Calculate Average Loss
   */
  public static averageLoss(returns: number[]): number {
    const losses = returns.filter(r => r < 0);
    if (losses.length === 0) return 0;
    
    return losses.reduce((a, b) => a + b, 0) / losses.length;
  }

  /**
   * Calculate Correlation Coefficient
   */
  public static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  public static rsi(values: number[], period: number = 14): number[] {
    if (values.length < period + 1) return [];
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const result: number[] = [];
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }

  /**
   * Calculate Bollinger Bands
   */
  public static bollingerBands(values: number[], period: number = 20, stdDev: number = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const sma = this.sma(values, period);
    const result = {
      upper: [] as number[],
      middle: sma,
      lower: [] as number[],
    };
    
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      result.upper.push(mean + (stdDev * standardDeviation));
      result.lower.push(mean - (stdDev * standardDeviation));
    }
    
    return result;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  public static macd(values: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    const fastEMA = this.ema(values, fastPeriod);
    const slowEMA = this.ema(values, slowPeriod);
    
    const macd: number[] = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macd.push(fastEMA[i] - slowEMA[i]);
    }
    
    const signal = this.ema(macd, signalPeriod);
    const histogram: number[] = [];
    
    for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
      histogram.push(macd[i] - signal[i]);
    }
    
    return { macd, signal, histogram };
  }

  /**
   * Round to specified decimal places
   */
  public static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Calculate percentage change
   */
  public static percentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  public static cagr(initialValue: number, finalValue: number, years: number): number {
    if (initialValue <= 0 || years <= 0) return 0;
    return Math.pow(finalValue / initialValue, 1 / years) - 1;
  }
}
