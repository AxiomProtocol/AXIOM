import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { useWallet } from '../../../components/WalletConnect/WalletContext';

const ADMIN_WALLETS = ['0x8d7892cf226b43d48b6e3ce988a1274e6d114c96'];

export default function AdminTemplatesPage() {
  const { walletState } = useWallet();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    purposeCategoryId: '',
    suggestedContribution: '',
    suggestedCycleDays: '',
    suggestedMemberCount: '',
    rotationMethod: 'sequential'
  });

  const isAdmin = walletState?.address && 
    ADMIN_WALLETS.includes(walletState.address.toLowerCase());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        fetch('/api/susu/templates?activeOnly=false'),
        fetch('/api/susu/categories')
      ]);
      
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('/api/susu/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletState?.address || ''
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setMessage('Template created successfully');
        setShowCreate(false);
        setForm({
          name: '',
          description: '',
          purposeCategoryId: '',
          suggestedContribution: '',
          suggestedCycleDays: '',
          suggestedMemberCount: '',
          rotationMethod: 'sequential'
        });
        fetchData();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to create template');
      }
    } catch (err) {
      setMessage('Failed to create template');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const res = await fetch('/api/susu/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletState?.address || ''
        },
        body: JSON.stringify({
          id: template.id,
          isActive: !template.is_active
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle template:', err);
    }
  };

  if (!isAdmin) {
    return (
      <Layout title="Admin - SUSU Templates">
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
      <Layout title="Admin - SUSU Templates">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-yellow-400 text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin - SUSU Templates">
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400">SUSU Templates</h1>
              <p className="text-gray-400 mt-2">
                Pre-configured pool templates for quick group creation
              </p>
            </div>
            <div className="flex gap-4">
              <a 
                href="/susu/admin"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
              >
                ← Back to SUSU Admin
              </a>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-medium"
              >
                + New Template
              </button>
            </div>
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

          {showCreate && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Create New Template</h2>
              <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="e.g., Emergency Fund Circle"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Purpose Category</label>
                  <select
                    value={form.purposeCategoryId}
                    onChange={(e) => setForm({...form, purposeCategoryId: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                    rows={2}
                    placeholder="Brief description of this template..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Suggested Contribution ($)</label>
                  <input
                    type="number"
                    value={form.suggestedContribution}
                    onChange={(e) => setForm({...form, suggestedContribution: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Suggested Cycle (days)</label>
                  <input
                    type="number"
                    value={form.suggestedCycleDays}
                    onChange={(e) => setForm({...form, suggestedCycleDays: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Suggested Members</label>
                  <input
                    type="number"
                    value={form.suggestedMemberCount}
                    onChange={(e) => setForm({...form, suggestedMemberCount: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rotation Method</label>
                  <select
                    value={form.rotationMethod}
                    onChange={(e) => setForm({...form, rotationMethod: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="sequential">Sequential</option>
                    <option value="randomized">Randomized</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-medium"
                  >
                    Create Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {templates.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
                <p className="text-gray-400">No templates yet. Create your first template above.</p>
              </div>
            ) : (
              templates.map(template => (
                <div 
                  key={template.id} 
                  className={`bg-gray-900 rounded-xl border p-6 ${
                    template.is_active ? 'border-gray-800' : 'border-red-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{template.name}</h3>
                        {template.category_name && (
                          <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-sm">
                            {template.category_name}
                          </span>
                        )}
                        {!template.is_active && (
                          <span className="px-2 py-1 bg-red-400/20 text-red-400 rounded text-sm">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 mt-2">{template.description}</p>
                      <div className="flex gap-6 mt-4 text-sm">
                        <div>
                          <span className="text-gray-500">Contribution: </span>
                          <span className="text-white font-medium">
                            ${parseFloat(template.suggested_contribution || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cycle: </span>
                          <span className="text-white font-medium">
                            {template.suggested_cycle_days} days
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Members: </span>
                          <span className="text-white font-medium">
                            {template.suggested_member_count}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rotation: </span>
                          <span className="text-white font-medium capitalize">
                            {template.rotation_method}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Used: </span>
                          <span className="text-white font-medium">
                            {template.usage_count}x
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        template.is_active
                          ? 'bg-red-900/50 text-red-400 hover:bg-red-900'
                          : 'bg-green-900/50 text-green-400 hover:bg-green-900'
                      }`}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
