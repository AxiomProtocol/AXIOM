import React, { useEffect, useState } from "react";

export default function GrowthMetric({ fetchUrl }) {
  const [g, setG] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(fetchUrl);
        if (!r.ok) throw new Error();
        const d = await r.json();
        const h = d.history || [];
        if (h.length >= 2) {
          const first = h[0]?.totalUSD;
          const last = h[h.length - 1]?.totalUSD;
          if (first !== undefined && last !== undefined && first !== 0) {
            const pct = ((last - first) / first) * 100;
            setG({ percentage: pct.toFixed(1), start: first, end: last });
          }
        }
      } catch (e) {
        console.error("Failed to load growth data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUrl]);

  const formatValue = (val) => {
    if (val === undefined || val === null) return "N/A";
    return typeof val === 'number' ? val.toLocaleString() : String(val);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg p-8 animate-pulse">
        <div className="h-6 bg-white/30 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-white/30 rounded w-3/4"></div>
      </div>
    );
  }

  if (!g) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h2 className="text-xl font-semibold">Cumulative Growth</h2>
        </div>
        <p className="text-3xl font-bold mb-2">--</p>
        <p className="text-sm opacity-80">Growth data will appear once tracking begins</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-3">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h2 className="text-xl font-semibold">Cumulative Growth</h2>
      </div>
      <p className="text-4xl font-bold mb-2">{g.percentage}%</p>
      <p className="text-sm opacity-80">
        Since launch (${formatValue(g.start)} → ${formatValue(g.end)})
      </p>
    </div>
  );
}
