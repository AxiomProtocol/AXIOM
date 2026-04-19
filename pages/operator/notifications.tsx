import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
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
interface Props { items: Item[]; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  const rows = await db
    .select()
    .from(capNotifications)
    .orderBy(desc(capNotifications.createdAt))
    .limit(200);
  return {
    props: {
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
};

export default function NotificationsPage({ items }: Props) {
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4"><Link href="/operator" className="text-sm underline">← Back to console</Link></div>
        <h1 className="text-2xl font-serif mb-4">Notifications</h1>
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
    </DesignLawLayout>
  );
}
