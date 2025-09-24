import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../services/db';
import { Validators } from '../../utils/validators';

export const tradesController = {
  async getTrades(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, status, side, strategy } = req.query;
      
      const filter: any = {};
      if (status) filter.status = status;
      if (side) filter.side = side;
      if (strategy) filter.strategy = strategy;
      
      const trades = await db.getTrades(filter);
      const paginatedTrades = trades.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({
        success: true,
        data: paginatedTrades,
        pagination: {
          total: trades.length,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < trades.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching trades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trades',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Trade ID is required',
        });
        return;
      }
      
      const trades = await db.getTrades({ id });
      const trade = trades[0];
      
      if (!trade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: trade,
      });
    } catch (error) {
      logger.error('Error fetching trade:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trade',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async createTrade(req: Request, res: Response): Promise<void> {
    try {
      const tradeData = req.body;
      
      // Validate trade data
      const validation = Validators.validateTradeRequest(tradeData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid trade data',
          details: validation.errors,
        });
        return;
      }
      
      // Create trade
      const trade = await db.storeTrade({
        side: tradeData.side,
        size: tradeData.size,
        price: tradeData.price,
        type: tradeData.type,
        status: 'pending',
        strategy: tradeData.strategy || 'manual',
        timestamp: new Date(),
      });
      
      res.status(201).json({
        success: true,
        data: trade,
        message: 'Trade created successfully',
      });
    } catch (error) {
      logger.error('Error creating trade:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create trade',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async updateTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Trade ID is required',
        });
        return;
      }
      
      // Validate updates
      if (updates.side && !Validators.validateSide(updates.side).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid side value',
        });
        return;
      }
      
      if (updates.size && !Validators.validateSize(updates.size).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid size value',
        });
        return;
      }
      
      if (updates.price && !Validators.validatePrice(updates.price).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid price value',
        });
        return;
      }
      
      // Update trade
      const updatedTrade = await db.updateOrder(id, updates);
      
      if (!updatedTrade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedTrade,
        message: 'Trade updated successfully',
      });
    } catch (error) {
      logger.error('Error updating trade:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update trade',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async cancelTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Trade ID is required',
        });
        return;
      }
      
      // Cancel trade
      const updatedTrade = await db.updateOrder(id, { status: 'cancelled' });
      
      if (!updatedTrade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedTrade,
        message: 'Trade cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling trade:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel trade',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
