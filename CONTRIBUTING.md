# Contributing to PRPos

Thank you for your interest in contributing to PRPos! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Docker (optional)
- Basic understanding of TypeScript and React

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/prpos-bot.git
   cd prpos-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment**
   ```bash
   cp env.example .env
   # Edit .env with your development configuration
   ```

4. **Initialize Database**
   ```bash
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Contributing Process

### 1. Issue Creation

Before starting work, create an issue to discuss:
- Bug reports with reproduction steps
- Feature requests with use cases
- Documentation improvements
- Performance optimizations

### 2. Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Create bugfix branch
git checkout -b bugfix/issue-number-description

# Create hotfix branch
git checkout -b hotfix/critical-issue
```

### 3. Development Workflow

```bash
# Make your changes
git add .
git commit -m "feat: add new trading strategy"

# Push to your fork
git push origin feature/your-feature-name

# Create pull request
```

### 4. Pull Request Process

1. **Create Pull Request**
   - Clear title and description
   - Reference related issues
   - Include screenshots for UI changes

2. **Code Review**
   - Address reviewer feedback
   - Update documentation if needed
   - Ensure all tests pass

3. **Merge**
   - Squash commits if requested
   - Delete feature branch
   - Update issue status

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface TradeRequest {
  side: 'long' | 'short';
  size: number;
  price: number;
  type: 'market' | 'limit';
}

// Use const assertions
const TRADE_STATUSES = ['pending', 'filled', 'cancelled'] as const;

// Use proper error handling
try {
  await executeTrade(trade);
} catch (error) {
  logger.error('Trade execution failed:', error);
  throw new Error('Failed to execute trade');
}
```

### Code Style

```typescript
// Use meaningful variable names
const maxLeverage = config.maxLeverage;
const riskPerTrade = config.riskPerTrade;

// Use consistent formatting
const trade = {
  id: generateId(),
  side: 'long',
  size: 0.1,
  price: 100.50,
  timestamp: Date.now(),
};

// Use JSDoc for complex functions
/**
 * Executes a trade on the DEX
 * @param trade - The trade request
 * @returns Promise<TradeResult | null>
 */
async function executeTrade(trade: TradeRequest): Promise<TradeResult | null> {
  // Implementation
}
```

### File Organization

```
src/
├── core/           # Core trading logic
├── api/            # REST API
├── services/       # Business services
├── utils/          # Utility functions
├── integrations/   # External integrations
└── cli/            # Command line interface
```

### Naming Conventions

- **Files**: kebab-case (`trade-executor.ts`)
- **Classes**: PascalCase (`TradeExecutor`)
- **Functions**: camelCase (`executeTrade`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LEVERAGE`)
- **Interfaces**: PascalCase (`TradeRequest`)

## Testing

### Test Structure

```typescript
describe('TradeExecutor', () => {
  let tradeExecutor: TradeExecutor;
  let mockRiskManager: jest.Mocked<RiskManager>;

  beforeEach(() => {
    mockRiskManager = createMockRiskManager();
    tradeExecutor = new TradeExecutor(mockRiskManager, portfolio, config);
  });

  describe('executeTrade', () => {
    it('should execute valid trade', async () => {
      // Arrange
      const tradeRequest = createValidTradeRequest();
      mockRiskManager.canOpenPosition.mockReturnValue({ allowed: true });

      // Act
      const result = await tradeExecutor.executeTrade(tradeRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result?.side).toBe('long');
    });
  });
});
```

### Testing Guidelines

1. **Unit Tests**
   - Test individual functions
   - Mock external dependencies
   - Aim for 80%+ coverage
   - Test edge cases and error conditions

2. **Integration Tests**
   - Test component interactions
   - Use test database
   - Test API endpoints
   - Test database operations

3. **End-to-End Tests**
   - Test complete workflows
   - Use real browser automation
   - Test user interactions
   - Test error scenarios

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test -- tradeExecutor.test.ts

# Run tests in watch mode
npm run test:watch
```

## Documentation

### Code Documentation

```typescript
/**
 * Risk manager for position validation and risk assessment
 * 
 * @example
 * ```typescript
 * const riskManager = new RiskManager(config);
 * const assessment = riskManager.canOpenPosition(account, size, price);
 * if (assessment.allowed) {
 *   // Proceed with trade
 * }
 * ```
 */
export class RiskManager {
  /**
   * Validates if a position can be opened
   * @param account - Account information
   * @param size - Position size
   * @param price - Entry price
   * @returns Risk assessment result
   */
  canOpenPosition(account: Account, size: number, price: number): RiskAssessment {
    // Implementation
  }
}
```

### API Documentation

```typescript
/**
 * @api {post} /api/trades Create Trade
 * @apiName CreateTrade
 * @apiGroup Trades
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} side Trade side (long/short)
 * @apiParam {Number} size Position size
 * @apiParam {Number} price Entry price
 * @apiParam {String} type Order type (market/limit)
 * 
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {Object} data Trade data
 * @apiSuccess {String} data.id Trade ID
 * @apiSuccess {String} data.side Trade side
 * @apiSuccess {Number} data.size Position size
 * @apiSuccess {Number} data.price Entry price
 */
```

### README Updates

When adding new features:
- Update feature list
- Add usage examples
- Update configuration options
- Add troubleshooting section

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Pre-Release**
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] Changelog updated
   - [ ] Version bumped

2. **Release**
   - [ ] Create release tag
   - [ ] Generate release notes
   - [ ] Publish to npm
   - [ ] Update Docker images

3. **Post-Release**
   - [ ] Monitor for issues
   - [ ] Update documentation
   - [ ] Announce release

### Changelog Format

```markdown
## [1.2.0] - 2024-01-15

### Added
- New SMA strategy with configurable parameters
- Telegram bot command for position closing
- Performance metrics dashboard

### Changed
- Improved error handling in trade execution
- Updated API response format
- Enhanced logging system

### Fixed
- Fixed memory leak in price feed
- Resolved database connection issues
- Fixed Telegram bot authentication

### Security
- Updated dependencies to latest versions
- Enhanced API authentication
- Improved input validation
```

## Development Tools

### Recommended VS Code Extensions

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (API testing)
- Docker

### Useful Commands

```bash
# Code formatting
npm run format

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run build

# Database operations
npm run seed
npm run db:migrate
npm run db:reset

# Docker operations
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Discord**: Real-time chat and support
- **Email**: support@prpos.dev

### Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Trading Bot Development](https://github.com/prpos/prpos-bot/wiki)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to PRPos! 🚀
