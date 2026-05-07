import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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
  { value: 'settlement_statement', label: 'Settlement Statement' },
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

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-dl-bg border border-dl-border max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-dl-serif text-lg text-dl-navy">{title}</h3>
          <button onClick={onClose} className="text-dl-gray">
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
  const [formFile, setFormFile] = useState<File | null>(null);

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
    if (!formFile) { alert('Please select a PDF file.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', formFile);
      fd.append('title', formTitle);
      fd.append('note', formDescription);
      const res = await fetch('/api/founder/upload-settlement', {
        method: 'POST',
        headers: { 'x-admin-key': 'Promote9' },
        body: fd,
      });
      const result = await res.json();
      if (result.success) {
        setDocuments((prev) => [result.data, ...prev]);
        setShowUpload(false);
        setFormTitle('');
        setFormSpvId('');
        setFormCategory('other');
        setFormDescription('');
        setFormFile(null);
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Investor Data Room</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Investor Data Room</h1>
        <p className="text-sm text-dl-gray mt-1">Secure document repository for offering materials, agreements, and reports</p>
      </div>

      <PilotNav currentTab="documents" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">Access all critical investment documents in one place — from offering memorandums and operating agreements to inspection reports, appraisals, and tax documents. Every document is organized by category and SPV for easy reference.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-dl-gray font-dl-mono">Loading documents...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error p-6">
          <p className="text-dl-error font-medium">Error</p>
          <p className="text-dl-gray text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex flex-wrap gap-3">
              <select
                value={filterSpv}
                onChange={(e) => setFilterSpv(e.target.value)}
                className="border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
              >
                <option value="">All SPVs</option>
                {spvs.map((spv) => (
                  <option key={spv.id} value={spv.id}>{spv.name}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
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
                    <h3 className="text-sm font-semibold text-dl-navy uppercase tracking-wide mb-3">
                      {formatCategory(category)} ({docs.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {docs.map((doc) => (
                        <div key={doc.id} className="bg-dl-bg border border-dl-border p-5">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-semibold text-dl-navy line-clamp-2">{doc.title}</h4>
                            <span className="text-xs font-dl-mono text-dl-gray whitespace-nowrap ml-2">
                              {formatCategory(doc.category)}
                            </span>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-dl-gray mb-3 line-clamp-2">{doc.description}</p>
                          )}
                          <div className="space-y-1 mb-4">
                            <div className="flex justify-between">
                              <span className="text-xs text-dl-gray">SPV</span>
                              <span className="text-xs text-dl-navy">{getSpvName(doc.spv_id)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-dl-gray">Uploaded</span>
                              <span className="text-xs text-dl-navy">{formatDate(doc.created_at)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-dl-gray">Uploaded By</span>
                              <span className="text-xs text-dl-navy">{doc.uploaded_by}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-dl-gray">File Size</span>
                              <span className="text-xs text-dl-navy">{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-3 py-2 text-sm font-medium text-dl-navy border border-dl-border bg-dl-bg"
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
            <div className="border border-dl-border p-8 bg-dl-bg-alt text-center">
              <svg className="w-12 h-12 mx-auto text-dl-gray mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-dl-gray text-sm">No documents uploaded yet</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-dl-navy border border-dl-border bg-dl-bg"
              >
                Upload Your First Document
              </button>
            </div>
          )}

          <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dl-navy mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="Document title"
                  className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">SPV</label>
                  <select
                    value={formSpvId}
                    onChange={(e) => setFormSpvId(e.target.value)}
                    className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                  >
                    <option value="">All SPVs</option>
                    {spvs.map((spv) => (
                      <option key={spv.id} value={spv.id}>{spv.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dl-navy mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dl-navy mb-1">PDF File *</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg file:mr-3 file:border-0 file:bg-dl-navy file:text-white file:px-3 file:py-1 file:text-xs file:cursor-pointer"
                />
                {formFile && (
                  <p className="text-xs text-dl-forest mt-1">{formFile.name} — {(formFile.size / 1024).toFixed(0)} KB</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-dl-navy border border-dl-border bg-dl-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-dl-navy disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </DesignLawLayout>
  );
}
