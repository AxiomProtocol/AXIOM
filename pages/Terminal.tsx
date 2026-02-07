/**
 * MIRDT - Terminal Component
 *
 * Renders the data-grid of market setups.
 *
 * UI/UX ENFORCEMENT:
 * - Light mode, data-grid first.
 * - No animations, hype, or gamification.
 * - Language is neutral and institutional.
 * - Focus is on risk (Invalidation) and probability (P5/P50/P95).
 */

import React, { useState, useEffect } from 'react';
import { MarketSetup } from '../../lib/mirdt';

export const Terminal = () => {
  const [setups, setSetups] = useState<MarketSetup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetups = async () => {
      try {
        const response = await fetch('/api/mirdt/setups');
        const data = await response.json();
        setSetups(data.setups);
      } catch (error) {
        console.error("Failed to fetch MIRDT setups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetups();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500">Loading market data...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Zone</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-red-600">Invalidation</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P50 Outcome</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horizon</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {setups.map((setup) => (
              <tr key={setup.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{setup.asset}</div>
                  <div className="text-sm text-gray-500">{setup.assetClass}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {setup.entryZone.lowerBound.toLocaleString()} - {setup.entryZone.upperBound.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-red-600">
                    &lt; {setup.invalidationLevel.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {setup.probabilisticOutcomes.p50.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Range: {setup.probabilisticOutcomes.p5.toLocaleString()} - {setup.probabilisticOutcomes.p95.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {setup.horizonDays} days
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                     {(setup.confidenceScore * 100).toFixed(0)}%
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};