import request from 'supertest';
import { APIServer } from '../src/api/server';

describe('API Tests', () => {
  let app: any;

  beforeAll(() => {
    const apiServer = new APIServer();
    app = apiServer.getApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await request(app)
        .get('/api/trades')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject requests with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/trades')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Trades API', () => {
    const validToken = 'replace_with_token';

    it('should get trades with valid auth', async () => {
      const response = await request(app)
        .get('/api/trades')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should create trade with valid data', async () => {
      const tradeData = {
        side: 'long',
        size: 0.1,
        price: 100,
        type: 'market',
        strategy: 'test',
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${validToken}`)
        .send(tradeData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('side', 'long');
    });

    it('should reject trade with invalid data', async () => {
      const invalidTradeData = {
        side: 'invalid',
        size: -1,
        price: 0,
      };

      const response = await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidTradeData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Positions API', () => {
    const validToken = 'replace_with_token';

    it('should get positions with valid auth', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should create position with valid data', async () => {
      const positionData = {
        side: 'long',
        size: 0.1,
        entryPrice: 100,
        markPrice: 100,
        leverage: 1,
        margin: 10,
        strategy: 'test',
      };

      const response = await request(app)
        .post('/api/positions')
        .set('Authorization', `Bearer ${validToken}`)
        .send(positionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('side', 'long');
    });
  });

  describe('Metrics API', () => {
    const validToken = 'replace_with_token';

    it('should get metrics with valid auth', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/performance')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should get chart data', async () => {
      const response = await request(app)
        .get('/api/metrics/chart/cumulative_pnl')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Settings API', () => {
    const validToken = 'replace_with_token';

    it('should get settings with valid auth', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should update settings with valid data', async () => {
      const settingsData = {
        account: {
          balance: 10000,
          margin: 0,
          leverage: 0,
        },
      };

      const response = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send(settingsData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Status API', () => {
    const validToken = 'replace_with_token';

    it('should get bot status', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .set('Authorization', 'Bearer replace_with_token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
