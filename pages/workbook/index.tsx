import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
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

const QUICK_START_STEPS = [
  { step: 1, title: 'Create Your First Case', description: 'Start with your oldest known ancestor who owned land', icon: '📋', color: 'bg-amber-500' },
  { step: 2, title: 'Search Historical Records', description: 'Find census, deed, and vital records from 22+ billion documents', icon: '🔍', color: 'bg-blue-500' },
  { step: 3, title: 'Build Your Family Tree', description: 'Connect family members and track relationships through generations', icon: '🌳', color: 'bg-green-500' },
  { step: 4, title: 'Document the Land Chain', description: 'Trace property ownership from original patent to present', icon: '🔗', color: 'bg-purple-500' },
  { step: 5, title: 'Generate Legal Documents', description: 'Create state-specific affidavits and heirs reports', icon: '⚖️', color: 'bg-slate-500' },
];

const FEATURE_CATEGORIES = [
  {
    category: 'Research Tools',
    icon: '🔍',
    features: [
      { name: 'AI-Powered Search', desc: 'Search 22+ billion historical records across multiple databases' },
      { name: 'Census Records', desc: '1870-1950 federal census with name matching' },
      { name: "Freedmen's Bureau", desc: 'Labor contracts, marriages, and bank records' },
      { name: 'Land Patents', desc: 'BLM/GLO federal land patent search' },
    ]
  },
  {
    category: 'Organization',
    icon: '📋',
    features: [
      { name: 'Research Cases', desc: 'Organize research by ancestor or property' },
      { name: 'Family Tree Builder', desc: 'Visual genealogy with relationships' },
      { name: 'Title Chain Tracker', desc: 'Deed-to-deed ownership history with gap detection' },
      { name: 'Research Timeline', desc: 'Chronological view of family events' },
    ]
  },
  {
    category: 'Legal & Documents',
    icon: '⚖️',
    features: [
      { name: 'Affidavit Generator', desc: 'State-specific templates for all 50 states' },
      { name: 'Heirs Calculator', desc: 'Calculate fractional ownership shares' },
      { name: 'Legal Templates', desc: 'UPHPA status and intestate rules by state' },
      { name: 'Report Export', desc: 'Generate comprehensive research reports' },
    ]
  },
  {
    category: 'Collaboration',
    icon: '👥',
    features: [
      { name: 'Family Collaboration', desc: 'Invite relatives to contribute research' },
      { name: 'AI Research Assistant', desc: 'Expert guidance on heir property law' },
      { name: 'Dawes Roll Search', desc: 'Five Civilized Tribes enrollment records' },
      { name: 'County Records Links', desc: 'Direct links to recorder offices' },
    ]
  },
];

const HEIR_PROPERTY_FACTS = [
  { stat: '$28B', label: 'Estimated value of heir property in the U.S.', source: 'Federation of Southern Cooperatives' },
  { stat: '60%', label: 'Of Black-owned land lost since 1920', source: 'USDA Census of Agriculture' },
  { stat: '3.5M', label: 'Families affected by unclear land titles', source: 'Uniform Law Commission' },
  { stat: '18', label: 'States that have adopted UPHPA protections', source: 'Uniform Law Commission 2024' },
];

const LEARNING_RESOURCES = [
  { title: 'What is Heir Property?', description: 'Land passed down without a will, creating shared ownership among descendants', icon: '📖', link: '#' },
  { title: 'Why It Matters', description: 'Heir property owners cannot get USDA loans, face partition sales, and lose generational wealth', icon: '⚠️', link: '#' },
  { title: 'The UPHPA', description: 'The Uniform Partition of Heirs Property Act provides protections against forced sales', icon: '🛡️', link: '#' },
  { title: 'Steps to Clear Title', description: 'Learn the process to establish clear ownership and protect your family land', icon: '✅', link: '#' },
];

