import { useState, useEffect } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface SpvOption {
  id: string;
  name: string;
}

interface Document {
  id: string;
  spv_id: string | null;
  title: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'offering', label: 'Offering' },
  { value: 'operating_agreement', label: 'Operating Agreement' },
  { value: 'spv_formation', label: 'SPV Formation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'title', label: 'Title' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial_report', label: 'Financial Report' },
  { value: 'tax', label: 'Tax' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCategory(cat: string): string {
  const found = CATEGORIES.find((c) => c.value === cat);
  if (found) return found.label;
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const categoryColors: Record<string, string> = {
  offering: 'bg-teal-100 text-teal-800',
  operating_agreement: 'bg-blue-100 text-blue-800',
  spv_formation: 'bg-purple-100 text-purple-800',
  inspection: 'bg-amber-100 text-amber-800',
  appraisal: 'bg-orange-100 text-orange-800',
  title: 'bg-indigo-100 text-indigo-800',
  insurance: 'bg-cyan-100 text-cyan-800',
  financial_report: 'bg-green-100 text-green-800',
  tax: 'bg-red-100 text-red-800',
  legal: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-600',
};

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [spvs, setSpvs] = useState<SpvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSpv, setFilterSpv] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formSpvId, setFormSpvId] = useState('');
  const [formCategory, setFormCategory] = useState('other');
  const [formDescription, setFormDescription] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileName, setFormFileName] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [docRes, spvRes] = await Promise.all([
          fetch('/api/pilot/documents'),
          fetch('/api/pilot/spvs'),
        ]);
        const docResult = await docRes.json();
        const spvResult = await spvRes.json();
        if (docResult.success) setDocuments(docResult.data || []);
        else setError(docResult.error || 'Failed to load documents');
        if (spvResult.success) setSpvs(spvResult.data || []);
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    if (filterSpv && doc.spv_id !== filterSpv) return false;
    if (filterCategory && doc.category !== filterCategory) return false;
    return true;
  });

  const groupedByCategory = filteredDocuments.reduce<Record<string, Document[]>>((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  const getSpvName = (spvId: string | null) => {
    if (!spvId) return 'All SPVs';
    const spv = spvs.find((s) => s.id === spvId);
    return spv?.name || spvId;
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/pilot/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          spvId: formSpvId || null,
          category: formCategory,
          description: formDescription || null,
          fileUrl: formFileUrl,
          fileName: formFileName,
          uploadedBy: 'admin',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDocuments((prev) => [result.data, ...prev]);
        setShowUpload(false);
        setFormTitle('');
        setFormSpvId('');
        setFormCategory('other');
        setFormDescription('');
        setFormFileUrl('');
        setFormFileName('');
      } else {
        alert(result.error || 'Failed to upload document');
      }
    } catch {
      alert('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>National Economic Pilot — Data Room</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Investor Data Room</h1>
            <p className="text-gray-500 mt-1">Secure document repository for investors and administrators</p>
          </div>

          <PilotNav currentTab="documents" />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div className="flex flex-wrap gap-3">
                  <select
                    value={filterSpv}
                    onChange={(e) => setFilterSpv(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">All SPVs</option>
                    {spvs.map((spv) => (
                      <option key={spv.id} value={spv.id}>{spv.name}</option>
                    ))}
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Upload Document
                </button>
              </div>

              {filteredDocuments.length > 0 ? (
                <div className="space-y-8">
                  {Object.entries(groupedByCategory)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, docs]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                          {formatCategory(category)} ({docs.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {docs.map((doc) => (
                            <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{doc.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${categoryColors[doc.category] || 'bg-gray-100 text-gray-600'}`}>
                                  {formatCategory(doc.category)}
                                </span>
                              </div>
                              {doc.description && (
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
                              )}
                              <div className="space-y-1 mb-4">
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-400">SPV</span>
                                  <span className="text-xs text-gray-600">{getSpvName(doc.spv_id)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-400">Uploaded</span>
                                  <span className="text-xs text-gray-600">{formatDate(doc.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-400">Uploaded By</span>
                                  <span className="text-xs text-gray-600">{doc.uploaded_by}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-400">File Size</span>
                                  <span className="text-xs text-gray-600">{formatFileSize(doc.file_size)}</span>
                                </div>
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    Upload Your First Document
                  </button>
                </div>
              )}

              <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      placeholder="Document title"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SPV</label>
                      <select
                        value={formSpvId}
                        onChange={(e) => setFormSpvId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">All SPVs</option>
                        {spvs.map((spv) => (
                          <option key={spv.id} value={spv.id}>{spv.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      placeholder="Optional description"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                    <input
                      type="url"
                      value={formFileUrl}
                      onChange={(e) => setFormFileUrl(e.target.value)}
                      required
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                    <input
                      type="text"
                      value={formFileName}
                      onChange={(e) => setFormFileName(e.target.value)}
                      required
                      placeholder="document.pdf"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUpload(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </form>
              </Modal>
            </>
          )}
        </div>
      </div>
    </>
  );
}
