import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from '../utils/logger';
import { config } from '../config';
import { routes } from './routes';

export class APIServer {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.http(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // API authentication middleware
    this.app.use('/api', (req, res, next) => {
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!authToken || authToken !== config.apiAuthToken) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing API token',
        });
      }
      
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // API routes
    this.app.use('/api', routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('API Error:', error);
      
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      
      res.status(status).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`API server running on port ${this.port}`);
      logger.info(`Health check: http://localhost:${this.port}/health`);
      logger.info(`API docs: http://localhost:${this.port}/api/docs`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
