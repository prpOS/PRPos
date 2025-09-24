import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

interface Settings {
  account: {
    balance: number;
    margin: number;
    leverage: number;
  };
  strategies: Array<{
    id: string;
    name: string;
    type: string;
    parameters: any;
    isActive: boolean;
  }>;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      await apiService.updateSettings(settings);
      setMessage('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateAccount = (field: string, value: number) => {
    if (settings) {
      setSettings({
        ...settings,
        account: {
          ...settings.account,
          [field]: value,
        },
      });
    }
  };

  const updateStrategy = (strategyId: string, field: string, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        strategies: settings.strategies.map(strategy =>
          strategy.id === strategyId
            ? { ...strategy, [field]: value }
            : strategy
        ),
      });
    }
  };

  const updateStrategyParameter = (strategyId: string, paramKey: string, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        strategies: settings.strategies.map(strategy =>
          strategy.id === strategyId
            ? {
                ...strategy,
                parameters: {
                  ...strategy.parameters,
                  [paramKey]: value,
                },
              }
            : strategy
        ),
      });
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <div className="flex space-x-2">
          <button
            onClick={loadSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
            <input
              type="number"
              value={settings?.account.balance || 0}
              onChange={(e) => updateAccount('balance', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Margin</label>
            <input
              type="number"
              value={settings?.account.margin || 0}
              onChange={(e) => updateAccount('margin', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leverage</label>
            <input
              type="number"
              value={settings?.account.leverage || 0}
              onChange={(e) => updateAccount('leverage', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      {/* Strategy Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Settings</h3>
        <div className="space-y-6">
          {settings?.strategies.map((strategy) => (
            <div key={strategy.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">{strategy.name}</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={strategy.isActive}
                    onChange={(e) => updateStrategy(strategy.id, 'isActive', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Active</span>
                </label>
              </div>
              
              {strategy.type === 'sma' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Short Window</label>
                    <input
                      type="number"
                      value={strategy.parameters.shortWindow || 9}
                      onChange={(e) => updateStrategyParameter(strategy.id, 'shortWindow', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Long Window</label>
                    <input
                      type="number"
                      value={strategy.parameters.longWindow || 21}
                      onChange={(e) => updateStrategyParameter(strategy.id, 'longWindow', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
              )}
              
              {strategy.type === 'mean_reversion' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Window</label>
                    <input
                      type="number"
                      value={strategy.parameters.window || 20}
                      onChange={(e) => updateStrategyParameter(strategy.id, 'window', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Threshold</label>
                    <input
                      type="number"
                      value={strategy.parameters.threshold || 2.0}
                      onChange={(e) => updateStrategyParameter(strategy.id, 'threshold', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
