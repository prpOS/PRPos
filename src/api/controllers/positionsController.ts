import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../services/db';
import { Validators } from '../../utils/validators';

export const positionsController = {
  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, status, side, strategy } = req.query;
      
      const filter: any = {};
      if (status) filter.status = status;
      if (side) filter.side = side;
      if (strategy) filter.strategy = strategy;
      
      const positions = await db.getPositions(filter);
      const paginatedPositions = positions.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({
        success: true,
        data: paginatedPositions,
        pagination: {
          total: positions.length,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < positions.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching positions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getPosition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Position ID is required',
        });
        return;
      }
      
      const positions = await db.getPositions({ id });
      const position = positions[0];
      
      if (!position) {
        res.status(404).json({
          success: false,
          error: 'Position not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: position,
      });
    } catch (error) {
      logger.error('Error fetching position:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch position',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async createPosition(req: Request, res: Response): Promise<void> {
    try {
      const positionData = req.body;
      
      // Validate position data
      const validation = Validators.validatePosition(positionData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid position data',
          details: validation.errors,
        });
        return;
      }
      
      // Create position
      const position = await db.storePosition({
        side: positionData.side,
        size: positionData.size,
        entryPrice: positionData.entryPrice,
        markPrice: positionData.markPrice || positionData.entryPrice,
        leverage: positionData.leverage || 1,
        margin: positionData.margin || 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        status: 'open',
        timestamp: new Date(),
        strategy: positionData.strategy || 'manual',
      });
      
      res.status(201).json({
        success: true,
        data: position,
        message: 'Position created successfully',
      });
    } catch (error) {
      logger.error('Error creating position:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create position',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async updatePosition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Position ID is required',
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
      
      if (updates.entryPrice && !Validators.validatePrice(updates.entryPrice).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid entry price value',
        });
        return;
      }
      
      if (updates.markPrice && !Validators.validatePrice(updates.markPrice).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid mark price value',
        });
        return;
      }
      
      if (updates.leverage && !Validators.validateLeverage(updates.leverage).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid leverage value',
        });
        return;
      }
      
      // Update position
      const updatedPosition = await db.updatePosition(id, updates);
      
      if (!updatedPosition) {
        res.status(404).json({
          success: false,
          error: 'Position not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedPosition,
        message: 'Position updated successfully',
      });
    } catch (error) {
      logger.error('Error updating position:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update position',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async closePosition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { closePrice, reason } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Position ID is required',
        });
        return;
      }
      
      if (closePrice && !Validators.validatePrice(closePrice).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid close price value',
        });
        return;
      }
      
      // Close position
      const updatedPosition = await db.updatePosition(id, {
        status: 'closed',
        closePrice: closePrice,
        closeTimestamp: new Date(),
        closeReason: reason || 'manual_close',
      });
      
      if (!updatedPosition) {
        res.status(404).json({
          success: false,
          error: 'Position not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedPosition,
        message: 'Position closed successfully',
      });
    } catch (error) {
      logger.error('Error closing position:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close position',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
