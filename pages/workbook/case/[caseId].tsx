import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import EthicalUseModal from '../../../components/workbook/EthicalUseModal';
import AIAssistantPanel from '../../../components/workbook/AIAssistantPanel';
import EvidenceList from '../../../components/workbook/EvidenceList';
import CollisionWarnings from '../../../components/workbook/CollisionWarnings';

interface CaseData {
  id: number;
  caseTitle: string;
  ancestorPrimaryName: string;
  ancestorNameVariants: string[];
  jurisdictionCode: string | null;
  status: string;
  ethicalUseAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  id: number;
  sectionKey: string;
  completionStatus: string;
  blockedReason: string | null;
}

interface Stats {
  completedSections: number;
  totalSections: number;
  evidenceCount: number;
  primarySources: number;
  claimsCount: number;
  verifiedClaims: number;
  openTasks: number;
}

interface EvidenceItem {
  id: number;
  title: string;
  recordType: string;
  primaryOrSecondary: string;
  confidenceLevel: string;
  sourceName: string;
  dateAccessed: Date;
  yearRangeStart: number | null;
  yearRangeEnd: number | null;
  county: string | null;
  state: string | null;
}

interface Collision {
  type: 'name_variant' | 'date_range' | 'location_spread' | 'generation_gap';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEvidenceIds?: number[];
}

type TabKey = 'overview' | 'evidence' | 'claims' | 'tasks' | 'exports' | 'assistant';

const SECTION_LABELS: Record<string, string> = {
  A: 'Section A: Ancestor Identification',
  B: 'Section B: Land Records',
  C: 'Section C: Census & Tax Records',
  D: 'Section D: Probate & Succession',
  E: 'Section E: Chain of Title',
  Courthouse: 'Courthouse Visit Planning',
  Legal: 'Legal Consultation Prep',
  Checklist: 'Final Checklist',
  Exports: 'Export Documents',
};

export default function CaseDetail() {
  const router = useRouter();
  const { caseId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [collisions, setCollisions] = useState<Collision[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEthicalModal, setShowEthicalModal] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState<number>(100);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
      loadEvidence();
      loadUsage();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      const res = await fetch(`/api/workbook/cases/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.data.case);
        setSections(data.data.sections);
        setStats(data.data.stats);
        setCollisions(data.data.collisions || []);
        
        if (!data.data.case.ethicalUseAcceptedAt) {
          setShowEthicalModal(true);
        }
      } else if (res.status === 404) {
        router.push('/workbook');
      }
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvidence = async () => {
    try {
      const res = await fetch(`/api/workbook/evidence?caseId=${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setEvidence(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const res = await fetch('/api/workbook/subscription/status');
      if (res.ok) {
        const data = await res.json();
        const remaining = data.data.usage.limits.assistantCalls - data.data.usage.assistantCalls;
        setUsageRemaining(remaining);
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const handleEthicalAccept = async () => {
    try {
      await fetch(`/api/workbook/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ethicalUseAccepted: true }),
      });
      setCaseData(prev => prev ? { ...prev, ethicalUseAcceptedAt: new Date() } : null);
      setShowEthicalModal(false);
    } catch (error) {
      console.error('Failed to accept ethical use:', error);
    }
  };

  const handleAIAssistant = async (mode: string, message: string, history: { role: string; content: string }[]) => {
    const res = await fetch('/api/workbook/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, mode, message, history }),
    });
    
    if (!res.ok) {
      throw new Error('AI request failed');
    }
    
    const data = await res.json();
    setUsageRemaining(prev => Math.max(0, prev - 1));
    return { response: data.response, hypothesisMode: data.hypothesisMode };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading case...</div>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'evidence', label: `Evidence (${evidence.length})` },
    { key: 'claims', label: 'Claims' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'exports', label: 'Exports' },
    { key: 'assistant', label: 'AI Assistant' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/workbook')}
              className="text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-gray-900">{caseData.caseTitle}</h1>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              caseData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {caseData.status}
            </span>
          </div>
          
          <div className="flex gap-6 border-t pt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Case Information</h2>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Primary Ancestor</dt>
                    <dd className="font-medium">{caseData.ancestorPrimaryName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Jurisdiction</dt>
                    <dd className="font-medium">{caseData.jurisdictionCode || 'Not set'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Name Variants</dt>
                    <dd className="font-medium">
                      {caseData.ancestorNameVariants?.length > 0
                        ? caseData.ancestorNameVariants.join(', ')
                        : 'None recorded'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Sections</h2>
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className={`p-3 rounded-lg border ${
                        section.completionStatus === 'complete'
                          ? 'bg-green-50 border-green-200'
                          : section.completionStatus === 'blocked'
                            ? 'bg-red-50 border-red-200'
                            : section.completionStatus === 'in_progress'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {SECTION_LABELS[section.sectionKey] || section.sectionKey}
                        </span>
                        <span className="text-xs capitalize">
                          {section.completionStatus.replace('_', ' ')}
                        </span>
                      </div>
                      {section.blockedReason && (
                        <p className="text-xs text-red-600 mt-1">{section.blockedReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {stats && (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Statistics</h2>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Sections Complete</dt>
                      <dd className="font-medium">{stats.completedSections} / {stats.totalSections}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Evidence Items</dt>
                      <dd className="font-medium">{stats.evidenceCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Primary Sources</dt>
                      <dd className="font-medium">{stats.primarySources}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Verified Claims</dt>
                      <dd className="font-medium">{stats.verifiedClaims} / {stats.claimsCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Open Tasks</dt>
                      <dd className="font-medium">{stats.openTasks}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {collisions.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <CollisionWarnings warnings={collisions} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Evidence Items</h2>
              <button
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                Add Evidence
              </button>
            </div>
            <EvidenceList items={evidence} />
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Fact Claims</h2>
            <p className="text-gray-500">Fact claims will appear here as you document your research.</p>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Research Tasks</h2>
            <p className="text-gray-500">Tasks will be generated as you progress through your research.</p>
          </div>
        )}

        {activeTab === 'exports' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Export Documents</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <button className="p-4 border rounded-lg text-left hover:border-amber-300 transition">
                <h3 className="font-medium">Research Dossier</h3>
                <p className="text-sm text-gray-500 mt-1">Full PDF with all evidence and claims</p>
              </button>
              <button className="p-4 border rounded-lg text-left hover:border-amber-300 transition">
                <h3 className="font-medium">Evidence Summary</h3>
                <p className="text-sm text-gray-500 mt-1">List of all evidence with citations</p>
              </button>
              <button className="p-4 border rounded-lg text-left hover:border-amber-300 transition">
                <h3 className="font-medium">Research Checklist</h3>
                <p className="text-sm text-gray-500 mt-1">Section-by-section progress report</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <AIAssistantPanel
            caseId={Number(caseId)}
            onSend={handleAIAssistant}
            disabled={!caseData.ethicalUseAcceptedAt}
            usageRemaining={usageRemaining}
            evidenceCount={stats.evidenceCount}
          />
        )}
      </main>

      <EthicalUseModal
        isOpen={showEthicalModal}
        onAccept={handleEthicalAccept}
        onDecline={() => router.push('/workbook')}
      />
    </div>
  );
}
