import React, { useState, useEffect } from 'react';
import { ObserverLayout, ObserverCard, ObserverLoading } from '../../components/observer/ObserverLayout';
import { RiskData } from '../../server/services/observer/types';

function RiskGauge({ label, value, status }: { label: string; value: number; status: string }) {
  const colors = {
    safe: 'bg-teal-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500'
  };

  const textColors = {
    safe: 'text-teal-600',
    warning: 'text-amber-600',
    critical: 'text-red-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span className={`text-2xl font-bold ${textColors[status as keyof typeof textColors] || textColors.safe}`}>{value}%</span>
          <span className={`px-2 py-1 text-xs rounded ${
            status === 'safe' ? 'bg-teal-100 text-teal-800' :
            status === 'warning' ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${colors[status as keyof typeof colors] || colors.safe}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function ObserverRisk() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/risk');
        const result = await response.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Failed to fetch risk data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ObserverLayout
      title="Risk"
      description="Exposure limits, concentration analysis, and system alerts"
      currentTab="risk"
    >
      {loading ? (
        <ObserverLoading />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <RiskGauge
              label="Portfolio Utilization"
              value={data.utilization?.portfolio || 0}
              status={(data.utilization?.portfolio || 0) > 80 ? 'warning' : (data.utilization?.portfolio || 0) > 95 ? 'critical' : 'safe'}
            />
            <RiskGauge
              label="Capital Ratio"
              value={data.utilization?.capital || 0}
              status={(data.utilization?.capital || 0) < 20 ? 'warning' : (data.utilization?.capital || 0) < 10 ? 'critical' : 'safe'}
            />
            <RiskGauge
              label="Concentration"
              value={data.utilization?.concentration || 0}
              status={(data.utilization?.concentration || 0) > 50 ? 'warning' : (data.utilization?.concentration || 0) > 75 ? 'critical' : 'safe'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ObserverCard title="Exposure Limits">
              <div className="space-y-3">
                {(data.exposureLimits || []).map((limit) => (
                  <div key={limit.name} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{limit.name}</p>
                      <p className={`font-bold ${
                        limit.current / limit.max > 0.8 ? 'text-amber-600' : 'text-teal-600'
                      }`}>
                        {((limit.current / limit.max) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Current: {limit.currentFormatted}</span>
                      <span>Max: {limit.maxFormatted}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          limit.current / limit.max > 0.8 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min((limit.current / limit.max) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>

            <ObserverCard title="Concentration Analysis">
              <div className="space-y-3">
                {(data.concentration || []).map((item) => (
                  <div key={item.category} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-sm text-gray-500">{item.count} positions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600">{item.percentage}%</p>
                      <p className="text-sm text-gray-500">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ObserverCard>
          </div>

          <ObserverCard title="Active Alerts">
            {!data.alerts || data.alerts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <svg className="w-6 h-6 mr-2 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No active risk alerts
              </div>
            ) : (
              <div className="space-y-3">
                {(data.alerts || []).map((alert, idx) => (
                  <div key={idx} className={`rounded-xl p-4 ${
                    alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                    alert.severity === 'warning' ? 'bg-amber-50 border border-amber-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start">
                      <svg className={`w-5 h-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ObserverCard>
        </>
      ) : (
        <p className="text-gray-500">Failed to load risk data</p>
      )}
    </ObserverLayout>
  );
}