const ALL_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
];

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
  const [activeTab, setActiveTab] = useState<'cases' | 'learn' | 'tools'>('cases');

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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your workbook...</p>
        </div>
      </div>
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
        <meta name="description" content="Research heir property, trace family land ownership, and protect generational wealth" />
      </Head>

      <EthicalUseModal 
        isOpen={showEthicalModal}
        onAccept={handleEthicalAccept}
        onDecline={handleEthicalDecline}
      />

      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-gray-50">
        <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">📜</span>
                  <div>
                    <h1 className="text-3xl font-bold">Land Reclamation Workbook</h1>
                    <p className="text-amber-100 text-lg">Trace Your Roots. Reclaim Your Land.</p>
                  </div>
                </div>
                <p className="text-amber-200 mt-3 max-w-2xl">
                  The most comprehensive heir property research platform. Search 22+ billion historical records, 
                  build family trees, track property chains, and generate legal documents.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!ethicalAccepted) {
                    setShowEthicalModal(true);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-6 py-3 bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition font-semibold shadow-lg flex items-center gap-2"
              >
                <span className="text-xl">+</span> New Research Case
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-8">
              {HEIR_PROPERTY_FACTS.map((fact, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-white">{fact.stat}</div>
                  <div className="text-amber-100 text-sm mt-1">{fact.label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {subscription.isPastDue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800">Payment Past Due</p>
                <p className="text-yellow-700 text-sm">Please update your payment method to continue using all features.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6 border-b">
            {[
              { id: 'cases', label: 'My Cases', icon: '📋' },
              { id: 'learn', label: 'Learn', icon: '📖' },
              { id: 'tools', label: 'All Tools', icon: '🛠️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition ${
                  activeTab === tab.id 
                    ? 'border-amber-500 text-amber-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'cases' && (
            <>
              <div 
                onClick={() => router.push('/workbook/search')}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-8 cursor-pointer hover:shadow-xl transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">🔍</span>
                      <h2 className="text-2xl font-bold">Search Historical Records</h2>
                    </div>
                    <p className="text-emerald-100 mb-4 max-w-xl">
                      Access 22+ billion records including census data, land patents, Freedmen's Bureau records, 
                      vital records, and military service files.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {['FamilySearch', 'Census 1870-1950', 'BLM Land Patents', "Freedmen's Bureau", 'Fold3 Military'].map(source => (
                        <span key={source} className="bg-white/20 px-3 py-1 rounded-full">{source}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-white text-4xl group-hover:translate-x-2 transition-transform">→</div>
                </div>
              </div>

              {usage && (
                <div className="bg-white rounded-xl border shadow-sm p-5 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Monthly Usage</h3>
                    <span className="text-sm text-gray-500">Resets monthly</span>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'AI Assistant Calls', used: usage.assistantCalls, limit: usage.limits.assistantCalls, icon: '🤖' },
                      { label: 'Document Extractions', used: usage.docExtractions, limit: usage.limits.docExtractions, icon: '📄' },
                      { label: 'Report Exports', used: usage.exportsGenerated, limit: usage.limits.exportsGenerated, icon: '📊' },
                    ].map((item, i) => (
                      <div key={i} className="text-center">
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <div className="text-2xl font-bold text-gray-900">{item.used} <span className="text-gray-400 text-lg">/ {item.limit}</span></div>
                        <div className="text-sm text-gray-500 mb-2">{item.label}</div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              (item.used / item.limit) > 0.8 ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCases.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-12">
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">🌱</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Start Your Land Reclamation Journey</h3>
                    <p className="text-gray-600 mb-8">
                      Create your first research case to begin tracing your family's land history. 
                      We'll guide you through searching records, building your family tree, and documenting the chain of ownership.
                    </p>

                    <div className="grid md:grid-cols-5 gap-4 mb-8">
                      {QUICK_START_STEPS.map(step => (
                        <div key={step.step} className="text-center">
                          <div className={`w-12 h-12 ${step.color} text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl`}>
                            {step.icon}
                          </div>
                          <div className="text-xs font-medium text-gray-900">{step.title}</div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        if (!ethicalAccepted) {
                          setShowEthicalModal(true);
                        } else {
                          setShowCreateModal(true);
                        }
                      }}
                      className="px-8 py-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition font-semibold text-lg shadow-lg"
                    >
                      Create Your First Case
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Your Research Cases ({activeCases.length})</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeCases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => router.push(`/workbook/case/${c.id}`)}
                        className="bg-white rounded-xl border p-5 hover:shadow-lg hover:border-amber-300 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl group-hover:bg-amber-200 transition">
                            📋
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            c.status === 'active' ? 'bg-green-100 text-green-700' :
                            c.status === 'research' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-amber-600 transition">{c.caseTitle}</h3>
                        <p className="text-sm text-gray-600 mb-3">{c.ancestorPrimaryName}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{c.jurisdictionCode || 'No location'}</span>
                          <span>Updated {new Date(c.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div
                      onClick={() => {
                        if (!ethicalAccepted) {
                          setShowEthicalModal(true);
                        } else {
                          setShowCreateModal(true);
                        }
                      }}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-5 hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer flex flex-col items-center justify-center min-h-[160px]"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-2">+</div>
                      <span className="font-medium text-gray-600">New Case</span>
                    </div>
                  </div>
                </div>
              )}

              {archivedCases.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-500 mb-4">Archived Cases ({archivedCases.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                    {archivedCases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => router.push(`/workbook/case/${c.id}`)}
                        className="bg-white rounded-xl border p-4 hover:shadow-md transition cursor-pointer"
                      >
                        <h3 className="font-semibold text-gray-900 mb-1">{c.caseTitle}</h3>
                        <p className="text-sm text-gray-600">{c.ancestorPrimaryName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'learn' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Understanding Heir Property</h2>
                <p className="text-blue-100 mb-6 max-w-3xl">
                  Heir property is land that has been passed down through generations without a clear will, 
                  resulting in multiple family members owning undivided fractional interests. This affects 
                  an estimated <strong>3.5 million families</strong> and <strong>$28 billion</strong> in 
                  property value across the United States.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {LEARNING_RESOURCES.map((resource, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div className="text-3xl mb-2">{resource.icon}</div>
                      <h3 className="font-semibold mb-1">{resource.title}</h3>
                      <p className="text-blue-100 text-sm">{resource.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">The Research Process</h2>
                <div className="space-y-6">
                  {QUICK_START_STEPS.map((step, i) => (
                    <div key={step.step} className="flex gap-4">
                      <div className={`w-12 h-12 ${step.color} text-white rounded-full flex items-center justify-center text-xl flex-shrink-0`}>
                        {step.icon}
                      </div>
                      <div className="pt-2">
                        <h3 className="font-semibold text-gray-900">Step {step.step}: {step.title}</h3>
                        <p className="text-gray-600 mt-1">{step.description}</p>
                        {i < QUICK_START_STEPS.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-200 ml-6 mt-4"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-4">Key Records to Search</h3>
                  <ul className="space-y-3 text-amber-800">
                    <li className="flex items-start gap-2"><span>📊</span> <strong>Census Records (1870-1950)</strong> - First census after slavery includes formerly enslaved persons</li>
                    <li className="flex items-start gap-2"><span>📜</span> <strong>Freedmen's Bureau</strong> - Labor contracts, marriages, and bank records (1865-1872)</li>
                    <li className="flex items-start gap-2"><span>🗺️</span> <strong>Land Patents</strong> - Original federal land grants from BLM/GLO</li>
                    <li className="flex items-start gap-2"><span>📄</span> <strong>Deed Records</strong> - County recorder offices track all property transfers</li>
                    <li className="flex items-start gap-2"><span>⚖️</span> <strong>Probate Records</strong> - Wills, estate inventories, and heir determinations</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-green-900 mb-4">UPHPA Protection States (18)</h3>
                  <p className="text-green-700 text-sm mb-3">
                    The Uniform Partition of Heirs Property Act provides protections against forced partition sales.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['AL', 'AR', 'CT', 'FL', 'GA', 'HI', 'IL', 'IA', 'MD', 'MO', 'MT', 'NV', 'NM', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA'].map(state => (
                      <span key={state} className="px-2 py-1 bg-green-200 text-green-800 rounded text-sm font-medium">{state}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-8">
              <p className="text-gray-600 max-w-2xl">
                The Land Reclamation Workbook includes 17+ specialized tools designed specifically for heir property research. 
                Access these tools from any research case.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {FEATURE_CATEGORIES.map((category, i) => (
                  <div key={i} className="bg-white rounded-2xl border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{category.icon}</span>
                      <h3 className="text-xl font-bold text-gray-900">{category.category}</h3>
                    </div>
                    <div className="space-y-3">
                      {category.features.map((feature, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <div className="font-medium text-gray-900">{feature.name}</div>
                            <div className="text-sm text-gray-600">{feature.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="bg-gray-900 text-white py-12 mt-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold text-lg mb-4">Land Reclamation Workbook</h4>
                <p className="text-gray-400 text-sm">
                  A product of Axiom Protocol. Helping families research, document, and reclaim 
                  their ancestral land through technology and community.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4">External Resources</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="https://www.familysearch.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">FamilySearch (Free)</a></li>
                  <li><a href="https://glorecords.blm.gov" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">BLM Land Patents</a></li>
                  <li><a href="https://www.archives.gov/research/african-americans/freedmens-bureau" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Freedmen's Bureau at NARA</a></li>
                  <li><a href="https://www.uniformlaws.org/committees/community-home?CommunityKey=50724584-e808-4255-bc5d-8ea4e588371d" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">UPHPA Information</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4">Need Help?</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Use the AI Research Assistant within any case for expert guidance on heir property research.
                </p>
                <Link href="/workbook/case/1/assistant" className="text-amber-400 hover:text-amber-300 text-sm">
                  Try the AI Assistant →
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">📋</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Research Case</h2>
                <p className="text-gray-500 text-sm">Start tracing your family's land history</p>
              </div>
            </div>
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
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., James Johnson"
                />
                <p className="text-xs text-gray-500 mt-1">The oldest known ancestor who owned the land</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name Variants (comma-separated)
                </label>
                <input
                  type="text"
                  value={newCase.ancestorNameVariants}
                  onChange={(e) => setNewCase({ ...newCase, ancestorNameVariants: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Jim Johnson, J. Johnson, James Johnsen"
                />
                <p className="text-xs text-gray-500 mt-1">Include spelling variations and nicknames</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary State
                </label>
                <select
                  value={newCase.jurisdictionCode}
                  onChange={(e) => setNewCase({ ...newCase, jurisdictionCode: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select state...</option>
                  {ALL_STATES.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 font-medium"
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
