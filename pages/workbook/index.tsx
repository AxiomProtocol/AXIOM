import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SubscriptionGate from '../../components/workbook/SubscriptionGate';
import EthicalUseModal from '../../components/workbook/EthicalUseModal';

interface WorkbookCase {
  id: number;
  caseTitle: string;
  ancestorPrimaryName: string;
  status: string;
  jurisdictionCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionStatus {
  hasAccess: boolean;
  isActive: boolean;
  isPastDue: boolean;
  periodEnd?: string;
}

interface UsageStats {
  assistantCalls: number;
  docExtractions: number;
  exportsGenerated: number;
  limits: {
    assistantCalls: number;
    docExtractions: number;
    exportsGenerated: number;
  };
}

export default function WorkbookDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<WorkbookCase[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showEthicalModal, setShowEthicalModal] = useState(false);
  const [ethicalAccepted, setEthicalAccepted] = useState(false);

  const [newCase, setNewCase] = useState({
    caseTitle: '',
    ancestorPrimaryName: '',
    ancestorNameVariants: '',
    jurisdictionCode: '',
  });

  useEffect(() => {
    const accepted = localStorage.getItem('workbook-ethical-accepted');
    if (accepted === 'true') {
      setEthicalAccepted(true);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (router.query.subscription === 'success') {
      loadData();
    }
  }, [router.query]);

  const loadData = async () => {
    try {
      const statusRes = await fetch('/api/workbook/subscription/status', {
        credentials: 'include',
      });
      
      if (statusRes.status === 401) {
        setSubscription({ hasAccess: false, isActive: false, isPastDue: false });
        setLoading(false);
        return;
      }
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSubscription(statusData.data?.subscription || { hasAccess: false, isActive: false, isPastDue: false });
        setUsage(statusData.data?.usage || null);

        if (statusData.data?.subscription?.hasAccess) {
          const casesRes = await fetch('/api/workbook/cases', {
            credentials: 'include',
          });
          if (casesRes.ok) {
            const casesData = await casesRes.json();
            setCases(casesData.data || []);
          }
        }
      } else {
        setSubscription({ hasAccess: false, isActive: false, isPastDue: false });
      }
    } catch (error) {
      console.error('Failed to load workbook data:', error);
      setSubscription({ hasAccess: false, isActive: false, isPastDue: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/workbook/subscription/checkout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      
      if (res.status === 401) {
        alert('Please connect your wallet and sign in first to subscribe.');
        setCheckoutLoading(false);
        return;
      }
      
      if (!res.ok) {
        alert(data.error || 'Failed to start checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Checkout is being configured. Please check back soon or contact support.');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to connect to payment service. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ethicalAccepted) {
      setShowEthicalModal(true);
      return;
    }

    setCreating(true);
    try {
      const variants = newCase.ancestorNameVariants
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const res = await fetch('/api/workbook/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseTitle: newCase.caseTitle,
          ancestorPrimaryName: newCase.ancestorPrimaryName,
          ancestorNameVariants: variants,
          jurisdictionCode: newCase.jurisdictionCode || null,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        router.push(`/workbook/case/${result.data.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create case');
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case. Please try again.');
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleEthicalAccept = () => {
    localStorage.setItem('workbook-ethical-accepted', 'true');
    setEthicalAccepted(true);
    setShowEthicalModal(false);
  };

  const handleEthicalDecline = () => {
    setShowEthicalModal(false);
    router.push('/reclaim');
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading workbook...</p>
          </div>
        </div>
      </>
    );
  }

  if (!subscription?.hasAccess) {
    return (
      <>
        <Head>
          <title>Land Reclamation Workbook | Axiom Protocol</title>
          <meta name="description" content="Organize your genealogical land research with AI assistance" />
        </Head>
        <SubscriptionGate onSubscribe={handleSubscribe} isLoading={checkoutLoading} />
      </>
    );
  }

  const activeCases = cases.filter(c => c.status !== 'archived');
  const archivedCases = cases.filter(c => c.status === 'archived');

  return (
    <>
      <Head>
        <title>Land Reclamation Workbook | Axiom Protocol</title>
        <meta name="description" content="Organize your genealogical land research with AI assistance" />
      </Head>

      <EthicalUseModal 
        isOpen={showEthicalModal}
        onAccept={handleEthicalAccept}
        onDecline={handleEthicalDecline}
      />

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Land Reclamation Workbook</h1>
                <p className="text-sm text-gray-600 mt-1">Organize your genealogical land research</p>
              </div>
              <button
                onClick={() => {
                  if (!ethicalAccepted) {
                    setShowEthicalModal(true);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                New Case
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {subscription.isPastDue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                Your subscription payment is past due. Please update your payment method to continue using all features.
              </p>
            </div>
          )}

          {usage && (
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Monthly Usage</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">AI Calls</div>
                  <div className="text-lg font-semibold">
                    {usage.assistantCalls} / {usage.limits.assistantCalls}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${Math.min((usage.assistantCalls / usage.limits.assistantCalls) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Extractions</div>
                  <div className="text-lg font-semibold">
                    {usage.docExtractions} / {usage.limits.docExtractions}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${Math.min((usage.docExtractions / usage.limits.docExtractions) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Exports</div>
                  <div className="text-lg font-semibold">
                    {usage.exportsGenerated} / {usage.limits.exportsGenerated}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${Math.min((usage.exportsGenerated / usage.limits.exportsGenerated) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCases.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Research Cases Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first research case to start organizing your genealogical land research.
              </p>
              <button
                onClick={() => {
                  if (!ethicalAccepted) {
                    setShowEthicalModal(true);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                Create First Case
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Cases ({activeCases.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/workbook/case/${c.id}`)}
                    className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{c.caseTitle}</h3>
                    <p className="text-sm text-gray-600 mb-2">{c.ancestorPrimaryName}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'research' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {c.status}
                      </span>
                      <span>{c.jurisdictionCode || 'No jurisdiction'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {archivedCases.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-gray-500">Archived Cases ({archivedCases.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                {archivedCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/workbook/case/${c.id}`)}
                    className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{c.caseTitle}</h3>
                    <p className="text-sm text-gray-600">{c.ancestorPrimaryName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Research Case</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Title *
                </label>
                <input
                  type="text"
                  required
                  value={newCase.caseTitle}
                  onChange={(e) => setNewCase({ ...newCase, caseTitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Johnson Family Land - Holmes County"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Ancestor Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCase.ancestorPrimaryName}
                  onChange={(e) => setNewCase({ ...newCase, ancestorPrimaryName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., James Johnson"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name Variants (comma-separated)
                </label>
                <input
                  type="text"
                  value={newCase.ancestorNameVariants}
                  onChange={(e) => setNewCase({ ...newCase, ancestorNameVariants: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Jim Johnson, J. Johnson, James Johnsen"
                />
                <p className="text-xs text-gray-500 mt-1">Include spelling variations and nicknames</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Jurisdiction (State)
                </label>
                <select
                  value={newCase.jurisdictionCode}
                  onChange={(e) => setNewCase({ ...newCase, jurisdictionCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select state...</option>
                  <option value="AL">Alabama</option>
                  <option value="GA">Georgia</option>
                  <option value="LA">Louisiana</option>
                  <option value="MS">Mississippi</option>
                  <option value="NC">North Carolina</option>
                  <option value="SC">South Carolina</option>
                  <option value="TX">Texas</option>
                  <option value="VA">Virginia</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
