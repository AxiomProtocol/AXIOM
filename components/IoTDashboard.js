import { useState, useEffect } from 'react';

export default function IoTDashboard({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetry = async () => {
    try {
      const response = await fetch('/api/depin/telemetry');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading IoT telemetry...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return null;
  }

  const { sales, network, iot, sensors } = data;
  const hasData = sales.totalNodesSold > 0 || network.activeNodes > 0 || iot.totalDevices > 0;

  if (compact) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Network Status</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${
            iot.networkHealth === 'Excellent' || iot.networkHealth === 'Optimal' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {iot.networkHealth}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">{sales.totalNodesSold}</div>
            <div className="text-xs text-gray-500">Nodes Sold</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{iot.averageUptime}%</div>
            <div className="text-xs text-gray-500">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{sensors.length}</div>
            <div className="text-xs text-gray-500">Sensors</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">IoT Network Telemetry</h3>
          <p className="text-gray-400 text-sm">Live data from DePIN infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Nodes Sold</div>
          <div className="text-2xl font-bold text-yellow-400">{sales.totalNodesSold}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">ETH Collected</div>
          <div className="text-2xl font-bold text-blue-400">
            {parseFloat(sales.totalEthCollected).toFixed(2)} ETH
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Network Uptime</div>
          <div className="text-2xl font-bold text-green-400">{iot.averageUptime}%</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Network Health</div>
          <div className={`text-2xl font-bold ${
            iot.networkHealth === 'Excellent' || iot.networkHealth === 'Optimal' 
              ? 'text-green-400' 
              : 'text-yellow-400'
          }`}>
            {iot.networkHealth}
          </div>
        </div>
      </div>

      {sensors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Sensor Readings</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sensors.map((sensor) => (
              <div 
                key={sensor.id}
                className="bg-gray-900/30 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs text-gray-500">{sensor.type}</div>
                  <div className="text-lg font-semibold text-white">
                    {sensor.value} <span className="text-sm text-gray-400">{sensor.unit}</span>
                  </div>
                  <div className="text-xs text-gray-500">{sensor.location}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  sensor.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Staked</div>
          <div className="text-lg font-semibold text-white">
            {parseFloat(network.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Rewards Distributed</div>
          <div className="text-lg font-semibold text-white">
            {parseFloat(network.totalRewards).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4">
        <a 
          href={`https://arbitrum.blockscout.com/address/${data.contracts.depinSales}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
        >
          Node Sales Contract
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a 
          href={`https://arbitrum.blockscout.com/address/${data.contracts.iotOracle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
        >
          IoT Oracle Contract
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
