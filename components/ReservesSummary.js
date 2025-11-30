import React, { useEffect, useState } from "react";

export default function ReservesSummary({ fetchUrl }) {
  const [totalUSD, setTotalUSD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(fetchUrl);
        if (!r.ok) throw new Error("fetch");
        const d = await r.json();
        setTotalUSD(d.totalUSD ?? 0);
      } catch (e) {
        setTotalUSD(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUrl]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="h-6 bg-white/30 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-white/30 rounded w-3/4"></div>
      </div>
    );
  }

  if (totalUSD === null) {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold">Total On-Chain Reserves</h2>
        </div>
        <p className="text-3xl font-bold mb-2">--</p>
        <p className="text-sm opacity-80">Configure wallet tracking to display reserves</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-3">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold">Total On-Chain Reserves</h2>
      </div>
      <p className="text-4xl font-bold mb-2">
        ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <p className="text-sm opacity-80">Aggregated across all tracked wallets</p>
    </div>
  );
}
