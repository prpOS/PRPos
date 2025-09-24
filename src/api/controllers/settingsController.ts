import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../services/db';
import { Validators } from '../../utils/validators';

export const settingsController = {
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const account = await db.getAccount();
      const strategies = await db.getStrategyConfigs();
      
      res.json({
        success: true,
        data: {
          account,
          strategies,
        },
      });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { account, strategies } = req.body;
      
      // Update account settings
      if (account) {
        if (account.balance !== undefined && account.balance < 0) {
          res.status(400).json({
            success: false,
            error: 'Balance cannot be negative',
          });
          return;
        }
        
        if (account.leverage !== undefined && !Validators.validateLeverage(account.leverage).isValid) {
          res.status(400).json({
            success: false,
            error: 'Invalid leverage value',
          });
          return;
        }
        
        await db.updateAccount('default', account);
      }
      
      // Update strategy settings
      if (strategies && Array.isArray(strategies)) {
        for (const strategy of strategies) {
          if (strategy.id && strategy.parameters) {
            await db.updateStrategyConfig(strategy.id, {
              parameters: JSON.stringify(strategy.parameters),
              isActive: strategy.isActive,
            });
          }
        }
      }
      
      res.json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getStrategies(req: Request, res: Response): Promise<void> {
    try {
      const strategies = await db.getStrategyConfigs();
      
      res.json({
        success: true,
        data: strategies,
      });
    } catch (error) {
      logger.error('Error fetching strategies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch strategies',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async updateStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Strategy ID is required',
        });
        return;
      }
      
      // Validate strategy name
      if (updates.name && !Validators.validateStrategyName(updates.name).isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid strategy name',
        });
        return;
      }
      
      // Validate parameters if provided
      if (updates.parameters) {
        try {
          JSON.parse(updates.parameters);
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid parameters JSON',
          });
          return;
        }
      }
      
      // Update strategy
      const updatedStrategy = await db.updateStrategyConfig(id, updates);
      
      if (!updatedStrategy) {
        res.status(404).json({
          success: false,
          error: 'Strategy not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedStrategy,
        message: 'Strategy updated successfully',
      });
    } catch (error) {
      logger.error('Error updating strategy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update strategy',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
