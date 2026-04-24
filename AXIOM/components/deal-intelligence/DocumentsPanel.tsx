import { useState, useEffect, useRef, useCallback } from 'react';
import { DOC_TYPE_OPTIONS, type DocType } from '../../lib/doc-extraction/templates';

interface Extraction {
  id: string;
  deal_id: string;
  doc_type: DocType;
  status: string;
  original_filename: string;
  confidence: number;
  field_count: number;
  applied_to_deal: boolean;
  processing_time_ms: number;
  error_message: string | null;
  created_at: string;
}

interface ExtractionResult {
  id: string;
  docType: DocType;
  status: string;
  confidence: number;
  fieldCount: number;
  processingTimeMs: number;
  extractedData: Record<string, any>;
  assumptionMapping: Record<string, string>;
  warnings: string[];
  summary: string | null;
}

interface Props {
  dealId: string;
  onApplyAssumptions?: (assumptions: Record<string, string>) => void;
}

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-50 text-blue-700',
  extracted: 'bg-green-50 text-green-700',
  verified: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function confidenceColor(c: number): string {
  if (c >= 0.85) return 'text-green-700';
  if (c >= 0.6) return 'text-yellow-700';
  return 'text-red-700';
}

export default function DocumentsPanel({ dealId, onApplyAssumptions }: Props) {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocType>('other');
  const [dragOver, setDragOver] = useState(false);
  const [latestResult, setLatestResult] = useState<ExtractionResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, any> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExtractions = useCallback(async () => {
    try {
      const res = await fetch(`/api/doc-extraction/list?dealId=${dealId}`);
      const json = await res.json();
      if (json.success) {
        setExtractions(json.extractions);
      }
    } catch (err) {
      console.error('Failed to load extractions:', err);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadExtractions();
  }, [loadExtractions]);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setLatestResult(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/doc-extraction/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          mimeType: file.type,
          docType: selectedDocType !== 'other' ? selectedDocType : undefined,
          dealId,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setLatestResult(json.extraction);
        loadExtractions();
      } else {
        alert(json.error || 'Extraction failed');
        loadExtractions();
      }
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleApply = () => {
    if (latestResult?.assumptionMapping && onApplyAssumptions) {
      onApplyAssumptions(latestResult.assumptionMapping);
      fetch(`/api/doc-extraction/${latestResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedToDeal: true }),
      });
      loadExtractions();
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/doc-extraction/${id}`);
      const json = await res.json();
      if (json.success) {
        setExpandedData(json.extraction.extracted_data);
      }
    } catch {
      setExpandedData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this extraction?')) return;
    await fetch(`/api/doc-extraction/${id}`, { method: 'DELETE' });
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
    }
    loadExtractions();
  };

  const applyFromHistory = async (id: string) => {
    if (!onApplyAssumptions) return;
    try {
      const res = await fetch(`/api/doc-extraction/${id}`);
      const json = await res.json();
      if (json.success && json.extraction.extracted_data) {
        const data = json.extraction.extracted_data;
        const docType = json.extraction.doc_type;
        const { mapExtractedToAssumptions } = await import('../../lib/doc-extraction/engine');
        const mapping = mapExtractedToAssumptions(data, docType);
        if (Object.keys(mapping).length > 0) {
          onApplyAssumptions(mapping);
          await fetch(`/api/doc-extraction/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appliedToDeal: true }),
          });
          loadExtractions();
        }
      }
    } catch (err) {
      console.error('Failed to apply:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-dl-border p-4">
        <h3 className="font-dl-heading text-lg text-dl-text mb-3">Upload Document for Extraction</h3>
        <p className="text-sm font-dl-body text-dl-muted mb-4">
          Upload rent rolls, offering memorandums, property reports, appraisals, operating statements,
          or other real estate documents. The system will automatically extract structured data and
          map it to deal assumptions.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Document Type</label>
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as DocType)}
            className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
          >
            {DOC_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-dl-accent bg-amber-50' : 'border-dl-border hover:border-dl-accent'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.txt,.csv"
            onChange={handleFileSelect}
          />
          {uploading ? (
            <div>
              <p className="font-dl-mono text-sm text-dl-text">Processing document...</p>
              <p className="font-dl-mono text-xs text-dl-muted mt-1">Extracting structured data with AI</p>
              <div className="mt-3 mx-auto w-48 h-1 bg-dl-border overflow-hidden">
                <div className="h-full bg-dl-accent animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <div>
              <p className="font-dl-mono text-sm text-dl-text">
                Drop a document here or click to browse
              </p>
              <p className="font-dl-mono text-xs text-dl-muted mt-1">
                PDF, JPEG, PNG, WebP, TIFF, TXT, CSV — Max 20MB
              </p>
            </div>
          )}
        </div>
      </div>

      {latestResult && (
        <div className="border border-dl-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-dl-heading text-lg text-dl-text">Extraction Results</h3>
            <div className="flex items-center gap-3 text-xs font-dl-mono text-dl-muted">
              <span className={confidenceColor(latestResult.confidence)}>
                {(latestResult.confidence * 100).toFixed(1)}% confidence
              </span>
              <span>{latestResult.fieldCount} fields</span>
              <span>{latestResult.processingTimeMs}ms</span>
            </div>
          </div>

          {latestResult.summary && (
            <p className="text-sm font-dl-body text-dl-muted mb-3 italic">{latestResult.summary}</p>
          )}

          {latestResult.warnings && latestResult.warnings.length > 0 && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-dl-mono text-yellow-700 uppercase mb-1">Warnings</p>
              {latestResult.warnings.map((w, i) => (
                <p key={i} className="text-xs font-dl-mono text-yellow-600">- {w}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {Object.entries(latestResult.extractedData)
              .filter(([key]) => !key.startsWith('_'))
              .filter(([, value]) => value !== null && value !== undefined && !Array.isArray(value) && typeof value !== 'object')
              .map(([key, value]) => (
                <div key={key} className="flex justify-between items-center border-b border-dl-border py-1">
                  <span className="text-xs font-dl-mono text-dl-muted">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-dl-mono text-dl-text font-medium">
                    {typeof value === 'number'
                      ? value.toLocaleString()
                      : String(value)}
                  </span>
                </div>
              ))}
          </div>

          {Object.entries(latestResult.extractedData)
            .filter(([key]) => !key.startsWith('_'))
            .filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => (
              <div key={key} className="mb-3">
                <p className="text-xs font-dl-mono text-dl-muted uppercase mb-1">{key.replace(/_/g, ' ')} ({(value as any[]).length} items)</p>
                <div className="max-h-40 overflow-y-auto border border-dl-border p-2">
                  <pre className="text-xs font-dl-mono text-dl-text whitespace-pre-wrap">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              </div>
            ))}

          {Object.keys(latestResult.assumptionMapping).length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200">
              <p className="text-xs font-dl-mono text-green-700 uppercase mb-2">
                Mappable to Deal Assumptions ({Object.keys(latestResult.assumptionMapping).length} fields)
              </p>
              <div className="space-y-1 mb-3">
                {Object.entries(latestResult.assumptionMapping).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs font-dl-mono">
                    <span className="text-green-600">{key}</span>
                    <span className="text-green-800 font-medium">{Number(val).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleApply}
                className="w-full py-2 bg-green-700 text-white font-dl-mono text-sm hover:bg-green-800 transition-colors"
              >
                Apply to Deal Assumptions
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border border-dl-border p-4">
        <h3 className="font-dl-heading text-lg text-dl-text mb-3">
          Extraction History
          {extractions.length > 0 && (
            <span className="text-sm font-dl-mono text-dl-muted ml-2">({extractions.length})</span>
          )}
        </h3>

        {loading ? (
          <p className="text-sm font-dl-mono text-dl-muted">Loading...</p>
        ) : extractions.length === 0 ? (
          <p className="text-sm font-dl-body text-dl-muted">
            No documents have been processed for this deal yet.
          </p>
        ) : (
          <div className="space-y-2">
            {extractions.map(ext => (
              <div key={ext.id} className="border border-dl-border">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-dl-bg"
                  onClick={() => toggleExpand(ext.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-dl-mono ${STATUS_STYLES[ext.status] || STATUS_STYLES.uploaded}`}>
                      {ext.status}
                    </span>
                    <span className="text-sm font-dl-mono text-dl-text">{ext.original_filename}</span>
                    <span className="text-xs font-dl-mono text-dl-muted">
                      {ext.doc_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-dl-mono text-dl-muted">
                    {ext.confidence > 0 && (
                      <span className={confidenceColor(ext.confidence)}>
                        {(ext.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {ext.field_count > 0 && <span>{ext.field_count} fields</span>}
                    {ext.applied_to_deal && (
                      <span className="text-green-600">applied</span>
                    )}
                    <span>{new Date(ext.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ext.id); }}
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      x
                    </button>
                  </div>
                </div>

                {expandedId === ext.id && (
                  <div className="border-t border-dl-border p-3 bg-dl-bg">
                    {loadingDetail ? (
                      <p className="text-sm font-dl-mono text-dl-muted">Loading details...</p>
                    ) : expandedData ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mb-3">
                          {Object.entries(expandedData)
                            .filter(([key]) => !key.startsWith('_'))
                            .filter(([, value]) => value !== null && value !== undefined && !Array.isArray(value) && typeof value !== 'object')
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs font-dl-mono border-b border-dl-border py-0.5">
                                <span className="text-dl-muted">{key.replace(/_/g, ' ')}</span>
                                <span className="text-dl-text">{String(value)}</span>
                              </div>
                            ))}
                        </div>
                        {!ext.applied_to_deal && ext.status === 'extracted' && (
                          <button
                            onClick={() => applyFromHistory(ext.id)}
                            className="px-4 py-1.5 bg-green-700 text-white font-dl-mono text-xs hover:bg-green-800"
                          >
                            Apply to Assumptions
                          </button>
                        )}
                      </div>
                    ) : ext.error_message ? (
                      <p className="text-sm font-dl-mono text-red-600">{ext.error_message}</p>
                    ) : (
                      <p className="text-sm font-dl-mono text-dl-muted">No extracted data available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
