# PRPos — The Perp Positioning System

[![CI/CD](https://github.com/prpos/prpos-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/prpos/prpos-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

**PRPos** is an autonomous perpetual trading bot for Solana that combines advanced technical analysis with robust risk management to execute profitable trading strategies.

## 🚀 Features

- **Multi-Strategy Support**: SMA crossover, mean reversion, and custom strategies
- **Real-time Risk Management**: Dynamic position sizing, stop-loss, and take-profit
- **Telegram Integration**: Monitor and control your bot via Telegram commands
- **Web Dashboard**: Beautiful React dashboard for monitoring performance
- **REST API**: Full programmatic access to all bot functions
- **Backtesting**: Test strategies on historical data
- **Docker Support**: Easy deployment with Docker Compose
- **Comprehensive Testing**: Unit, integration, and end-to-end tests

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Telegram Commands](#telegram-commands)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 🏃 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (optional)
- Solana RPC endpoint
- Telegram Bot Token (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prpos/prpos-bot.git
   cd prpos-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   npm run seed
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
| `MAX_LEVERAGE` | Maximum leverage allowed | `10` |
| `RISK_PER_TRADE` | Risk per trade (0.01 = 1%) | `0.02` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin user IDs | - |
| `API_AUTH_TOKEN` | API authentication token | `replace_with_token` |

### Strategy Configuration

```typescript
// SMA Strategy
{
  shortWindow: 9,    // Short SMA period
  longWindow: 21,     // Long SMA period
  signalCooldown: 30000  // Cooldown between signals (ms)
}

// Mean Reversion Strategy
{
  window: 20,        // Lookback period
  threshold: 2.0,    // Z-score threshold
  signalCooldown: 60000  // Cooldown between signals (ms)
}
```

## 🎯 Usage

### CLI Commands

```bash
# Start the trading bot
npx prpos start

# Start only Telegram bot
npx prpos telebot

# Run backtest on historical data
npx prpos backtest --csv data.csv --output results.json

# Seed database with sample data
npx prpos seed

# View current statistics
npx prpos stats

# Export trading data
npx prpos export --type trades --format csv
```

### API Endpoints

```bash
# Get bot status
curl -H "Authorization: Bearer your_token" http://localhost:3000/api/status

# Get recent trades
curl -H "Authorization: Bearer your_token" http://localhost:3000/api/trades

# Get open positions
curl -H "Authorization: Bearer your_token" http://localhost:3000/api/positions

# Get performance metrics
curl -H "Authorization: Bearer your_token" http://localhost:3000/api/metrics/performance
```

### Telegram Commands

```
/start - Initialize bot
/status - Get bot status
/positions - View open positions
/trades - View recent trades
/metrics - View performance metrics
/close <position_id> - Close a position
/download-logs - Download bot logs
/help - Show available commands
```

## 📊 API Documentation

### Authentication

All API requests require authentication via Bearer token:

```bash
Authorization: Bearer your_api_token
```

### Endpoints

#### Trades
- `GET /api/trades` - Get all trades
- `GET /api/trades/:id` - Get specific trade
- `POST /api/trades` - Create new trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Cancel trade

#### Positions
- `GET /api/positions` - Get all positions
- `GET /api/positions/:id` - Get specific position
- `POST /api/positions` - Create new position
- `PUT /api/positions/:id` - Update position
- `DELETE /api/positions/:id` - Close position

#### Metrics
- `GET /api/metrics` - Get basic metrics
- `GET /api/metrics/performance` - Get performance metrics
- `GET /api/metrics/chart/:type` - Get chart data

#### Settings
- `GET /api/settings` - Get bot settings
- `PUT /api/settings` - Update bot settings
- `GET /api/settings/strategies` - Get strategy configurations
- `PUT /api/settings/strategies/:id` - Update strategy configuration

### Example Responses

```json
// GET /api/trades
{
  "success": true,
  "data": [
    {
      "id": "trade_123",
      "side": "long",
      "size": 0.1,
      "price": 100.50,
      "fees": 0.10,
      "status": "filled",
      "strategy": "SMA Strategy",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}

// GET /api/metrics/performance
{
  "success": true,
  "data": {
    "totalReturn": 0.15,
    "winRate": 0.67,
    "sharpeRatio": 1.2,
    "maxDrawdown": 0.05,
    "totalTrades": 100,
    "winningTrades": 67,
    "losingTrades": 33
  }
}
```

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Price Feed    │    │   Strategies    │    │ Risk Manager    │
│                 │    │                 │    │                 │
│ • Real-time     │───▶│ • SMA Crossover │───▶│ • Position      │
│ • WebSocket     │    │ • Mean Reversion│    │   Validation    │
│ • Simulation    │    │ • Custom        │    │ • Stop Loss     │
└─────────────────┘    └─────────────────┘    │ • Take Profit   │
                                               └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trade         │    │   Portfolio      │    │   Database      │
│   Executor      │    │   Manager        │    │                 │
│                 │    │                 │    │ • SQLite        │
│ • DEX Client    │    │ • PnL Tracking  │    │ • Prisma ORM    │
│ • Order Mgmt    │    │ • Metrics        │    │ • Migrations    │
│ • Execution     │    │ • Reporting      │    │ • Seeding       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Price Feed** receives market data
2. **Strategies** analyze data and generate signals
3. **Risk Manager** validates signals and position sizes
4. **Trade Executor** executes trades on DEX
5. **Portfolio Manager** tracks positions and PnL
6. **Database** persists all trading data
7. **API** exposes data to frontend and external systems

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Production Deployment

1. **Set up environment variables**
2. **Configure reverse proxy (nginx)**
3. **Set up SSL certificates**
4. **Configure monitoring and logging**
5. **Deploy with Docker Compose**

### Monitoring

- Health checks: `GET /health`
- Metrics endpoint: `GET /api/metrics/performance`
- Log aggregation with structured logging
- Telegram alerts for critical events

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Install dependencies
npm install

# Set up development database
npm run seed

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading cryptocurrencies involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Use at your own risk.

## 📞 Support

- 📖 [Documentation](https://github.com/prpos/prpos-bot/wiki)
- 🐛 [Issue Tracker](https://github.com/prpos/prpos-bot/issues)
- 💬 [Discussions](https://github.com/prpos/prpos-bot/discussions)
- 📧 [Email Support](mailto:support@prpos.dev)

---

**Made with ❤️ by the PRPos Team**
