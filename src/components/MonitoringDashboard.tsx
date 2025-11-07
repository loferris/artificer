import React, { useState } from 'react';
import { trpc } from '../lib/trpc/client';

interface UsageStatsProps {
  data: Array<{ model: string; count: number; percentage: number }>;
}

const UsageStats: React.FC<UsageStatsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Model Usage</h3>
        <p className="text-gray-600 dark:text-gray-400">No usage data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Model Usage Statistics</h3>
      <div className="space-y-3">
        {data.map((stat) => (
          <div key={stat.model} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stat.model}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.count} requests ({stat.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface HealthStatusProps {
  data: Array<{
    model: string;
    isHealthy: boolean;
    responseTime: number;
    lastChecked: string;
    error?: string;
  }>;
}

const HealthStatus: React.FC<HealthStatusProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Model Health</h3>
        <p className="text-gray-600 dark:text-gray-400">No health data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Model Health Status</h3>
      <div className="space-y-3">
        {data.map((health) => (
          <div key={health.model} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  health.isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {health.model}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
                </div>
                {health.error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {health.error}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {health.responseTime}ms
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Response time
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CapabilitiesProps {
  data: Record<string, {
    maxTokens: number;
    costPer1kTokens: number;
    supportsStreaming: boolean;
    contextWindow: number;
  }>;
}

const Capabilities: React.FC<CapabilitiesProps> = ({ data }) => {
  const capabilities = Object.entries(data || {});

  if (capabilities.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Model Capabilities</h3>
        <p className="text-gray-600 dark:text-gray-400">No capability data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Model Capabilities & Pricing</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Model
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cost/1k Tokens
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Max Tokens
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Context Window
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Streaming
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {capabilities.map(([model, caps]) => (
              <tr key={model}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {model}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${caps.costPer1kTokens.toFixed(6)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {caps.maxTokens.toLocaleString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {caps.contextWindow.toLocaleString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {caps.supportsStreaming ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const MonitoringDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data: monitoringData, isLoading, error, refetch } = trpc.monitoring.getModelMonitoring.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-400">
            Loading monitoring data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 px-4 py-3 rounded">
          <p className="font-bold">Error loading monitoring data</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Model Monitoring Dashboard
        </h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {monitoringData?.error && (
        <div className="mb-6 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-100 px-4 py-3 rounded">
          <p className="font-bold">Warning</p>
          <p>{monitoringData.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UsageStats data={monitoringData?.usage || []} />
        <HealthStatus data={monitoringData?.health || []} />
      </div>

      <div className="mb-6">
        <Capabilities data={monitoringData?.capabilities || {}} />
      </div>

      {monitoringData?.timestamp && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Last updated: {new Date(monitoringData.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;