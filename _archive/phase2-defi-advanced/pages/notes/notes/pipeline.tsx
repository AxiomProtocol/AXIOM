import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Note {
  noteId: string;
  submittedAt: string;
  sellerName: string;
  performanceStatus: string;
  noteType: string;
  unpaidPrincipalBalance: number;
  askingPrice: number;
  discountFromUPB: number;
  ltv: number;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyType: string;
  monthsDelinquent: number;
  status: string;
  pipelinePhase: string;
}

interface Stats {
  totalNotes: number;
  submitted: number;
  inDueDiligence: number;
  pendingAttestation: number;
  approved: number;
  acquired: number;
  rejected: number;
  totalUPB: number;
  totalAskingPrice: number;
  averageDiscount: number;
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  INTAKE_REVIEW: 'bg-blue-100 text-blue-700',
  DUE_DILIGENCE: 'bg-yellow-100 text-yellow-700',
  VALUATION: 'bg-purple-100 text-purple-700',
  ATTESTATION_PENDING: 'bg-orange-100 text-orange-700',
  ATTESTED: 'bg-teal-100 text-teal-700',
  ACQUISITION_APPROVED: 'bg-green-100 text-green-700',
  ACQUIRED: 'bg-green-200 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-700'
};

const PERFORMANCE_COLORS: Record<string, string> = {
  PERFORMING: 'bg-green-100 text-green-700',
  SUB_PERFORMING: 'bg-yellow-100 text-yellow-700',
  NON_PERFORMING: 'bg-red-100 text-red-700',
  REO: 'bg-purple-100 text-purple-700'
};

const PIPELINE_STAGES = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'DUE_DILIGENCE', label: 'Due Diligence' },
  { key: 'VALUATION', label: 'Valuation' },
  { key: 'ATTESTATION_PENDING', label: 'Attestation' },
  { key: 'ACQUISITION_APPROVED', label: 'Approved' },
  { key: 'ACQUIRED', label: 'Acquired' }
];

export default function NotePipelinePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPerformance, setFilterPerformance] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/notes/list');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const filteredNotes = notes.filter(note => {
    if (filterStatus !== 'ALL' && note.status !== filterStatus) return false;
    if (filterPerformance !== 'ALL' && note.performanceStatus !== filterPerformance) return false;
    return true;
  });

  const getStageCount = (stage: string) => {
    if (stage === 'SUBMITTED') {
      return notes.filter(n => n.status === 'SUBMITTED' || n.status === 'INTAKE_REVIEW').length;
    }
    return notes.filter(n => n.status === stage).length;
  };

  return (
    <>
      <Head>
        <title>Note Acquisition Pipeline | Axiom Protocol</title>
        <meta name="description" content="Track mortgage note acquisition pipeline and research progress" />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Note Acquisition Pipeline</h1>
              <p className="text-gray-600 mt-1">Research and acquire performing & non-performing notes</p>
            </div>
            <Link href="/notes/submit" className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Note
            </Link>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.totalNotes}</div>
                <div className="text-sm text-gray-500">Total Notes</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-teal-600">{formatUSD(stats.totalUPB)}</div>
                <div className="text-sm text-gray-500">Total UPB</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{formatUSD(stats.totalAskingPrice)}</div>
                <div className="text-sm text-gray-500">Total Asking</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">{stats.averageDiscount.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Avg Discount</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{stats.inDueDiligence}</div>
                <div className="text-sm text-gray-500">In Due Diligence</div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-8 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div key={stage.key} className="flex items-center">
                  <div className={`px-4 py-2 rounded-lg text-center min-w-[100px] ${
                    getStageCount(stage.key) > 0 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <div className="text-lg font-bold">{getStageCount(stage.key)}</div>
                    <div className="text-xs">{stage.label}</div>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <svg className="w-6 h-6 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="DUE_DILIGENCE">Due Diligence</option>
              <option value="VALUATION">Valuation</option>
              <option value="ATTESTATION_PENDING">Attestation Pending</option>
              <option value="ACQUIRED">Acquired</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select value={filterPerformance} onChange={(e) => setFilterPerformance(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500">
              <option value="ALL">All Performance</option>
              <option value="PERFORMING">Performing</option>
              <option value="SUB_PERFORMING">Sub-Performing</option>
              <option value="NON_PERFORMING">Non-Performing</option>
              <option value="REO">REO</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading pipeline...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notes in Pipeline</h3>
              <p className="text-gray-600 mb-6">Submit a note to begin the acquisition process</p>
              <Link href="/notes/submit" className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
                Submit Your First Note
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Note ID</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Property</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">UPB</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Asking</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Discount</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Performance</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredNotes.map(note => (
                      <tr key={note.noteId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-teal-600">{note.noteId}</div>
                          <div className="text-xs text-gray-500">{new Date(note.submittedAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{note.propertyAddress}</div>
                          <div className="text-xs text-gray-500">{note.propertyCity}, {note.propertyState}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{note.noteType.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-500">{note.propertyType}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-900">{formatUSD(note.unpaidPrincipalBalance)}</div>
                          <div className="text-xs text-gray-500">LTV: {note.ltv}%</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-900">{formatUSD(note.askingPrice)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-green-600">{note.discountFromUPB.toFixed(1)}%</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${PERFORMANCE_COLORS[note.performanceStatus] || 'bg-gray-100 text-gray-700'}`}>
                            {note.performanceStatus.replace('_', '-')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[note.status] || 'bg-gray-100 text-gray-700'}`}>
                            {note.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-8 bg-teal-50 rounded-xl border border-teal-200 p-6">
            <h3 className="font-semibold text-teal-900 mb-2">Acquisition Process</h3>
            <div className="grid md:grid-cols-6 gap-4 text-sm text-teal-700">
              <div>
                <div className="font-medium">1. Submit</div>
                <div className="text-xs">Provide note & collateral details</div>
              </div>
              <div>
                <div className="font-medium">2. Intake</div>
                <div className="text-xs">Initial review & screening</div>
              </div>
              <div>
                <div className="font-medium">3. Due Diligence</div>
                <div className="text-xs">Title, BPO, payment history</div>
              </div>
              <div>
                <div className="font-medium">4. Valuation</div>
                <div className="text-xs">Pricing & risk assessment</div>
              </div>
              <div>
                <div className="font-medium">5. Attestation</div>
                <div className="text-xs">Dual validator sign-off</div>
              </div>
              <div>
                <div className="font-medium">6. Acquisition</div>
                <div className="text-xs">Purchase & onboarding</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
