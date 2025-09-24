import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { MetricsService } from '../../services/metrics';

const metricsService = new MetricsService();

export const metricsController = {
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { type, limit = 100 } = req.query;
      
      let metrics;
      if (type) {
        metrics = metricsService.getMetrics(type as string, Number(limit));
      } else {
        // Get all metrics
        const types = ['cumulative_pnl', 'returns', 'volatility', 'sharpe_ratio'];
        metrics = {};
        for (const metricType of types) {
          metrics[metricType] = metricsService.getMetrics(metricType, Number(limit));
        }
      }
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error fetching performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getChartData(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { limit = 100 } = req.query;
      
      if (!type) {
        res.status(400).json({
          success: false,
          error: 'Chart type is required',
        });
        return;
      }
      
      const chartData = metricsService.getChartData(type, Number(limit));
      
      res.json({
        success: true,
        data: chartData,
      });
    } catch (error) {
      logger.error('Error fetching chart data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chart data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
