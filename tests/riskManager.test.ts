import { RiskManager } from '../src/core/riskManager';
import { config } from '../src/config';

describe('RiskManager', () => {
  let riskManager: RiskManager;

  beforeEach(() => {
    riskManager = new RiskManager(config);
  });

  describe('canOpenPosition', () => {
    it('should allow valid position', () => {
      const account = {
        id: 'test',
        balance: 10000,
        margin: 0,
        leverage: 0,
        openPositions: 0,
      };

      const result = riskManager.canOpenPosition(account, 0.1, 100);

      expect(result.allowed).toBe(true);
    });

    it('should reject position with insufficient balance', () => {
      const account = {
        id: 'test',
        balance: 10, // Very low balance
        margin: 0,
        leverage: 0,
        openPositions: 0,
      };

      const result = riskManager.canOpenPosition(account, 100, 100);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient balance');
    });

    it('should reject position exceeding max leverage', () => {
      const account = {
        id: 'test',
        balance: 1000,
        margin: 0,
        leverage: 0,
        openPositions: 0,
      };

      const result = riskManager.canOpenPosition(account, 100, 100); // High leverage

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Leverage');
    });

    it('should reject position when max positions reached', () => {
      const account = {
        id: 'test',
        balance: 10000,
        margin: 0,
        leverage: 0,
        openPositions: 5, // Max positions
      };

      const result = riskManager.canOpenPosition(account, 0.1, 100);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum positions');
    });
  });

  describe('evaluatePosition', () => {
    it('should not close position under normal conditions', () => {
      const position = {
        id: 'pos_123',
        side: 'long' as const,
        size: 0.1,
        entryPrice: 100,
        markPrice: 105,
        leverage: 1,
        margin: 10,
        unrealizedPnl: 0.5,
        timestamp: Date.now(),
      };

      const result = riskManager.evaluatePosition(position, 105);

      expect(result.shouldClose).toBe(false);
    });

    it('should close position when liquidated', () => {
      const position = {
        id: 'pos_123',
        side: 'long' as const,
        size: 0.1,
        entryPrice: 100,
        markPrice: 50, // Very low price
        leverage: 10, // High leverage
        margin: 1,
        unrealizedPnl: -5,
        timestamp: Date.now(),
      };

      const result = riskManager.evaluatePosition(position, 50);

      expect(result.shouldClose).toBe(true);
      expect(result.reason).toContain('liquidated');
    });

    it('should close position on stop loss', () => {
      const position = {
        id: 'pos_123',
        side: 'long' as const,
        size: 0.1,
        entryPrice: 100,
        markPrice: 95, // 5% loss
        leverage: 1,
        margin: 10,
        unrealizedPnl: -0.5,
        timestamp: Date.now(),
      };

      const result = riskManager.evaluatePosition(position, 95);

      expect(result.shouldClose).toBe(true);
      expect(result.reason).toContain('Stop loss');
    });

    it('should close position on take profit', () => {
      const position = {
        id: 'pos_123',
        side: 'long' as const,
        size: 0.1,
        entryPrice: 100,
        markPrice: 110, // 10% gain
        leverage: 1,
        margin: 10,
        unrealizedPnl: 1,
        timestamp: Date.now(),
      };

      const result = riskManager.evaluatePosition(position, 110);

      expect(result.shouldClose).toBe(true);
      expect(result.reason).toContain('Take profit');
    });
  });

  describe('getStatus', () => {
    it('should return risk manager status', () => {
      const status = riskManager.getStatus();

      expect(status).toHaveProperty('maxLeverage');
      expect(status).toHaveProperty('riskPerTrade');
      expect(status).toHaveProperty('maxPositions');
      expect(status.maxLeverage).toBe(config.maxLeverage);
      expect(status.riskPerTrade).toBe(config.riskPerTrade);
    });
  });
});
