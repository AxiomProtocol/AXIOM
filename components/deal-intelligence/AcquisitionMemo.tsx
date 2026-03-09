import { useState, useCallback } from 'react';

interface AcquisitionMemoProps {
  dealId: string;
  scenarioId: string;
}

interface MemoData {
  executiveSummary: string;
  propertySnapshot: string;
  financialOverview: string;
  strategyComparison: string;
  riskSummary: string;
  dueDiligenceStatus: string;
  capitalReadiness: string;
  recommendedNextSteps: string;
  memoDate: string;
  dealGrade: string;
  dealName?: string;
  propertyAddress?: string;
  strategy?: string;
  generatedAt?: string;
}

const MEMO_SECTIONS: { key: keyof MemoData; label: string }[] = [
  { key: 'executiveSummary', label: 'Executive Summary' },
  { key: 'propertySnapshot', label: 'Property Snapshot' },
  { key: 'financialOverview', label: 'Financial Overview' },
  { key: 'strategyComparison', label: 'Strategy Comparison' },
  { key: 'riskSummary', label: 'Risk Summary' },
  { key: 'dueDiligenceStatus', label: 'Due Diligence Status' },
  { key: 'capitalReadiness', label: 'Capital Readiness' },
  { key: 'recommendedNextSteps', label: 'Recommended Next Steps' },
];

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-green-800 bg-green-100 border-green-400',
  'A': 'text-green-700 bg-green-50 border-green-300',
  'A-': 'text-green-600 bg-green-50 border-green-300',
  'B+': 'text-blue-700 bg-blue-50 border-blue-300',
  'B': 'text-blue-600 bg-blue-50 border-blue-300',
  'B-': 'text-blue-500 bg-blue-50 border-blue-200',
  'C+': 'text-yellow-700 bg-yellow-50 border-yellow-300',
  'C': 'text-yellow-600 bg-yellow-50 border-yellow-300',
  'C-': 'text-yellow-500 bg-yellow-50 border-yellow-200',
  'D': 'text-orange-700 bg-orange-50 border-orange-300',
  'F': 'text-red-700 bg-red-50 border-red-300',
};

export default function AcquisitionMemo({ dealId, scenarioId }: AcquisitionMemoProps) {
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadMemo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/real-estate/deals/${dealId}/memo`);
      const json = await res.json();
      if (json.data?.memo) {
        setMemo(json.data.memo);
        setSavedAt(json.data.savedAt);
      }
    } catch {}
    setLoading(false);
    setLoaded(true);
  }, [dealId]);

  if (!loaded && !loading) {
    loadMemo();
  }

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/real-estate/deals/${dealId}/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const status = res.status;
        if (status === 504 || status === 502) {
          setError(`Memo generation timed out (${status}). Please try again.`);
        } else {
          setError(`Server returned non-JSON response (HTTP ${status}).`);
        }
        return;
      }
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setMemo(json.data.memo);
        setSavedAt(json.data.generatedAt);
      }
    } catch (err: any) {
      setError(`Memo generation failed: ${err.message || 'Network error'}`);
    } finally {
      setGenerating(false);
    }
  }, [dealId, scenarioId]);

  const gradeColor = memo?.dealGrade ? (GRADE_COLORS[memo.dealGrade] || 'text-gray-700 bg-gray-50 border-gray-300') : '';

  return (
    <div className="border border-dl-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dl-serif text-lg text-dl-navy">Acquisition Memorandum</h2>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="font-dl-mono text-xs text-dl-muted">
              Generated: {new Date(savedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
          >
            {generating ? 'Generating Memo...' : memo ? 'Regenerate Memo' : 'Generate Acquisition Memo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-3 mb-4">
          <p className="text-red-700 font-dl-mono text-sm">{error}</p>
        </div>
      )}

      {generating && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-muted mb-2">Generating institutional acquisition memorandum...</p>
          <p className="font-dl-mono text-xs text-dl-muted">This synthesizes property data, metrics, risk flags, due diligence status, and AI analysis.</p>
          <p className="font-dl-mono text-xs text-dl-muted mt-1">This may take 30-60 seconds.</p>
        </div>
      )}

      {loading && !memo && (
        <p className="font-dl-mono text-sm text-dl-muted">Loading saved memo...</p>
      )}

      {!generating && !loading && !memo && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-sm text-dl-muted mb-2">No acquisition memo generated yet.</p>
          <p className="font-dl-mono text-xs text-dl-muted">Click "Generate Acquisition Memo" to create a comprehensive institutional memo from all deal data.</p>
        </div>
      )}

      {memo && !generating && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-dl-border pb-4">
            <div className="flex-1">
              <h3 className="font-dl-serif text-xl text-dl-navy">{memo.dealName || 'Acquisition Memo'}</h3>
              <p className="font-dl-mono text-sm text-dl-muted">
                {memo.propertyAddress} | Strategy: {memo.strategy?.toUpperCase()} | Date: {memo.memoDate ? new Date(memo.memoDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {memo.dealGrade && memo.dealGrade !== 'N/A' && (
              <div className={`px-4 py-2 border font-dl-mono text-2xl font-bold ${gradeColor}`}>
                {memo.dealGrade}
              </div>
            )}
          </div>

          {MEMO_SECTIONS.map(({ key, label }) => {
            const content = memo[key];
            if (!content || typeof content !== 'string') return null;
            return (
              <div key={key} className="border border-dl-border">
                <div className="bg-dl-bg border-b border-dl-border px-4 py-2">
                  <h3 className="font-dl-serif text-base text-dl-navy uppercase tracking-wide">{label}</h3>
                </div>
                <div className="p-4">
                  <div className="font-dl-mono text-sm text-dl-text whitespace-pre-wrap leading-relaxed">
                    {content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
