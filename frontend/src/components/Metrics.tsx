import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { apiService, Metrics, ChartData } from '../services/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Metrics: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('cumulative_pnl');

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedChart]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPerformanceMetrics();
      setMetrics(response.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const response = await apiService.getChartData(selectedChart, 30);
      setChartData(response.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Performance Metrics</h1>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Return</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics ? formatPercentage(metrics.totalReturn) : '0.00%'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics ? formatPercentage(metrics.winRate) : '0.00%'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics ? metrics.sharpeRatio.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics ? formatPercentage(metrics.maxDrawdown) : '0.00%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades</span>
              <span className="font-medium">{metrics?.totalTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Winning Trades</span>
              <span className="font-medium text-green-600">{metrics?.winningTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Losing Trades</span>
              <span className="font-medium text-red-600">{metrics?.losingTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Win</span>
              <span className="font-medium text-green-600">
                {metrics ? formatCurrency(metrics.averageWin) : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Loss</span>
              <span className="font-medium text-red-600">
                {metrics ? formatCurrency(metrics.averageLoss) : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Factor</span>
              <span className="font-medium">{metrics ? metrics.profitFactor.toFixed(2) : '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Volatility</span>
              <span className="font-medium">{metrics ? formatPercentage(metrics.volatility) : '0.00%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Annualized Return</span>
              <span className="font-medium">{metrics ? formatPercentage(metrics.annualizedReturn) : '0.00%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sharpe Ratio</span>
              <span className="font-medium">{metrics ? metrics.sharpeRatio.toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Drawdown</span>
              <span className="font-medium text-red-600">
                {metrics ? formatPercentage(metrics.maxDrawdown) : '0.00%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Chart</h3>
          <select
            value={selectedChart}
            onChange={(e) => setSelectedChart(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cumulative_pnl">Cumulative PnL</option>
            <option value="returns">Returns</option>
            <option value="volatility">Volatility</option>
            <option value="sharpe_ratio">Sharpe Ratio</option>
          </select>
        </div>
        
        {chartData ? (
          <Line
            data={chartData}
            options={chartOptions}
            height={400}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No chart data available
          </div>
        )}
      </div>

      {/* Win/Loss Distribution */}
      {metrics && metrics.totalTrades > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatPercentage(metrics.winRate)}
              </div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatPercentage(1 - metrics.winRate)}
              </div>
              <div className="text-sm text-gray-600">Loss Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metrics;
