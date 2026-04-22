import { useState, useEffect } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';

function formatCurrency(val: number | string | null | undefined): string {
  if (!val) return '$0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-green-800 bg-green-50 border-green-200';
  if (grade === 'B') return 'text-blue-800 bg-blue-50 border-blue-200';
  if (grade === 'C') return 'text-yellow-800 bg-yellow-50 border-yellow-200';
  return 'text-red-800 bg-red-50 border-red-200';
}

interface ReportSummary {
  id: string;
  createdAt: string;
  tier: string;
  status: string;
  addressRaw: string;
  city: string | null;
  state: string | null;
  valueMid: string | null;
  rentMid: string | null;
  confidenceScore: number | null;
  dealGrade: string | null;
}

export default function ReportHistory() {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [searched, setSearched] = useState(false);

  const fetchReports = async (emailAddr: string, page: number = 1) => {
    if (!emailAddr.trim() || !emailAddr.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/property/reports?email=${encodeURIComponent(emailAddr.trim())}&page=${page}&limit=10`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not fetch reports');
      } else {
        setReports(data.reports || []);
        setPagination(data.pagination || { page: 1, totalPages: 0, total: 0 });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
    fetchReports(email, 1);
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Report History | Property Analysis | Axiom Protocol</title>
      </Head>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="border-b border-dl-border pb-6 mb-8">
          <h1 className="font-dl-serif text-2xl text-dl-navy">Report History</h1>
          <p className="text-sm text-dl-gray mt-2">
            View all past property analysis reports associated with your email address.
          </p>
        </div>

        <form onSubmit={handleSearch} className="border border-dl-border p-4 sm:p-6 mb-8">
          <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Find Your Reports</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 border border-dl-border px-4 py-3 min-h-[44px] text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 min-h-[44px] text-sm font-dl-mono bg-dl-navy text-white border border-dl-navy hover:bg-opacity-90 disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 mb-6 text-sm text-red-800">
            {error}
          </div>
        )}

        {searched && !loading && reports.length === 0 && !error && (
          <div className="border border-dl-border p-8 text-center">
            <h3 className="font-dl-serif text-lg text-dl-navy mb-2">No Reports Found</h3>
            <p className="text-sm text-dl-gray mb-4">
              No reports were found for this email address. Reports are linked to the email provided during generation.
            </p>
            <a href="/property" className="font-dl-mono text-sm text-dl-navy border border-dl-navy px-6 py-2 hover:bg-dl-navy hover:text-white inline-block">
              Generate a Report
            </a>
          </div>
        )}

        {reports.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-dl-gray font-dl-mono">
                {pagination.total} report{pagination.total !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((report) => (
                <a
                  key={report.id}
                  href={`/property/reports/${report.id}`}
                  className="block border border-dl-border p-4 hover:border-dl-navy transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-dl-navy font-dl-mono group-hover:underline">
                        {report.addressRaw}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-dl-gray font-dl-mono">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-dl-mono border border-dl-border px-2 py-0 text-dl-gray uppercase">
                          {report.tier}
                        </span>
                        {report.dealGrade && (
                          <span className={`text-xs font-dl-mono border px-2 py-0 ${gradeColor(report.dealGrade)}`}>
                            {report.dealGrade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-6 text-right">
                      {report.valueMid && (
                        <div>
                          <p className="text-xs text-dl-gray">Value</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{formatCurrency(report.valueMid)}</p>
                        </div>
                      )}
                      {report.rentMid && (
                        <div>
                          <p className="text-xs text-dl-gray">Rent</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{formatCurrency(report.rentMid)}/mo</p>
                        </div>
                      )}
                      {report.confidenceScore !== null && (
                        <div>
                          <p className="text-xs text-dl-gray">Confidence</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{report.confidenceScore}/100</p>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchReports(searchEmail, p)}
                    className={`w-10 h-10 min-h-[44px] text-xs font-dl-mono border ${
                      p === pagination.page
                        ? 'bg-dl-navy text-white border-dl-navy'
                        : 'bg-white text-dl-navy border-dl-border hover:border-dl-navy'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-dl-border">
          <a href="/property" className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-4 py-2 hover:bg-dl-navy hover:text-white">
            Back to Property Analysis
          </a>
        </div>
      </div>
    </DesignLawLayout>
  );
}
