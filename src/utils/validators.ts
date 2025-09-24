/**
 * Validation utilities for trading data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class Validators {
  /**
   * Validate price value
   */
  public static validatePrice(price: number): ValidationResult {
    const errors: string[] = [];
    
    if (typeof price !== 'number' || isNaN(price)) {
      errors.push('Price must be a valid number');
    }
    
    if (price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (price > 1000000) {
      errors.push('Price seems unreasonably high');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate size value
   */
  public static validateSize(size: number): ValidationResult {
    const errors: string[] = [];
    
    if (typeof size !== 'number' || isNaN(size)) {
      errors.push('Size must be a valid number');
    }
    
    if (size <= 0) {
      errors.push('Size must be greater than 0');
    }
    
    if (size > 1000000) {
      errors.push('Size seems unreasonably large');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate side (long/short)
   */
  public static validateSide(side: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof side !== 'string') {
      errors.push('Side must be a string');
    } else if (!['long', 'short'].includes(side.toLowerCase())) {
      errors.push('Side must be either "long" or "short"');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate order type
   */
  public static validateOrderType(type: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof type !== 'string') {
      errors.push('Order type must be a string');
    } else if (!['market', 'limit'].includes(type.toLowerCase())) {
      errors.push('Order type must be either "market" or "limit"');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate leverage
   */
  public static validateLeverage(leverage: number, maxLeverage: number = 10): ValidationResult {
    const errors: string[] = [];
    
    if (typeof leverage !== 'number' || isNaN(leverage)) {
      errors.push('Leverage must be a valid number');
    }
    
    if (leverage <= 0) {
      errors.push('Leverage must be greater than 0');
    }
    
    if (leverage > maxLeverage) {
      errors.push(`Leverage cannot exceed ${maxLeverage}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate percentage value
   */
  public static validatePercentage(percentage: number, min: number = 0, max: number = 100): ValidationResult {
    const errors: string[] = [];
    
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      errors.push('Percentage must be a valid number');
    }
    
    if (percentage < min) {
      errors.push(`Percentage must be at least ${min}%`);
    }
    
    if (percentage > max) {
      errors.push(`Percentage cannot exceed ${max}%`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email address
   */
  public static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Email must be a valid email address');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Telegram user ID
   */
  public static validateTelegramId(id: number): ValidationResult {
    const errors: string[] = [];
    
    if (typeof id !== 'number' || isNaN(id)) {
      errors.push('Telegram ID must be a valid number');
    }
    
    if (id <= 0) {
      errors.push('Telegram ID must be positive');
    }
    
    if (id > 999999999999) {
      errors.push('Telegram ID seems unreasonably large');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate API token
   */
  public static validateApiToken(token: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof token !== 'string') {
      errors.push('API token must be a string');
    } else if (token.length < 10) {
      errors.push('API token must be at least 10 characters long');
    } else if (token.length > 100) {
      errors.push('API token cannot exceed 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate strategy name
   */
  public static validateStrategyName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof name !== 'string') {
      errors.push('Strategy name must be a string');
    } else if (name.length < 2) {
      errors.push('Strategy name must be at least 2 characters long');
    } else if (name.length > 50) {
      errors.push('Strategy name cannot exceed 50 characters');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push('Strategy name can only contain letters, numbers, underscores, and hyphens');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate trade request
   */
  public static validateTradeRequest(trade: any): ValidationResult {
    const errors: string[] = [];
    
    if (!trade || typeof trade !== 'object') {
      errors.push('Trade must be an object');
      return { isValid: false, errors };
    }
    
    // Validate required fields
    const requiredFields = ['side', 'size', 'price', 'type'];
    for (const field of requiredFields) {
      if (!(field in trade)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate individual fields
    if ('side' in trade) {
      const sideResult = this.validateSide(trade.side);
      if (!sideResult.isValid) {
        errors.push(...sideResult.errors);
      }
    }
    
    if ('size' in trade) {
      const sizeResult = this.validateSize(trade.size);
      if (!sizeResult.isValid) {
        errors.push(...sizeResult.errors);
      }
    }
    
    if ('price' in trade) {
      const priceResult = this.validatePrice(trade.price);
      if (!priceResult.isValid) {
        errors.push(...priceResult.errors);
      }
    }
    
    if ('type' in trade) {
      const typeResult = this.validateOrderType(trade.type);
      if (!typeResult.isValid) {
        errors.push(...typeResult.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate position data
   */
  public static validatePosition(position: any): ValidationResult {
    const errors: string[] = [];
    
    if (!position || typeof position !== 'object') {
      errors.push('Position must be an object');
      return { isValid: false, errors };
    }
    
    // Validate required fields
    const requiredFields = ['side', 'size', 'entryPrice'];
    for (const field of requiredFields) {
      if (!(field in position)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate individual fields
    if ('side' in position) {
      const sideResult = this.validateSide(position.side);
      if (!sideResult.isValid) {
        errors.push(...sideResult.errors);
      }
    }
    
    if ('size' in position) {
      const sizeResult = this.validateSize(position.size);
      if (!sizeResult.isValid) {
        errors.push(...sizeResult.errors);
      }
    }
    
    if ('entryPrice' in position) {
      const priceResult = this.validatePrice(position.entryPrice);
      if (!priceResult.isValid) {
        errors.push(...priceResult.errors);
      }
    }
    
    if ('leverage' in position) {
      const leverageResult = this.validateLeverage(position.leverage);
      if (!leverageResult.isValid) {
        errors.push(...leverageResult.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate configuration object
   */
  public static validateConfig(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return { isValid: false, errors };
    }
    
    // Validate numeric fields
    const numericFields = ['maxLeverage', 'riskPerTrade', 'port', 'priceFeedInterval'];
    for (const field of numericFields) {
      if (field in config) {
        if (typeof config[field] !== 'number' || isNaN(config[field])) {
          errors.push(`${field} must be a valid number`);
        }
      }
    }
    
    // Validate string fields
    const stringFields = ['solanaRpcUrl', 'databaseUrl', 'apiAuthToken'];
    for (const field of stringFields) {
      if (field in config) {
        if (typeof config[field] !== 'string') {
          errors.push(`${field} must be a string`);
        }
      }
    }
    
    // Validate boolean fields
    const booleanFields = ['simulationMode'];
    for (const field of booleanFields) {
      if (field in config) {
        if (typeof config[field] !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input
   */
  public static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize numeric input
   */
  public static sanitizeNumber(input: any, defaultValue: number = 0): number {
    const num = parseFloat(input);
    return isNaN(num) ? defaultValue : num;
  }
}
