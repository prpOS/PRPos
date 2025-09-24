import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { Bot } from './core/bot';
import { config } from './config';
import { db } from './services/db';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('Starting PRPos Bot...');
    
    // Initialize database connection
    await db.connect();
    logger.info('Database connected successfully');

    // Initialize and start the trading bot
    const bot = new Bot(config);
    await bot.start();

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await bot.stop();
      await db.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      await db.disconnect();
      process.exit(0);
    });

    logger.info('PRPos Bot started successfully');
  } catch (error) {
    logger.error('Failed to start PRPos Bot:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
