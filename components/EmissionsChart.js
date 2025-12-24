import { useState, useEffect } from 'react';

export default function EmissionsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmissionsData();
  }, []);

  const fetchEmissionsData = async () => {
    try {
      const response = await fetch('/api/emissions/stats');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching emissions data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading emissions data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <p className="text-gray-400">Failed to load emissions data</p>
      </div>
    );
  }

  const { staking, emissions } = data;
  const progress = parseFloat(emissions.progress);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Token Emissions</h3>
        <span className="text-sm text-gray-400">Live from Staking Contract</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Staked</div>
          <div className="text-xl font-bold text-yellow-400">
            {parseFloat(staking.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Current APR</div>
          <div className="text-xl font-bold text-green-400">{staking.apr}%</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Daily Emission</div>
          <div className="text-xl font-bold text-blue-400">
            {parseFloat(emissions.dailyEmission).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Emitted to Date</div>
          <div className="text-xl font-bold text-purple-400">
            {parseFloat(emissions.emittedToDate).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Emission Progress</span>
          <span className="text-white">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{new Date(emissions.startTime).toLocaleDateString()}</span>
          <span>{new Date(emissions.endTime).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Emissions Pool</div>
          <div className="text-lg font-semibold text-white">
            {parseFloat(emissions.totalEmissions).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Remaining</div>
          <div className="text-lg font-semibold text-white">
            {parseFloat(emissions.remainingEmissions).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
      </div>
    </div>
  );
}
