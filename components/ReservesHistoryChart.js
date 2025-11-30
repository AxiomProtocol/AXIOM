import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReservesHistoryChart({ fetchUrl }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(fetchUrl);
        if (r.status === 204) {
          setHistory([]);
        } else {
          const d = await r.json();
          setHistory(d.history || []);
        }
      } catch (e) {
        console.error("Failed to load reserves history:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUrl]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reserves Over Time</h2>
        <div className="h-80 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
          <p className="text-gray-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reserves Over Time</h2>
        <div className="h-80 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No historical data available yet</p>
            <p className="text-gray-400 text-xs mt-1">Chart will populate as reserves are tracked over time</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Reserves Over Time</h2>
      <div className="h-80">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip 
              formatter={v => [`$${Number(v).toLocaleString()}`, "Total USD"]}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="totalUSD" 
              stroke="#f59e0b" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#f59e0b' }}
              activeDot={{ r: 6, fill: '#d97706' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
