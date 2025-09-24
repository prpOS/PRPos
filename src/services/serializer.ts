import { logger } from '../utils/logger';

export interface SerializedData {
  type: string;
  data: any;
  timestamp: number;
  version: string;
}

export interface SerializationOptions {
  includeMetadata?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  format?: 'json' | 'csv' | 'xml';
}

export class SerializerService {
  private version: string = '1.0.0';

  constructor() {
    // Initialize serializer
  }

  public serialize(data: any, type: string, options: SerializationOptions = {}): string {
    try {
      const serialized: SerializedData = {
        type,
        data: this.prepareData(data, options),
        timestamp: Date.now(),
        version: this.version,
      };

      let result: string;

      switch (options.format || 'json') {
        case 'json':
          result = JSON.stringify(serialized, null, options.compress ? 0 : 2);
          break;
        case 'csv':
          result = this.serializeToCSV(data, type);
          break;
        case 'xml':
          result = this.serializeToXML(serialized);
          break;
        default:
          result = JSON.stringify(serialized);
      }

      if (options.compress) {
        result = this.compress(result);
      }

      if (options.encrypt) {
        result = this.encrypt(result);
      }

      return result;
    } catch (error) {
      logger.error('Error serializing data:', error);
      throw error;
    }
  }

  public deserialize<T>(serializedData: string, options: SerializationOptions = {}): T {
    try {
      let data = serializedData;

      if (options.encrypt) {
        data = this.decrypt(data);
      }

      if (options.compress) {
        data = this.decompress(data);
      }

      let parsed: SerializedData;

      switch (options.format || 'json') {
        case 'json':
          parsed = JSON.parse(data);
          break;
        case 'csv':
          return this.deserializeFromCSV(data) as T;
        case 'xml':
          return this.deserializeFromXML(data) as T;
        default:
          parsed = JSON.parse(data);
      }

      return parsed.data as T;
    } catch (error) {
      logger.error('Error deserializing data:', error);
      throw error;
    }
  }

  private prepareData(data: any, options: SerializationOptions): any {
    if (options.includeMetadata) {
      return {
        ...data,
        _metadata: {
          serializedAt: new Date().toISOString(),
          version: this.version,
        },
      };
    }

    return data;
  }

  private serializeToCSV(data: any, type: string): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }
    
    return '';
  }

  private deserializeFromCSV(csvData: string): any[] {
    const lines = csvData.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',');
    const result: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        let value = values[j];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[headers[j]] = value;
      }
      
      result.push(row);
    }
    
    return result;
  }

  private serializeToXML(data: SerializedData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<serializedData>\n';
    xml += `  <type>${data.type}</type>\n`;
    xml += `  <timestamp>${data.timestamp}</timestamp>\n`;
    xml += `  <version>${data.version}</version>\n`;
    xml += '  <data>\n';
    xml += this.objectToXML(data.data, '    ');
    xml += '  </data>\n';
    xml += '</serializedData>';
    
    return xml;
  }

  private objectToXML(obj: any, indent: string): string {
    let xml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>\n`;
        xml += this.objectToXML(value, indent + '  ');
        xml += `${indent}</${key}>\n`;
      } else {
        xml += `${indent}<${key}>${value}</${key}>\n`;
      }
    }
    
    return xml;
  }

  private deserializeFromXML(xmlData: string): any {
    // Simple XML parsing - in production, use a proper XML parser
    const typeMatch = xmlData.match(/<type>(.*?)<\/type>/);
    const timestampMatch = xmlData.match(/<timestamp>(.*?)<\/timestamp>/);
    const versionMatch = xmlData.match(/<version>(.*?)<\/version>/);
    
    return {
      type: typeMatch ? typeMatch[1] : '',
      timestamp: timestampMatch ? parseInt(timestampMatch[1]) : 0,
      version: versionMatch ? versionMatch[1] : '',
      data: {}, // Simplified - would need proper XML parsing
    };
  }

  private compress(data: string): string {
    // Simple compression - in production, use a proper compression library
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): string {
    // Simple decompression - in production, use a proper compression library
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  private encrypt(data: string): string {
    // Simple encryption - in production, use proper encryption
    return Buffer.from(data).toString('base64');
  }

  private decrypt(data: string): string {
    // Simple decryption - in production, use proper decryption
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  public serializeTrades(trades: any[], options: SerializationOptions = {}): string {
    return this.serialize(trades, 'trades', options);
  }

  public serializePositions(positions: any[], options: SerializationOptions = {}): string {
    return this.serialize(positions, 'positions', options);
  }

  public serializeMetrics(metrics: any, options: SerializationOptions = {}): string {
    return this.serialize(metrics, 'metrics', options);
  }

  public serializePortfolio(portfolio: any, options: SerializationOptions = {}): string {
    return this.serialize(portfolio, 'portfolio', options);
  }

  public exportToCSV(data: any[], filename: string): string {
    const csv = this.serializeToCSV(data, 'export');
    return csv;
  }

  public getStatus(): any {
    return {
      version: this.version,
      supportedFormats: ['json', 'csv', 'xml'],
      features: ['compression', 'encryption', 'metadata'],
    };
  }
}
