import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { PriceFeed } from './priceFeed';
import { SMAStrategy } from './strategy/smaStrategy';
import { MeanReversionStrategy } from './strategy/meanReversionStrategy';
import { RiskManager } from './riskManager';
import { TradeExecutor } from './tradeExecutor';
import { Portfolio } from './portfolio';
import { Config } from '../config';
import { db } from '../services/db';

export class Bot extends EventEmitter {
  private priceFeed: PriceFeed;
  private strategies: Array<SMAStrategy | MeanReversionStrategy>;
  private riskManager: RiskManager;
  private tradeExecutor: TradeExecutor;
  private portfolio: Portfolio;
  private isRunning: boolean = false;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
    
    // Initialize components
    this.priceFeed = new PriceFeed(config);
    this.riskManager = new RiskManager(config);
    this.portfolio = new Portfolio();
    this.tradeExecutor = new TradeExecutor(this.riskManager, this.portfolio, config);
    
    // Initialize strategies
    this.strategies = [
      new SMAStrategy(config.smaShortWindow, config.smaLongWindow),
      new MeanReversionStrategy(config.meanReversionWindow, config.meanReversionThreshold),
    ];

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Price feed events
    this.priceFeed.on('tick', this.handlePriceTick.bind(this));
    this.priceFeed.on('error', this.handlePriceFeedError.bind(this));

    // Trade executor events
    this.tradeExecutor.on('positionOpened', this.handlePositionOpened.bind(this));
    this.tradeExecutor.on('positionClosed', this.handlePositionClosed.bind(this));
    this.tradeExecutor.on('tradeExecuted', this.handleTradeExecuted.bind(this));
    this.tradeExecutor.on('error', this.handleTradeError.bind(this));
  }

  private async handlePriceTick(tick: { timestamp: number; price: number; volume: number }): Promise<void> {
    try {
      // Update portfolio with latest price
      await this.portfolio.updateMarkPrice(tick.price);

      // Check existing positions for risk management
      await this.checkExistingPositions(tick.price);

      // Run strategies to generate signals
      for (const strategy of this.strategies) {
        const signal = strategy.generateSignal(tick);
        if (signal) {
          await this.handleStrategySignal(signal, tick.price);
        }
      }

      // Store price tick in database
      await db.storePriceTick({
        timestamp: new Date(tick.timestamp),
        price: tick.price,
        volume: tick.volume,
      });
    } catch (error) {
      logger.error('Error handling price tick:', error);
    }
  }

  private async checkExistingPositions(markPrice: number): Promise<void> {
    const positions = this.portfolio.getOpenPositions();
    
    for (const position of positions) {
      const riskAssessment = this.riskManager.evaluatePosition(position, markPrice);
      
      if (riskAssessment.shouldClose) {
        logger.warn(`Emergency closing position ${position.id} due to risk: ${riskAssessment.reason}`);
        await this.tradeExecutor.closePosition(position.id, 'risk_management');
      }
    }
  }

  private async handleStrategySignal(signal: any, currentPrice: number): Promise<void> {
    try {
      // Check if we can open a new position
      const canOpen = this.riskManager.canOpenPosition(
        this.portfolio.getAccount(),
        signal.size,
        currentPrice
      );

      if (!canOpen.allowed) {
        logger.warn(`Cannot open position: ${canOpen.reason}`);
        return;
      }

      // Execute the trade
      await this.tradeExecutor.executeTrade({
        side: signal.side,
        size: signal.size,
        price: currentPrice,
        type: 'market',
        strategy: signal.strategy,
      });
    } catch (error) {
      logger.error('Error handling strategy signal:', error);
    }
  }

  private handlePriceFeedError(error: Error): void {
    logger.error('Price feed error:', error);
    this.emit('error', error);
  }

  private handlePositionOpened(position: any): void {
    logger.info(`Position opened: ${position.id}`);
    this.emit('positionOpened', position);
  }

  private handlePositionClosed(position: any): void {
    logger.info(`Position closed: ${position.id}`);
    this.emit('positionClosed', position);
  }

  private handleTradeExecuted(trade: any): void {
    logger.info(`Trade executed: ${trade.id}`);
    this.emit('tradeExecuted', trade);
  }

  private handleTradeError(error: Error): void {
    logger.error('Trade execution error:', error);
    this.emit('error', error);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    try {
      logger.info('Starting PRPos Bot...');
      
      // Start price feed
      await this.priceFeed.start();
      logger.info('Price feed started');

      // Initialize portfolio from database
      await this.portfolio.loadFromDatabase();
      logger.info('Portfolio loaded from database');

      this.isRunning = true;
      logger.info('PRPos Bot started successfully');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Bot is not running');
      return;
    }

    try {
      logger.info('Stopping PRPos Bot...');
      
      // Stop price feed
      await this.priceFeed.stop();
      logger.info('Price feed stopped');

      // Close all open positions if configured to do so
      if (this.config.nodeEnv === 'production') {
        await this.closeAllPositions();
      }

      this.isRunning = false;
      logger.info('PRPos Bot stopped successfully');
    } catch (error) {
      logger.error('Error stopping bot:', error);
      throw error;
    }
  }

  private async closeAllPositions(): Promise<void> {
    const positions = this.portfolio.getOpenPositions();
    logger.info(`Closing ${positions.length} open positions...`);
    
    for (const position of positions) {
      try {
        await this.tradeExecutor.closePosition(position.id, 'bot_shutdown');
      } catch (error) {
        logger.error(`Failed to close position ${position.id}:`, error);
      }
    }
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      portfolio: this.portfolio.getSummary(),
      strategies: this.strategies.map(s => s.getStatus()),
      riskManager: this.riskManager.getStatus(),
    };
  }
}
