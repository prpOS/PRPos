#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Bot } from '../core/bot';
import { APIServer } from '../api/server';
import { db } from '../services/db';
import { MetricsService } from '../services/metrics';
import { SerializerService } from '../services/serializer';
import { NotifierService } from '../services/notifier';
import { TelegramBot } from '../integrations/telegram';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('prpos')
  .description('PRPos — The Perp Positioning System')
  .version('0.1.1');

// Start command
program
  .command('start')
  .description('Start the PRPos trading bot')
  .option('-p, --port <port>', 'API server port', '3000')
  .option('--no-api', 'Disable API server')
  .option('--no-telegram', 'Disable Telegram bot')
  .action(async (options) => {
    try {
      logger.info('Starting PRPos Bot...');
      
      // Initialize database
      await db.connect();
      logger.info('Database connected');
      
      // Initialize bot
      const bot = new Bot(config);
      await bot.start();
      logger.info('Trading bot started');
      
      // Start API server if enabled
      if (!options.noApi) {
        const apiServer = new APIServer();
        apiServer.start();
        logger.info(`API server started on port ${options.port}`);
      }
      
      // Start Telegram bot if enabled
      if (!options.noTelegram && config.telegramBotToken) {
        const telegramBot = new TelegramBot(config);
        await telegramBot.start();
        logger.info('Telegram bot started');
      }
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        logger.info('Shutting down...');
        await bot.stop();
        await db.disconnect();
        process.exit(0);
      });
      
      logger.info('PRPos Bot is running!');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  });

// Telegram bot only
program
  .command('telebot')
  .description('Start only the Telegram bot')
  .action(async () => {
    try {
      if (!config.telegramBotToken) {
        logger.error('Telegram bot token not configured');
        process.exit(1);
      }
      
      await db.connect();
      const telegramBot = new TelegramBot(config);
      await telegramBot.start();
      
      logger.info('Telegram bot started');
      
      process.on('SIGINT', async () => {
        logger.info('Shutting down Telegram bot...');
        await telegramBot.stop();
        await db.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Failed to start Telegram bot:', error);
      process.exit(1);
    }
  });

// Backtest command
program
  .command('backtest')
  .description('Run backtest on historical data')
  .option('-c, --csv <path>', 'CSV file path with historical data')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      logger.info('Starting backtest...');
      
      await db.connect();
      
      // Load historical data
      let data;
      if (options.csv) {
        data = await loadCSVData(options.csv);
      } else {
        data = await loadHistoricalData(options.start, options.end);
      }
      
      if (!data || data.length === 0) {
        logger.error('No historical data found');
        process.exit(1);
      }
      
      logger.info(`Loaded ${data.length} data points`);
      
      // Run backtest
      const results = await runBacktest(data);
      
      // Save results
      const outputPath = options.output || 'backtest_results.json';
      const serializer = new SerializerService();
      const resultsJson = serializer.serialize(results, 'backtest_results');
      
      fs.writeFileSync(outputPath, resultsJson);
      logger.info(`Backtest results saved to ${outputPath}`);
      
      // Print summary
      printBacktestSummary(results);
      
      await db.disconnect();
    } catch (error) {
      logger.error('Backtest failed:', error);
      process.exit(1);
    }
  });

