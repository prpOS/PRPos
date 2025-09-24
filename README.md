# PRPos — The Perp Positioning System

[![CI/CD](https://github.com/prpos/prpos-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/prpos/prpos-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

**PRPos** is an autonomous perpetual trading bot for Solana that combines advanced technical analysis with robust risk management to execute profitable trading strategies.

> **Created by [@aschnebel](https://github.com/aschnebel)** - A comprehensive trading bot solution for the Solana ecosystem

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

## 🔮 Future Updates & Roadmap

PRPos is continuously evolving with exciting new features and improvements planned for future releases:

### 🚀 **Upcoming Features (v0.2.0)**

#### **Advanced Trading Strategies**
- **Machine Learning Models**: LSTM neural networks for price prediction
- **Sentiment Analysis**: Social media and news sentiment integration
- **Cross-Asset Correlation**: Multi-asset trading strategies
- **Dynamic Parameter Optimization**: AI-driven strategy parameter tuning
- **Arbitrage Strategies**: Cross-exchange and cross-chain arbitrage

#### **Enhanced Risk Management**
- **Portfolio Optimization**: Modern Portfolio Theory integration
- **Dynamic Hedging**: Real-time hedging strategies
- **Volatility Forecasting**: GARCH models for volatility prediction
- **Stress Testing**: Monte Carlo simulation for risk assessment
- **Regulatory Compliance**: Automated compliance monitoring

#### **Multi-Exchange Support**
- **Binance Integration**: Full Binance Futures API support
- **FTX Integration**: FTX perpetual futures trading
- **Unified Order Management**: Cross-exchange order routing
- **Liquidity Aggregation**: Best execution across exchanges
- **Cross-Exchange Arbitrage**: Automated arbitrage opportunities

### 🎯 **Planned Features (v0.3.0)**

#### **Advanced Analytics**
- **Real-time Dashboards**: Advanced charting with TradingView integration
- **Performance Attribution**: Strategy performance breakdown
- **Risk Analytics**: VaR, CVaR, and stress testing
- **Backtesting Engine**: Advanced backtesting with walk-forward analysis
- **Strategy Optimization**: Genetic algorithm optimization

#### **Institutional Features**
- **Multi-Account Management**: Support for multiple trading accounts
- **Role-Based Access Control**: Granular permissions system
- **Audit Trails**: Comprehensive trading audit logs
- **Compliance Reporting**: Automated regulatory reporting
- **White-Label Solutions**: Customizable branding and deployment

#### **DeFi Integration**
- **Yield Farming**: Automated yield farming strategies
- **Liquidity Provision**: AMM liquidity management
- **Lending Protocols**: Automated lending and borrowing
- **Cross-Chain Support**: Multi-chain trading capabilities
- **NFT Trading**: Automated NFT trading strategies

#### **Token Integration & Fair Launch**
- **PRPos Token ($PRPOS)**: Native utility token for the ecosystem
- **Fair Launch on PumpFun**: Decentralized token launch with community-first approach
- **Developer Allocation**: 3% of total supply allocated to development team
- **Community Rewards**: Token incentives for active users and contributors
- **Governance Rights**: Token holders vote on protocol upgrades and features
- **Staking Mechanisms**: Earn rewards by staking PRPos tokens
- **Liquidity Mining**: Incentivize liquidity provision with token rewards
- **Cross-Protocol Integration**: Seamless integration with other DeFi protocols

### 🔬 **Research & Development**

#### **Cutting-Edge Technologies**
- **Quantum Computing**: Quantum algorithm integration for optimization
- **Blockchain Analytics**: On-chain data analysis and trading
- **Decentralized AI**: Federated learning for strategy development
- **Zero-Knowledge Proofs**: Privacy-preserving trading strategies
- **Cross-Chain Protocols**: Interoperability solutions

#### **Academic Partnerships**
- **University Collaborations**: Research partnerships with leading universities
- **Open Source Research**: Collaborative strategy development
- **Academic Papers**: Publishing research findings
- **Conference Presentations**: Industry conference participation
- **Educational Resources**: Trading bot development courses

### 🌐 **Ecosystem Expansion**

#### **Community Features**
- **Strategy Marketplace**: Community-driven strategy sharing
- **Social Trading**: Copy trading and social features
- **Leaderboards**: Performance-based rankings
- **Educational Content**: Comprehensive learning resources
- **Mentorship Program**: Expert guidance for traders

#### **Enterprise Solutions**
- **SaaS Platform**: Cloud-based trading bot service
- **API Marketplace**: Third-party integrations
- **White-Label Licensing**: Custom solutions for institutions
- **Consulting Services**: Professional trading bot development
- **Training Programs**: Corporate training and certification

### 📊 **Performance Improvements**

#### **Scalability Enhancements**
- **Microservices Architecture**: Distributed system design
- **Kubernetes Deployment**: Container orchestration
- **Auto-scaling**: Dynamic resource allocation
- **Load Balancing**: High-availability deployment
- **Edge Computing**: Low-latency trading execution

#### **Performance Optimization**
- **GPU Acceleration**: CUDA-based calculations
- **Memory Optimization**: Advanced memory management
- **Database Sharding**: Distributed data storage
- **Caching Strategies**: Multi-level caching systems
- **CDN Integration**: Global content delivery

### 🔒 **Security & Compliance**

#### **Advanced Security**
- **Hardware Security Modules**: Hardware-based key management
- **Zero-Trust Architecture**: Enhanced security model
- **Blockchain Integration**: Decentralized security
- **Quantum-Safe Cryptography**: Future-proof encryption
- **Compliance Automation**: Automated regulatory compliance

### 📱 **User Experience**

#### **Mobile Applications**
- **iOS App**: Native iOS trading bot management
- **Android App**: Native Android application
- **Cross-Platform**: React Native mobile apps
- **Offline Mode**: Limited offline functionality
- **Push Notifications**: Real-time alerts and updates

#### **Advanced UI/UX**
- **Dark Mode**: Comprehensive dark theme support
- **Accessibility**: WCAG 2.1 compliance
- **Internationalization**: Multi-language support
- **Customizable Dashboards**: Drag-and-drop interface
- **Voice Commands**: Voice-controlled trading

### 🤝 **Community & Ecosystem**

#### **Developer Ecosystem**
- **Plugin System**: Third-party plugin architecture
- **SDK Development**: Software development kits
- **API Documentation**: Comprehensive API references
- **Developer Tools**: Debugging and testing tools
- **Community Forums**: Developer discussion platforms

#### **Open Source Contributions**
- **Core Library**: Open source core components
- **Strategy Templates**: Pre-built strategy templates
- **Educational Resources**: Learning materials and tutorials
- **Code Examples**: Comprehensive code samples
- **Best Practices**: Development guidelines and standards

### 📈 **Market Expansion**

#### **Global Markets**
- **International Exchanges**: Support for global exchanges
- **Multi-Currency**: Multi-currency trading support
- **Regulatory Compliance**: Global regulatory compliance
- **Localization**: Region-specific features
- **Partnerships**: Strategic industry partnerships

#### **Institutional Adoption**
- **Hedge Fund Integration**: Professional fund management
- **Family Office Solutions**: Wealth management integration
- **Institutional APIs**: Enterprise-grade APIs
- **Custom Development**: Bespoke solution development
- **Professional Services**: Consulting and support

### 🪙 **PRPos Token ($PRPOS) - Fair Launch**

#### **Token Economics**
- **Total Supply**: 1,000,000,000 $PRPOS tokens
- **Fair Launch**: Decentralized launch on PumpFun platform
- **Developer Purchase**: 3% (30,000,000 tokens) bought by development team on launch
- **Fair Game**: 97% (970,000,000 tokens) available for community - first come, first served
- **No Pre-sale**: 100% fair launch with no private sales or pre-mine
- **Revenue Model**: All trading fees go directly to bot development and maintenance
- **Free Bot**: PRPos trading bot remains completely free to use

#### **Token Utility**
- **Governance**: Vote on protocol upgrades and new features
- **Fee Discounts**: Reduced trading fees for token holders
- **Premium Features**: Access to advanced trading strategies
- **Staking Rewards**: Earn additional tokens through staking
- **Liquidity Mining**: Rewards for providing liquidity
- **Community Incentives**: Rewards for active participation

#### **Fair Launch Details**
- **Launch Platform**: PumpFun (Solana-based fair launch platform)
- **Launch Date**: TBA (To Be Announced)
- **Initial Price**: Market-determined through bonding curve
- **Liquidity Pool**: Automatic liquidity provision
- **Community First**: No insider advantages or early access
- **Transparent Process**: All transactions publicly verifiable on-chain

#### **Token Distribution**
```
┌─────────────────────────────────────────────────────────────┐
│                    PRPos Token Distribution                │
├─────────────────────────────────────────────────────────────┤
│ Fair Game (Community)          │ 970M tokens (97%)        │
│ Developer Purchase (Launch)    │ 30M tokens (3%)           │
│                                │                           │
│ Fair Game Allocation:          │                           │
│ • PumpFun Fair Launch         │ 970M tokens (97%)         │
│ • First Come, First Served    │ No restrictions           │
│ • Community Owned             │ 100% community control    │
│ • No Vesting                  │ Immediate ownership        │
└─────────────────────────────────────────────────────────────┘
```

#### **Revenue & Development Model**
- **Trading Fees**: All fees from bot usage fund development
- **Free Bot**: No cost to use PRPos trading bot
- **Community Funded**: Development supported by trading activity
- **Transparent**: All revenue allocation publicly verifiable
- **Sustainable**: Self-funding through user adoption

#### **How to Participate**
1. **Join Community**: Follow updates on social media
2. **Prepare Wallet**: Set up Solana wallet (Phantom, Solflare)
3. **Get SOL**: Acquire Solana tokens for participation
4. **Launch Day**: Buy tokens on PumpFun - it's fair game!
5. **Use Free Bot**: Start trading with PRPos bot at no cost
6. **Support Development**: Trading fees fund continued development

---

### 🎯 **How to Stay Updated**

- **GitHub Releases**: Follow releases for latest updates
- **Discord Community**: Join our Discord for real-time updates
- **Newsletter**: Subscribe to our newsletter for major announcements
- **Twitter**: Follow [@PRPosBot](https://twitter.com/PRPosBot) for updates
- **Documentation**: Check our [Wiki](https://github.com/prpos/prpos-bot/wiki) for detailed guides

### 💡 **Contribute to the Future**

We welcome contributions to help shape the future of PRPos:

- **Feature Requests**: Submit ideas for new features
- **Bug Reports**: Help us improve stability
- **Code Contributions**: Contribute to the codebase
- **Documentation**: Help improve our documentation
- **Community**: Help build our community

---

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




