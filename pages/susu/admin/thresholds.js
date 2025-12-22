import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { useWallet } from '../../../components/WalletConnect/WalletContext';

const ADMIN_WALLETS = ['0x8d7892cf226b43d48b6e3ce988a1274e6d114c96'];

export default function AdminThresholdsPage() {
  const { walletState } = useWallet();
  const [thresholds, setThresholds] = useState([]);
  const [multipliers, setMultipliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [newValue, setNewValue] = useState('');

  const isAdmin = walletState?.address && 
    ADMIN_WALLETS.includes(walletState.address.toLowerCase());

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const res = await fetch('/api/susu/admin/thresholds');
      if (res.ok) {
        const data = await res.json();
        setThresholds(data.thresholds || []);
        setMultipliers(data.multipliers || []);
      }
    } catch (err) {
      console.error('Failed to fetch thresholds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (thresholdKey) => {
    if (!newValue || isNaN(parseFloat(newValue))) {
      setMessage('Please enter a valid number');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/susu/admin/thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletState?.address || ''
        },
        body: JSON.stringify({
          thresholdKey,
          thresholdValue: parseFloat(newValue)
        })
      });

      if (res.ok) {
        setMessage('Threshold updated successfully');
        setEditingThreshold(null);
        setNewValue('');
        fetchThresholds();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to update threshold');
      }
    } catch (err) {
      setMessage('Failed to update threshold');
    } finally {
      setSaving(false);
    }
  };

  const formatThresholdName = (key) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (key, value) => {
    if (key.includes('usd')) return `$${parseFloat(value).toLocaleString()}`;
    if (key.includes('days')) return `${value} days`;
    if (key.includes('score')) return `${value}/100`;
    return value;
  };

  if (!isAdmin) {
    return (
      <Layout title="Admin - SUSU Thresholds">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl p-8 border border-red-800 max-w-md text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">Access Denied</h2>
            <p className="text-gray-400">
              {walletState?.address 
                ? 'Your wallet is not authorized for admin access.'
                : 'Please connect your admin wallet to access this page.'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="Admin - SUSU Thresholds">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-yellow-400 text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin - SUSU Thresholds">
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400">Capital Mode Thresholds</h1>
              <p className="text-gray-400 mt-2">
                Configure thresholds that trigger Capital Mode for SUSU pools
              </p>
            </div>
            <a 
              href="/susu/admin"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
            >
              ← Back to SUSU Admin
            </a>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('success') 
                ? 'bg-green-900/50 border border-green-700 text-green-400'
                : 'bg-red-900/50 border border-red-700 text-red-400'
            }`}>
              {message}
            </div>
          )}

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Mode Thresholds</h2>
              <p className="text-sm text-gray-400">
                When any threshold is exceeded, the pool enters Capital Mode
              </p>
            </div>
            
            <div className="divide-y divide-gray-800">
              {thresholds.map(threshold => (
                <div key={threshold.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {formatThresholdName(threshold.threshold_key)}
                    </div>
                    <div className="text-sm text-gray-400">{threshold.description}</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {editingThreshold === threshold.threshold_key ? (
                      <>
                        <input
                          type="number"
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                          placeholder="New value"
                        />
                        <button
                          onClick={() => handleSave(threshold.threshold_key)}
                          disabled={saving}
                          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-medium disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingThreshold(null);
                            setNewValue('');
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-bold text-yellow-400">
                          {formatValue(threshold.threshold_key, threshold.threshold_value)}
                        </div>
                        <button
                          onClick={() => {
                            setEditingThreshold(threshold.threshold_key);
                            setNewValue(threshold.threshold_value);
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Purpose Category Multipliers</h2>
              <p className="text-sm text-gray-400">
                Risk multipliers applied based on pool purpose category
              </p>
            </div>
            
            <div className="divide-y divide-gray-800">
              {multipliers.map(mult => (
                <div key={mult.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="font-medium text-white">{mult.category_name}</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {parseFloat(mult.multiplier).toFixed(2)}x
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">How Mode Detection Works</h3>
            <p className="text-gray-300 text-sm">
              Each pool's parameters are evaluated against these thresholds. 
              A risk score (0-100) is calculated based on how close each parameter is to its threshold. 
              The purpose category multiplier adjusts the final risk score. 
              If any threshold is exceeded or the risk score exceeds the maximum, 
              the pool automatically enters Capital Mode with enhanced governance requirements.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
