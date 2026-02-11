import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  StatusBadge,
  PaginationControls,
  DisclosureBlock,
  SectionHeading,
  SolidButton,
} from '../../components/design-law';
import type { Column } from '../../components/design-law';

interface AuditEntry {
  id: string;
  created_at: string;
  scope: string;
  action_type: string;
  subject: string;
  max_notional: string;
  decision: string;
  reason_code: string;
  log_hash: string;
  nonce: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VerificationResult {
  valid: boolean;
  entries_checked: number;
  first_broken_at?: number;
}

const AUDIT_METHODOLOGY =
  'Each Sentinel decision is recorded as an immutable entry in a cryptographic hash chain. ' +
  'Every entry contains a SHA-256 hash computed from the previous entry\'s hash concatenated with ' +
  'the current entry\'s payload and a monotonically increasing nonce. Chain verification walks the ' +
  'full history and recomputes each hash to confirm no entries have been modified, inserted, or ' +
  'deleted. A broken chain indicates data tampering or system fault and triggers immediate halt of ' +
  'all automated execution until manual review is completed. This mechanism provides non-repudiation ' +
  'and auditability for all capital authorization decisions made by the Sentinel subsystem.';

const FOOTER_DISCLOSURE =
  'AUDIT NOTICE: This log is generated automatically by the Sentinel risk authorization engine. ' +
  'Hash chain verification is a data integrity check, not a guarantee of decision correctness. ' +
  'All entries are append-only and cannot be modified after creation.';

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function formatNotional(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncateHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  if (hash.length <= 16) return hash;
  return hash.substring(0, 8) + '…' + hash.substring(hash.length - 8);
}

export default function SentinelAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');

    fetch(`/api/sentinel/decisions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEntries(data.decisions || []);
          setPagination(data.pagination || null);
        }
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, [page]);

  function handleVerify() {
    setVerifying(true);
    setVerifyError(null);
    setVerification(null);

    fetch('/api/sentinel/audit?verify=true&limit=1000')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setVerifyError(data.error);
        } else if (data.verification) {
          setVerification({
            valid: data.verification.valid,
            entries_checked: data.verification.checked,
            first_broken_at: data.verification.brokenAt ? 0 : undefined,
          });
        } else {
          setVerifyError('No verification data returned');
        }
      })
      .catch(() => setVerifyError('Failed to run chain verification'))
      .finally(() => setVerifying(false));
  }

  const auditColumns: Column<AuditEntry>[] = [
    {
      key: 'created_at',
      header: 'Timestamp (UTC)',
      render: (e) => <span className="font-dl-mono text-xs">{formatUTC(e.created_at)}</span>,
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (e) => <span className="text-dl-navy">{e.scope}</span>,
    },
    {
      key: 'action_type',
      header: 'Action',
      render: (e) => <span className="text-dl-gray">{e.action_type}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (e) => <span className="font-medium text-dl-navy">{e.subject}</span>,
    },
    {
      key: 'max_notional',
      header: 'Max Notional',
      align: 'right',
      render: (e) => <span className="font-dl-mono">{formatNotional(e.max_notional)}</span>,
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (e) => (
        <StatusBadge status={e.decision === 'APPROVED' ? 'ACTIVE' : 'EXPIRED'} />
      ),
    },
    {
      key: 'reason_code',
      header: 'Reason',
      render: (e) => <span className="font-dl-mono text-xs text-dl-gray">{e.reason_code}</span>,
    },
    {
      key: 'log_hash',
      header: 'Hash',
      render: (e) => (
        <span className="font-dl-mono text-xs text-dl-gray" title={e.log_hash}>
          {truncateHash(e.log_hash)}
        </span>
      ),
    },
    {
      key: 'nonce',
      header: 'Nonce',
      align: 'right',
      render: (e) => <span className="font-dl-mono">{e.nonce}</span>,
    },
  ];

  return (
    <DesignLawLayout>
      <PageShell
        title="Sentinel Audit Trail"
        subtitle="Immutable decision log with cryptographic hash chain verification."
        disclosure={FOOTER_DISCLOSURE}
      >
      <Link href="/sentinel" className="text-sm text-dl-navy mb-6 inline-block">
        ← Back to Sentinel Dashboard
      </Link>

      <div className="border border-dl-border-light p-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-dl-gray mb-1">HASH CHAIN VERIFICATION</p>
            {verification ? (
              <>
                <p className={`font-dl-heading text-xl ${verification.valid ? 'text-dl-forest' : 'text-dl-error'}`}>
                  {verification.valid ? 'Chain Integrity: Verified' : 'Chain Broken'}
                </p>
                <p className="font-dl-mono text-xs text-dl-gray mt-1">
                  {verification.entries_checked} entries checked
                  {!verification.valid && verification.first_broken_at != null
                    ? ` — first break at entry ${verification.first_broken_at}`
                    : ''}
                </p>
              </>
            ) : verifyError ? (
              <p className="text-sm text-dl-error">{verifyError}</p>
            ) : (
              <p className="text-sm text-dl-gray">Run verification to check chain integrity.</p>
            )}
          </div>
          <SolidButton onClick={handleVerify} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify Chain'}
          </SolidButton>
        </div>
      </div>

      <div className="mb-8">
        <SectionHeading>Decision Log</SectionHeading>

        {loading ? (
          <p className="text-sm text-dl-gray py-12 text-center">Loading data...</p>
        ) : error ? (
          <p className="text-sm text-dl-error py-12 text-center">{error}</p>
        ) : (
          <>
            <DataTable
              columns={auditColumns}
              data={entries}
              keyExtractor={(e) => e.id}
              emptyMessage="No audit entries found."
            />

            {pagination && (
              <PaginationControls
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setPage}
                itemLabel="entries"
              />
            )}
          </>
        )}
      </div>

      <div className="mb-8">
        <DisclosureBlock text={AUDIT_METHODOLOGY} />
      </div>
      </PageShell>
    </DesignLawLayout>
  );
}
