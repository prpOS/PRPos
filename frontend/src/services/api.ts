import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const API_TOKEN = process.env.REACT_APP_API_TOKEN || 'replace_with_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access - check API token');
    }
    return Promise.reject(error);
  }
);

export interface Trade {
  id: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  fees: number;
  timestamp: string;
  status: string;
  strategy: string;
  realizedPnl?: number;
  returnPercent?: number;
}

export interface Position {
  id: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  status: 'open' | 'closed';
  timestamp: string;
  closeTimestamp?: string;
  closePrice?: number;
  closeReason?: string;
  strategy: string;
}

export interface Metrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

export const apiService = {
  // Trades
  async getTrades(params?: { limit?: number; offset?: number; status?: string; side?: string; strategy?: string }) {
    const response = await api.get('/trades', { params });
    return response.data;
  },

  async getTrade(id: string) {
    const response = await api.get(`/trades/${id}`);
    return response.data;
  },

  async createTrade(trade: Partial<Trade>) {
    const response = await api.post('/trades', trade);
    return response.data;
  },

  async updateTrade(id: string, updates: Partial<Trade>) {
    const response = await api.put(`/trades/${id}`, updates);
    return response.data;
  },

  async cancelTrade(id: string) {
    const response = await api.delete(`/trades/${id}`);
    return response.data;
  },

  // Positions
  async getPositions(params?: { limit?: number; offset?: number; status?: string; side?: string; strategy?: string }) {
    const response = await api.get('/positions', { params });
    return response.data;
  },

  async getPosition(id: string) {
    const response = await api.get(`/positions/${id}`);
    return response.data;
  },

  async createPosition(position: Partial<Position>) {
    const response = await api.post('/positions', position);
    return response.data;
  },

  async updatePosition(id: string, updates: Partial<Position>) {
    const response = await api.put(`/positions/${id}`, updates);
    return response.data;
  },

  async closePosition(id: string, closePrice?: number, reason?: string) {
    const response = await api.delete(`/positions/${id}`, {
      data: { closePrice, reason }
    });
    return response.data;
  },

  // Metrics
  async getMetrics(type?: string, limit?: number) {
    const response = await api.get('/metrics', { params: { type, limit } });
    return response.data;
  },

  async getPerformanceMetrics() {
    const response = await api.get('/metrics/performance');
    return response.data;
  },

  async getChartData(type: string, limit?: number) {
    const response = await api.get(`/metrics/chart/${type}`, { params: { limit } });
    return response.data;
  },

  // Settings
  async getSettings() {
    const response = await api.get('/settings');
    return response.data;
  },

  async updateSettings(settings: any) {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  async getStrategies() {
    const response = await api.get('/settings/strategies');
    return response.data;
  },

  async updateStrategy(id: string, updates: any) {
    const response = await api.put(`/settings/strategies/${id}`, updates);
    return response.data;
  },

  // Status
  async getStatus() {
    const response = await api.get('/status');
    return response.data;
  },
};

export default api;
