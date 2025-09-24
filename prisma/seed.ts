import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting database seed...');

    // Create default account
    const account = await prisma.account.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        balance: 10000,
        margin: 0,
        leverage: 0,
      },
    });

    logger.info(`Account created: ${account.id}`);

    // Create strategy configurations
    const smaStrategy = await prisma.strategyConfig.upsert({
      where: { name: 'SMA Strategy' },
      update: {},
      create: {
        name: 'SMA Strategy',
        type: 'sma',
        parameters: JSON.stringify({
          shortWindow: 9,
          longWindow: 21,
          signalCooldown: 30000,
        }),
        isActive: true,
      },
    });

    const meanReversionStrategy = await prisma.strategyConfig.upsert({
      where: { name: 'Mean Reversion Strategy' },
      update: {},
      create: {
        name: 'Mean Reversion Strategy',
        type: 'mean_reversion',
        parameters: JSON.stringify({
          window: 20,
          threshold: 2.0,
          signalCooldown: 60000,
        }),
        isActive: true,
      },
    });

    logger.info(`Strategy configs created: ${smaStrategy.name}, ${meanReversionStrategy.name}`);

    // Create sample price ticks
    const priceTicks = [];
    const basePrice = 100;
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (100 - i) * 60000); // 1 minute intervals
      const price = basePrice + (Math.random() - 0.5) * 2; // ±1% variation
      const volume = Math.random() * 1000 + 100;
      
      priceTicks.push({
        timestamp,
        price,
        volume,
      });
    }

    await prisma.priceTick.createMany({
      data: priceTicks,
    });

    logger.info(`Created ${priceTicks.length} price ticks`);

    // Create sample trades
    const sampleTrades = [
      {
        side: 'long',
        size: 0.1,
        price: 99.5,
        fees: 0.1,
        timestamp: new Date(now.getTime() - 3600000), // 1 hour ago
        status: 'filled',
        strategy: 'SMA Strategy',
        realizedPnl: 0.05,
        returnPercent: 0.5,
      },
      {
        side: 'short',
        size: 0.15,
        price: 100.2,
        fees: 0.15,
        timestamp: new Date(now.getTime() - 1800000), // 30 minutes ago
        status: 'filled',
        strategy: 'Mean Reversion Strategy',
        realizedPnl: -0.03,
        returnPercent: -0.2,
      },
      {
        side: 'long',
        size: 0.2,
        price: 99.8,
        fees: 0.2,
        timestamp: new Date(now.getTime() - 900000), // 15 minutes ago
        status: 'filled',
        strategy: 'SMA Strategy',
        realizedPnl: 0.12,
        returnPercent: 0.6,
      },
    ];

    for (const trade of sampleTrades) {
      await prisma.trade.create({
        data: trade,
      });
    }

    logger.info(`Created ${sampleTrades.length} sample trades`);

    // Create sample positions
    const samplePositions = [
      {
        side: 'long',
        size: 0.25,
        entryPrice: 99.8,
        markPrice: 100.1,
        leverage: 5,
        margin: 50,
        unrealizedPnl: 0.075,
        realizedPnl: 0,
        status: 'open',
        timestamp: new Date(now.getTime() - 300000), // 5 minutes ago
        strategy: 'SMA Strategy',
      },
      {
        side: 'short',
        size: 0.3,
        entryPrice: 100.5,
        markPrice: 100.2,
        leverage: 3,
        margin: 100,
        unrealizedPnl: 0.09,
        realizedPnl: 0,
        status: 'open',
        timestamp: new Date(now.getTime() - 600000), // 10 minutes ago
        strategy: 'Mean Reversion Strategy',
      },
    ];

    for (const position of samplePositions) {
      await prisma.position.create({
        data: position,
      });
    }

    logger.info(`Created ${samplePositions.length} sample positions`);

    // Create sample orders
    const sampleOrders = [
      {
        side: 'long',
        size: 0.1,
        price: 99.9,
        type: 'market',
        status: 'filled',
        filledSize: 0.1,
        avgPrice: 99.9,
        fees: 0.1,
        timestamp: new Date(now.getTime() - 120000), // 2 minutes ago
        strategy: 'SMA Strategy',
      },
      {
        side: 'short',
        size: 0.2,
        price: 100.3,
        type: 'limit',
        status: 'pending',
        filledSize: 0,
        fees: 0,
        timestamp: new Date(now.getTime() - 60000), // 1 minute ago
        strategy: 'Mean Reversion Strategy',
      },
    ];

    for (const order of sampleOrders) {
      await prisma.order.create({
        data: order,
      });
    }

    logger.info(`Created ${sampleOrders.length} sample orders`);

    // Create sample metrics
    const sampleMetrics = [
      {
        type: 'cumulative_pnl',
        value: 0.15,
        label: 'Total PnL',
        timestamp: new Date(now.getTime() - 300000),
      },
      {
        type: 'win_rate',
        value: 0.67,
        label: 'Win Rate',
        timestamp: new Date(now.getTime() - 300000),
      },
      {
        type: 'sharpe_ratio',
        value: 1.2,
        label: 'Sharpe Ratio',
        timestamp: new Date(now.getTime() - 300000),
      },
    ];

    for (const metric of sampleMetrics) {
      await prisma.metric.create({
        data: metric,
      });
    }

    logger.info(`Created ${sampleMetrics.length} sample metrics`);

    // Create bot configurations
    const botConfigs = [
      {
        key: 'max_leverage',
        value: '10',
        type: 'number',
      },
      {
        key: 'risk_per_trade',
        value: '0.02',
        type: 'number',
      },
      {
        key: 'stop_loss_percentage',
        value: '0.05',
        type: 'number',
      },
      {
        key: 'take_profit_percentage',
        value: '0.1',
        type: 'number',
      },
      {
        key: 'simulation_mode',
        value: 'true',
        type: 'boolean',
      },
    ];

    for (const config of botConfigs) {
      await prisma.botConfig.upsert({
        where: { key: config.key },
        update: { value: config.value, type: config.type },
        create: config,
      });
    }

    logger.info(`Created ${botConfigs.length} bot configurations`);

    // Create sample notifications
    const sampleNotifications = [
      {
        type: 'trade',
        title: 'Trade Executed',
        message: 'LONG 0.1 @ 99.9',
        data: JSON.stringify({ tradeId: 'trade_1', side: 'long', size: 0.1, price: 99.9 }),
        timestamp: new Date(now.getTime() - 120000),
      },
      {
        type: 'position',
        title: 'Position Opened',
        message: 'LONG position opened at 99.8',
        data: JSON.stringify({ positionId: 'pos_1', side: 'long', size: 0.25, entryPrice: 99.8 }),
        timestamp: new Date(now.getTime() - 300000),
      },
      {
        type: 'alert',
        title: 'Risk Alert',
        message: 'High volatility detected',
        data: JSON.stringify({ volatility: 0.15, threshold: 0.1 }),
        timestamp: new Date(now.getTime() - 600000),
      },
    ];

    for (const notification of sampleNotifications) {
      await prisma.notification.create({
        data: notification,
      });
    }

    logger.info(`Created ${sampleNotifications.length} sample notifications`);

    logger.info('Database seed completed successfully!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