// Seed database
program
  .command('seed')
  .description('Seed the database with sample data')
  .action(async () => {
    try {
      logger.info('Seeding database...');
      
      await db.connect();
      
      // Run seed script
      const { exec } = require('child_process');
      exec('npx ts-node prisma/seed.ts', (error: any, stdout: string, stderr: string) => {
        if (error) {
          logger.error('Seed failed:', error);
          process.exit(1);
        }
        
        logger.info('Database seeded successfully');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Seed failed:', error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show current bot statistics')
  .action(async () => {
    try {
      await db.connect();
      
      const metricsService = new MetricsService();
      const performanceMetrics = await metricsService.getPerformanceMetrics();
      
      console.log('\n=== PRPos Bot Statistics ===\n');
      console.log(`Total Return: ${(performanceMetrics.totalReturn * 100).toFixed(2)}%`);
      console.log(`Win Rate: ${(performanceMetrics.winRate * 100).toFixed(2)}%`);
      console.log(`Sharpe Ratio: ${performanceMetrics.sharpeRatio.toFixed(2)}`);
      console.log(`Max Drawdown: ${(performanceMetrics.maxDrawdown * 100).toFixed(2)}%`);
      console.log(`Total Trades: ${performanceMetrics.totalTrades}`);
      console.log(`Winning Trades: ${performanceMetrics.winningTrades}`);
      console.log(`Losing Trades: ${performanceMetrics.losingTrades}`);
      console.log(`Average Win: ${performanceMetrics.averageWin.toFixed(4)}`);
      console.log(`Average Loss: ${performanceMetrics.averageLoss.toFixed(4)}`);
      console.log(`Profit Factor: ${performanceMetrics.profitFactor.toFixed(2)}\n`);
      
      await db.disconnect();
    } catch (error) {
      logger.error('Failed to get stats:', error);
      process.exit(1);
    }
  });

// Export data command
program
  .command('export')
  .description('Export bot data')
  .option('-t, --type <type>', 'Data type (trades, positions, metrics)', 'trades')
  .option('-f, --format <format>', 'Export format (json, csv)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      await db.connect();
      
      let data;
      switch (options.type) {
        case 'trades':
          data = await db.getTrades();
          break;
        case 'positions':
          data = await db.getPositions();
          break;
        case 'metrics':
          const metricsService = new MetricsService();
          data = await metricsService.getPerformanceMetrics();
          break;
        default:
          logger.error('Invalid data type');
          process.exit(1);
      }
      
      const serializer = new SerializerService();
      const outputPath = options.output || `export_${options.type}.${options.format}`;
      
      if (options.format === 'csv') {
        const csv = serializer.exportToCSV(data, outputPath);
        fs.writeFileSync(outputPath, csv);
      } else {
        const json = serializer.serialize(data, options.type);
        fs.writeFileSync(outputPath, json);
      }
      
      logger.info(`Data exported to ${outputPath}`);
      await db.disconnect();
    } catch (error) {
      logger.error('Export failed:', error);
      process.exit(1);
    }
  });

// Helper functions
async function loadCSVData(filePath: string): Promise<any[]> {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const row: any = {};
        
        for (let j = 0; j < headers.length; j++) {
          row[headers[j].trim()] = values[j]?.trim();
        }
        
        data.push(row);
      }
    }
    
    return data;
  } catch (error) {
    logger.error('Failed to load CSV data:', error);
    return [];
  }
}

async function loadHistoricalData(startDate?: string, endDate?: string): Promise<any[]> {
  try {
    const priceTicks = await db.getPriceTicks(1000);
    return priceTicks.map(tick => ({
      timestamp: tick.timestamp,
      price: tick.price,
      volume: tick.volume,
    }));
  } catch (error) {
    logger.error('Failed to load historical data:', error);
    return [];
  }
}

async function runBacktest(data: any[]): Promise<any> {
  // Simplified backtest implementation
  const results = {
    startDate: data[0]?.timestamp,
    endDate: data[data.length - 1]?.timestamp,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalReturn: 0,
    maxDrawdown: 0,
    trades: [],
  };
  
  // This would contain the actual backtest logic
  // For now, return mock results
  return results;
}

function printBacktestSummary(results: any): void {
  console.log('\n=== Backtest Results ===\n');
  console.log(`Period: ${results.startDate} to ${results.endDate}`);
  console.log(`Total Trades: ${results.totalTrades}`);
  console.log(`Winning Trades: ${results.winningTrades}`);
  console.log(`Losing Trades: ${results.losingTrades}`);
  console.log(`Total Return: ${(results.totalReturn * 100).toFixed(2)}%`);
  console.log(`Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%\n`);
}

// Parse command line arguments
program.parse();
