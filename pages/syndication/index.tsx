import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';

interface Offering {
  id: string;
  name: string;
  slug: string;
  status: string;
  offering_type: string;
  target_raise: string | null;
  total_committed: string;
  total_funded: string;
  pipeline_count: string;
  subscription_count: string;
  created_at: string;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'DRAFT',
  structuring: 'STRUCTURING',
  raising: 'RAISING',
  funded: 'FUNDED',
  closed: 'CLOSED',
  active: 'ACTIVE',
  winding_down: 'WINDING DOWN',
  dissolved: 'DISSOLVED',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  structuring: 'bg-blue-50 text-blue-700',
  raising: 'bg-green-50 text-green-700',
  funded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-700',
  active: 'bg-emerald-50 text-emerald-700',
  winding_down: 'bg-orange-50 text-orange-700',
  dissolved: 'bg-red-50 text-red-700',
};

export default function SyndicationDashboard() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    offeringType: 'clubDeal',
    entityType: 'spv',
    description: '',
    targetRaise: '',
    minimumInvestment: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/syndication/offerings');
        const json = await res.json();
        if (json.success) {
          setOfferings(json.offerings);
        } else {
          setError(json.error || 'Failed to load offerings');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateOffering = async () => {
    if (!newForm.name || !newForm.offeringType) return;
    setCreating(true);
    try {
      const res = await fetch('/api/syndication/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const json = await res.json();
      if (json.success && json.offeringId) {
        router.push(`/syndication/offerings/${json.offeringId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const totalRaiseTarget = offerings.reduce((s, o) => s + parseFloat(o.target_raise || '0'), 0);
  const totalCommitted = offerings.reduce((s, o) => s + parseFloat(o.total_committed || '0'), 0);
  const totalFunded = offerings.reduce((s, o) => s + parseFloat(o.total_funded || '0'), 0);
  const activeOfferings = offerings.filter(o => ['raising', 'active', 'funded'].includes(o.status));

  return (
    <DesignLawLayout>
      <Head>
        <title>Syndication | AXIOM</title>
      </Head>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-dl-serif text-2xl text-dl-navy">Capital Formation</h1>
            <p className="font-dl-mono text-xs text-dl-muted mt-1">
              Manage offerings, investor pipeline, subscriptions, and capital tables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNew(!showNew)}
              className="px-4 py-2 bg-dl-navy text-white font-dl-mono text-xs"
            >
              {showNew ? 'Cancel' : 'New Offering'}
            </button>
            <Link href="/deal-intelligence" className="px-4 py-2 border border-dl-border text-dl-navy font-dl-mono text-xs">
              Source Deals
            </Link>
          </div>
        </div>

        {showNew && (
          <div className="border border-dl-navy p-6 mb-6 bg-gray-50">
            <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Create New Offering</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Offering Name</label>
                <input
                  value={newForm.name}
                  onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Atlanta Multifamily Fund I"
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Offering Type</label>
                <select
                  value={newForm.offeringType}
                  onChange={e => setNewForm(p => ({ ...p, offeringType: e.target.value }))}
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                >
                  <option value="regD506b">Reg D 506(b)</option>
                  <option value="regD506c">Reg D 506(c)</option>
                  <option value="regCF">Reg CF</option>
                  <option value="communityPool">Community Pool</option>
                  <option value="clubDeal">Club Deal</option>
                  <option value="pilotOffering">Pilot Offering</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Entity Type</label>
                <select
                  value={newForm.entityType}
                  onChange={e => setNewForm(p => ({ ...p, entityType: e.target.value }))}
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                >
                  <option value="spv">SPV (Special Purpose Vehicle)</option>
                  <option value="llc">LLC</option>
                  <option value="lp">Limited Partnership</option>
                  <option value="trust">Trust</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Target Raise ($)</label>
                <input
                  type="number"
                  value={newForm.targetRaise}
                  onChange={e => setNewForm(p => ({ ...p, targetRaise: e.target.value }))}
                  placeholder="500000"
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Minimum Investment ($)</label>
                <input
                  type="number"
                  value={newForm.minimumInvestment}
                  onChange={e => setNewForm(p => ({ ...p, minimumInvestment: e.target.value }))}
                  placeholder="25000"
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Description</label>
                <input
                  value={newForm.description}
                  onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief offering description"
                  className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateOffering}
                disabled={creating || !newForm.name}
                className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Offering'}
              </button>
              <p className="font-dl-mono text-xs text-dl-muted">
                Or create from an analyzed deal in the Deal Intelligence workspace.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-dl-border p-4">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Total Offerings</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{offerings.length}</p>
          </div>
          <div className="border border-dl-border p-4">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Active</p>
            <p className="font-dl-serif text-2xl text-green-700">{activeOfferings.length}</p>
          </div>
          <div className="border border-dl-border p-4">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Total Raise Target</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{fmt(totalRaiseTarget)}</p>
          </div>
          <div className="border border-dl-border p-4">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Capital Committed</p>
            <p className="font-dl-serif text-2xl text-green-700">{fmt(totalCommitted)}</p>
          </div>
        </div>

        {loading && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-sm text-dl-muted">Loading offerings...</p>
          </div>
        )}

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 mb-4">
            <p className="font-dl-mono text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && offerings.length === 0 && !showNew && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-sm text-dl-muted mb-3">
              No offerings yet. Create one directly or from an analyzed deal.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowNew(true)}
                className="px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm"
              >
                New Offering
              </button>
              <Link href="/deal-intelligence" className="inline-block px-6 py-2 border border-dl-border text-dl-navy font-dl-mono text-sm">
                Source from Deal Intelligence
              </Link>
            </div>
          </div>
        )}

        {offerings.length > 0 && (
          <div className="border border-dl-border">
            <table className="w-full font-dl-mono text-sm">
              <thead>
                <tr className="bg-dl-bg border-b border-dl-border text-left">
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase">Offering</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase">Type</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase text-right">Target Raise</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase text-right">Committed</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase text-right">Pipeline</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase text-right">Subscriptions</th>
                  <th className="px-4 py-3 text-xs text-dl-muted uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map(o => {
                  const target = parseFloat(o.target_raise || '0');
                  const committed = parseFloat(o.total_committed || '0');
                  const pct = target > 0 ? Math.min(100, (committed / target) * 100) : 0;

                  return (
                    <tr key={o.id} className="border-b border-dl-border hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/syndication/offerings/${o.id}`} className="text-dl-navy hover:underline">
                          {o.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-dl-muted text-xs uppercase">{o.offering_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{target > 0 ? fmt(target) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {target > 0 && (
                            <div className="w-16 h-1.5 bg-gray-200">
                              <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          <span>{committed > 0 ? fmt(committed) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{o.pipeline_count}</td>
                      <td className="px-4 py-3 text-right">{o.subscription_count}</td>
                      <td className="px-4 py-3 text-dl-muted text-xs">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
