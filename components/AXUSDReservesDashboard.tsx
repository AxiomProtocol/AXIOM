import React, { useState, useEffect } from 'react';

interface ReserveData {
  timestamp: string;
  totalSupply: string;
  reserves: {
    usdc: { amount: string; percentage: number; source?: string; status: 'live' | 'planned' | 'internal' };
    tbills: { amount: string; percentage: number; status: 'live' | 'planned' | 'internal'; assets: { name: string; amount: string; status: 'live' | 'planned' | 'internal' }[] };
    other: { amount: string; percentage: number; source?: string; status: 'live' | 'planned' | 'internal' };
  };
  totalReserves: string;
  reserveRatio: number;
  isFullyBacked: boolean;
  compliance: {
    geniusActCompliant: boolean;
    lastDisclosure: string;
    nextDisclosureDue: string;
    yieldDistributionBlocked: boolean;
    auditorAttestation?: string;
  };
  contracts: Record<string, string>;
  labels: {
    live: string;
    planned: string;
    internal: string;
    operatorOnly: string;
    notPublicProduct: string;
  };
  disclaimer: string;
}

export default function AXUSDReservesDashboard() {
  const [reserveData, setReserveData] = useState<ReserveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReserves();
  }, []);

  const fetchReserves = async () => {
    try {
      const response = await fetch('/api/axusd/reserves');
      const result = await response.json();
      if (result.success) {
        setReserveData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch reserve data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center text-red-600">
          <p>Error loading reserve data: {error}</p>
          <button
            onClick={fetchReserves}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reserveData) return null;

  const statusClass = {
    live: 'bg-green-100 text-green-800',
    planned: 'bg-amber-100 text-amber-800',
    internal: 'bg-slate-100 text-slate-800'
  } as const;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">AXUSD Reserve Transparency</h2>
            <p className="text-white/80 mt-1">Canonical PSM reserve snapshot for live AXUSD mint and redeem support</p>
          </div>
          <div className={`px-4 py-2 rounded-full shrink-0 ${
            reserveData.compliance.geniusActCompliant 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 text-black'
          }`}>
            {reserveData.compliance.geniusActCompliant ? '✓ GENIUS Compliant' : '⚠ Pending Compliance'}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            { label: reserveData.labels.live, status: 'live' as const },
            { label: reserveData.labels.planned, status: 'planned' as const },
            { label: reserveData.labels.operatorOnly, status: 'internal' as const },
            { label: reserveData.labels.notPublicProduct, status: 'internal' as const },
          ].map((item) => (
            <span key={item.label} className={`px-2 py-1 rounded-full ${statusClass[item.status]}`}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4">
          <p className="text-sm text-teal-600 font-medium">Total AXUSD Supply</p>
          <p className="text-2xl font-bold text-teal-800">{formatCurrency(reserveData.totalSupply)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <p className="text-sm text-purple-600 font-medium">Total Reserves</p>
          <p className="text-2xl font-bold text-purple-800">{formatCurrency(reserveData.totalReserves)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
          <p className="text-sm text-amber-600 font-medium">Reserve Ratio</p>
          <p className="text-2xl font-bold text-amber-800">{reserveData.reserveRatio.toFixed(2)}%</p>
        </div>
        
        <div className={`rounded-xl p-4 ${
          reserveData.isFullyBacked 
            ? 'bg-gradient-to-br from-green-50 to-green-100' 
            : 'bg-gradient-to-br from-red-50 to-red-100'
        }`}>
          <p className={`text-sm font-medium ${reserveData.isFullyBacked ? 'text-green-600' : 'text-red-600'}`}>
            Canonical PSM Coverage
          </p>
          <p className={`text-2xl font-bold ${reserveData.isFullyBacked ? 'text-green-800' : 'text-red-800'}`}>
            {reserveData.isFullyBacked ? 'Covered by Canonical PSM' : 'Below 100% Canonical Coverage'}
          </p>
        </div>
      </div>

      <div className="p-6 border-t">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Reserve Composition</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-32 text-sm text-gray-600">USDC (PSM)</div>
            <div className="flex-1 mx-4">
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${reserveData.reserves.usdc.percentage}%` }}
                ></div>
              </div>
            </div>
            <div className="w-32 text-right">
              <span className="font-semibold">{formatCurrency(reserveData.reserves.usdc.amount)}</span>
              <span className="text-gray-500 text-sm ml-2">({reserveData.reserves.usdc.percentage.toFixed(1)}%)</span>
            </div>
            <span className={`ml-3 px-2 py-1 rounded-full text-xs ${statusClass[reserveData.reserves.usdc.status]}`}>
              {reserveData.labels.live}
            </span>
          </div>

          <div className="flex items-center">
            <div className="w-32 text-sm text-gray-600">T-Bills</div>
            <div className="flex-1 mx-4">
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${reserveData.reserves.tbills.percentage}%` }}
                ></div>
              </div>
            </div>
            <div className="w-32 text-right">
              <span className="font-semibold">{formatCurrency(reserveData.reserves.tbills.amount)}</span>
              <span className="text-gray-500 text-sm ml-2">({reserveData.reserves.tbills.percentage.toFixed(1)}%)</span>
            </div>
            <span className={`ml-3 px-2 py-1 rounded-full text-xs ${statusClass[reserveData.reserves.tbills.status]}`}>
              {reserveData.labels.planned}
            </span>
          </div>

          {reserveData.reserves.tbills.assets.map((asset, index) => (
            <div key={index} className="flex items-center pl-8 text-sm">
              <div className="w-48 text-gray-500">{asset.name}</div>
              <div className="flex-1"></div>
              <div className="text-gray-600 flex items-center gap-2">
                <span>{formatCurrency(asset.amount)}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${statusClass[asset.status]}`}>
                  {asset.status === 'planned' ? reserveData.labels.planned : asset.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-t bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">GENIUS Act Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              reserveData.isFullyBacked ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {reserveData.isFullyBacked ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
              <span className="text-gray-700">Canonical PSM reserve backing</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              reserveData.compliance.yieldDistributionBlocked ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {reserveData.compliance.yieldDistributionBlocked ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="text-gray-700">No Yield to Holders</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
              <span className="text-gray-700">Planned Treasury sleeves are not live</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border">
            <p className="text-sm text-gray-600 mb-4">{reserveData.disclaimer}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Last Disclosure</p>
              <p className="font-medium">{formatDate(reserveData.compliance.lastDisclosure)}</p>
            </div>
            <div>
              <p className="text-gray-500">Next Disclosure Due</p>
              <p className="font-medium">{formatDate(reserveData.compliance.nextDisclosureDue)}</p>
            </div>
          </div>
          {reserveData.compliance.auditorAttestation && (
            <div className="mt-4 pt-4 border-t">
              <a 
                href={reserveData.compliance.auditorAttestation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                View Auditor Attestation →
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-100 text-center text-sm text-gray-500">
        Last updated: {formatDate(reserveData.timestamp)} | Data refreshes every 5 minutes | Treasury Vault balances are excluded from this public reserve snapshot
      </div>
    </div>
  );
}
