import React, { useEffect, useState } from "react";

export default function ProofOfReserves({ fetchUrl }) {
  const [reserves, setReserves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(fetchUrl);
        if (r.status === 204) {
          setReserves([]);
          return setLoading(false);
        }
        if (!r.ok) throw new Error("fetch");
        const d = await r.json();
        setReserves(d.reserves || []);
      } catch (e) {
        setError("Could not load proof of reserves.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchUrl]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">On-Chain Proof of Reserves</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">On-Chain Proof of Reserves</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">On-Chain Proof of Reserves</h2>
      {reserves.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No tracked reserves yet</p>
          <p className="text-gray-400 text-xs mt-1">Configure wallet addresses to begin tracking</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reserves.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{r.chain}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 truncate max-w-[150px]">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.balance} {r.symbol}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">${(r.usdValue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
