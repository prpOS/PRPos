import { TradeExecutor } from '../src/core/tradeExecutor';
import { RiskManager } from '../src/core/riskManager';
import { Portfolio } from '../src/core/portfolio';
import { config } from '../src/config';

// Mock dependencies
jest.mock('../src/services/db');
jest.mock('../src/dex/client');

describe('TradeExecutor', () => {
  let tradeExecutor: TradeExecutor;
  let riskManager: RiskManager;
  let portfolio: Portfolio;

  beforeEach(() => {
    riskManager = new RiskManager(config);
    portfolio = new Portfolio();
    tradeExecutor = new TradeExecutor(riskManager, portfolio, config);
  });

  describe('executeTrade', () => {
    it('should execute a valid trade', async () => {
      const tradeRequest = {
        side: 'long' as const,
        size: 0.1,
        price: 100,
        type: 'market' as const,
        strategy: 'test',
      };

      // Mock risk manager to allow trade
      jest.spyOn(riskManager, 'canOpenPosition').mockReturnValue({ allowed: true });

      // Mock DEX client
      const mockDEXClient = {
        placeOrder: jest.fn().mockResolvedValue({
          orderId: 'order_123',
          filledSize: 0.1,
          avgPrice: 100,
          fees: 0.1,
          status: 'filled',
        }),
      };

      // Mock database
      const mockDb = require('../src/services/db');
      mockDb.storeTrade = jest.fn().mockResolvedValue({});

      const result = await tradeExecutor.executeTrade(tradeRequest);

      expect(result).toBeDefined();
      expect(result?.side).toBe('long');
      expect(result?.size).toBe(0.1);
      expect(result?.price).toBe(100);
      expect(result?.status).toBe('filled');
    });

    it('should reject trade when risk manager denies', async () => {
      const tradeRequest = {
        side: 'long' as const,
        size: 1000, // Very large size
        price: 100,
        type: 'market' as const,
        strategy: 'test',
      };

      // Mock risk manager to deny trade
      jest.spyOn(riskManager, 'canOpenPosition').mockReturnValue({
        allowed: false,
        reason: 'Insufficient balance',
      });

      const result = await tradeExecutor.executeTrade(tradeRequest);

      expect(result).toBeNull();
    });

    it('should handle DEX client failure', async () => {
      const tradeRequest = {
        side: 'long' as const,
        size: 0.1,
        price: 100,
        type: 'market' as const,
        strategy: 'test',
      };

      // Mock risk manager to allow trade
      jest.spyOn(riskManager, 'canOpenPosition').mockReturnValue({ allowed: true });

      // Mock DEX client to fail
      const mockDEXClient = {
        placeOrder: jest.fn().mockResolvedValue(null),
      };

      const result = await tradeExecutor.executeTrade(tradeRequest);

      expect(result).toBeNull();
    });
  });

  describe('closePosition', () => {
    it('should close an existing position', async () => {
      const positionId = 'pos_123';
      
      // Mock portfolio to return position
      const mockPosition = {
        id: positionId,
        side: 'long' as const,
        size: 0.1,
        entryPrice: 100,
        markPrice: 105,
        leverage: 1,
        margin: 10,
        unrealizedPnl: 0.5,
        timestamp: Date.now(),
      };

      jest.spyOn(portfolio, 'getPosition').mockReturnValue(mockPosition);
      jest.spyOn(portfolio, 'closePosition').mockImplementation(() => {});

      // Mock database
      const mockDb = require('../src/services/db');
      mockDb.updatePosition = jest.fn().mockResolvedValue({});

      // Mock executeTrade for closing trade
      jest.spyOn(tradeExecutor, 'executeTrade').mockResolvedValue({
        id: 'trade_123',
        side: 'short' as const,
        size: 0.1,
        price: 105,
        fees: 0.1,
        timestamp: Date.now(),
        status: 'filled' as const,
      });

      const result = await tradeExecutor.closePosition(positionId, 'manual_close');

      expect(result).toBe(true);
      expect(mockDb.updatePosition).toHaveBeenCalledWith(positionId, expect.any(Object));
    });

    it('should return false for non-existent position', async () => {
      const positionId = 'non_existent';
      
      jest.spyOn(portfolio, 'getPosition').mockReturnValue(undefined);

      const result = await tradeExecutor.closePosition(positionId, 'manual_close');

      expect(result).toBe(false);
    });
  });
});
