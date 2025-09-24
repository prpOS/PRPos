import { Router } from 'express';
import { tradesController } from './controllers/tradesController';
import { positionsController } from './controllers/positionsController';
import { metricsController } from './controllers/metricsController';
import { settingsController } from './controllers/settingsController';

const router = Router();

// Trades routes
router.get('/trades', tradesController.getTrades);
router.get('/trades/:id', tradesController.getTrade);
router.post('/trades', tradesController.createTrade);
router.put('/trades/:id', tradesController.updateTrade);
router.delete('/trades/:id', tradesController.cancelTrade);

// Positions routes
router.get('/positions', positionsController.getPositions);
router.get('/positions/:id', positionsController.getPosition);
router.post('/positions', positionsController.createPosition);
router.put('/positions/:id', positionsController.updatePosition);
router.delete('/positions/:id', positionsController.closePosition);

// Metrics routes
router.get('/metrics', metricsController.getMetrics);
router.get('/metrics/performance', metricsController.getPerformanceMetrics);
router.get('/metrics/chart/:type', metricsController.getChartData);

// Settings routes
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);
router.get('/settings/strategies', settingsController.getStrategies);
router.put('/settings/strategies/:id', settingsController.updateStrategy);

// Bot status routes
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'PRPos Bot API',
    version: '1.0.0',
    description: 'API for PRPos trading bot',
    endpoints: {
      trades: {
        'GET /api/trades': 'Get all trades',
        'GET /api/trades/:id': 'Get specific trade',
        'POST /api/trades': 'Create new trade',
        'PUT /api/trades/:id': 'Update trade',
        'DELETE /api/trades/:id': 'Cancel trade',
      },
      positions: {
        'GET /api/positions': 'Get all positions',
        'GET /api/positions/:id': 'Get specific position',
        'POST /api/positions': 'Create new position',
        'PUT /api/positions/:id': 'Update position',
        'DELETE /api/positions/:id': 'Close position',
      },
      metrics: {
        'GET /api/metrics': 'Get basic metrics',
        'GET /api/metrics/performance': 'Get performance metrics',
        'GET /api/metrics/chart/:type': 'Get chart data',
      },
      settings: {
        'GET /api/settings': 'Get bot settings',
        'PUT /api/settings': 'Update bot settings',
        'GET /api/settings/strategies': 'Get strategy configurations',
        'PUT /api/settings/strategies/:id': 'Update strategy configuration',
      },
    },
  });
});

export { router as routes };
