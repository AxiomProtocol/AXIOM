import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { db } from '../../server/db';
import { capNotifications } from '../../shared/capInfraSchema';
import { desc } from 'drizzle-orm';

interface Item {
  id: string;
  topic: string;
  severity: string;
  subject: string;
  createdAt: string;
  readAt: string | null;
}
interface Props { items: Item[]; loadError: string | null }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  try {
    const rows = await db
      .select()
      .from(capNotifications)
      .orderBy(desc(capNotifications.createdAt))
      .limit(200);
    return {
      props: {
        loadError: null,
        items: rows.map((r) => ({
          id: r.id,
          topic: r.topic,
          severity: r.severity,
          subject: r.subject,
          createdAt: r.createdAt.toISOString(),
          readAt: r.readAt?.toISOString() ?? null,
        })),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/notifications] failed to load notifications:', msg, err);
    return {
      props: {
        items: [],
        loadError: msg,
      },
    };
  }
};

export default function NotificationsPage({ items, loadError }: Props) {
  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4"><Link href="/operator" className="text-sm underline">← Back to console</Link></div>
        <h1 className="text-2xl font-serif mb-4">Notifications</h1>
        {loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-4 font-dl-mono text-xs">
            <div className="font-dl-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Notification data could not be loaded. Showing empty result. Operations has been notified.
              <div className="text-dl-muted mt-1 break-all">ref: {loadError}</div>
            </div>
          </div>
        )}
        <table className="w-full text-xs">
          <thead><tr>
            <th className="text-left font-mono">Time</th>
            <th className="text-left font-mono">Severity</th>
            <th className="text-left font-mono">Topic</th>
            <th className="text-left font-mono">Subject</th>
            <th className="text-left font-mono">Read</th>
          </tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-dl-muted">No notifications.</td></tr>
            ) : items.map((i) => (
              <tr key={i.id} className="border-t border-dl-border">
                <td className="font-mono">{i.createdAt}</td>
                <td className="font-mono">{i.severity}</td>
                <td className="font-mono">{i.topic}</td>
                <td>{i.subject}</td>
                <td className="font-mono">{i.readAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OperatorConsoleLayout>
  );
}
