import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SubscriptionGate from '../../components/workbook/SubscriptionGate';
import CaseCard from '../../components/workbook/CaseCard';
import CreateCaseModal from '../../components/workbook/CreateCaseModal';

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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (router.query.subscription === 'success') {
      loadData();
    }
  }, [router.query]);

  const loadData = async () => {
    try {
      const statusRes = await fetch('/api/workbook/subscription/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSubscription(statusData.data.subscription);
        setUsage(statusData.data.usage);

        if (statusData.data.subscription.hasAccess) {
          const casesRes = await fetch('/api/workbook/cases');
          if (casesRes.ok) {
            const casesData = await casesRes.json();
            setCases(casesData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load workbook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/workbook/subscription/checkout', {
        method: 'POST',
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
        alert('Checkout is not configured. Please contact support.');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to connect to payment service. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCreateCase = async (data: { caseTitle: string; ancestorPrimaryName: string; ancestorNameVariants: string[]; jurisdictionCode: string }) => {
    setCreating(true);
    try {
      const res = await fetch('/api/workbook/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        router.push(`/workbook/case/${result.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create case:', error);
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!subscription?.hasAccess) {
    return <SubscriptionGate onSubscribe={handleSubscribe} isLoading={checkoutLoading} />;
  }

  const activeCases = cases.filter(c => c.status !== 'archived');
  const archivedCases = cases.filter(c => c.status === 'archived');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Land Reclamation Workbook</h1>
              <p className="text-sm text-gray-600 mt-1">Organize your genealogical land research</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
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
                    style={{ width: `${(usage.assistantCalls / usage.limits.assistantCalls) * 100}%` }}
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
                    style={{ width: `${(usage.docExtractions / usage.limits.docExtractions) * 100}%` }}
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
                    style={{ width: `${(usage.exportsGenerated / usage.limits.exportsGenerated) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Cases ({activeCases.length})</h2>
          {activeCases.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500 mb-4">No cases yet. Start your first research case.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                Create Your First Case
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCases.map((c) => (
                <CaseCard key={c.id} {...c} />
              ))}
            </div>
          )}
        </section>

        {archivedCases.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Archived Cases ({archivedCases.length})</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedCases.map((c) => (
                <CaseCard key={c.id} {...c} />
              ))}
            </div>
          </section>
        )}
      </main>

      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCase}
        isLoading={creating}
      />
    </div>
  );
}
