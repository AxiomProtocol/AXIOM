import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { db } from '../../../server/db';
import {
  capSettlementInstructions,
  capAuditEvents,
  capPolicyDecisions,
} from '../../../shared/capInfraSchema';
import { eq, desc } from 'drizzle-orm';

interface Props {
  instruction: Record<string, unknown> | null;
  audits: Array<{ id: string; eventType: string; createdAt: string; payloadJson: unknown }>;
  decision: Record<string, unknown> | null;
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  const id = ctx.params?.id;
  if (typeof id !== 'string') return { notFound: true };

  try {
    const [[instr], audits] = await Promise.all([
      db.select().from(capSettlementInstructions).where(eq(capSettlementInstructions.id, id)).limit(1),
      db
        .select()
        .from(capAuditEvents)
        .where(eq(capAuditEvents.instructionId, id))
        .orderBy(desc(capAuditEvents.createdAt))
        .limit(200),
    ]);

    let decision: Record<string, unknown> | null = null;
    if (instr?.policyDecisionId) {
      const [d] = await db
        .select()
        .from(capPolicyDecisions)
        .where(eq(capPolicyDecisions.id, instr.policyDecisionId))
        .limit(1);
      decision = d ? (JSON.parse(JSON.stringify(d)) as Record<string, unknown>) : null;
    }

    return {
      props: {
        instruction: instr ? (JSON.parse(JSON.stringify(instr)) as Record<string, unknown>) : null,
        audits: audits.map((a) => ({
          id: a.id,
          eventType: a.eventType,
          createdAt: a.createdAt.toISOString(),
          payloadJson: a.payloadJson,
        })),
        decision,
        loadError: null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/instructions/[id]] failed to load instruction data:', msg, err);
    return {
      props: {
        instruction: null,
        audits: [],
        decision: null,
        loadError: msg,
      },
    };
  }
};

export default function InstructionInspector({ instruction, audits, decision, loadError }: Props) {
  if (!instruction) {
    return (
      <DesignLawLayout>
        <div className="py-8">
          {loadError && (
            <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-4 font-mono text-xs">
              <div className="font-serif text-sm text-dl-navy mb-1">Operational notice</div>
              <div className="text-dl-ink">
                Instruction data could not be loaded. Operations has been notified.
                <div className="text-dl-muted mt-1 break-all">ref: {loadError}</div>
              </div>
            </div>
          )}
          {!loadError && 'Instruction not found.'}
        </div>
      </DesignLawLayout>
    );
  }
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator/instructions" className="text-sm underline">← All instructions</Link>
        </div>
        <h1 className="text-2xl font-serif mb-4 font-mono">{String(instruction.id)}</h1>

        <section className="border border-dl-border p-4 mb-4">
          <h2 className="font-serif mb-2">Instruction</h2>
          <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap">
{JSON.stringify(instruction, null, 2)}
          </pre>
        </section>

        <section className="border border-dl-border p-4 mb-4">
          <h2 className="font-serif mb-2">Policy Decision</h2>
          {decision ? (
            <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap">
{JSON.stringify(decision, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-dl-muted">No linked policy decision.</div>
          )}
        </section>

        <section className="border border-dl-border p-4">
          <h2 className="font-serif mb-2">Audit Events ({audits.length})</h2>
          {audits.length === 0 ? (
            <div className="text-sm text-dl-muted">No audit events.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr>
                <th className="text-left font-mono">Time</th>
                <th className="text-left font-mono">Event</th>
                <th className="text-left font-mono">Payload</th>
              </tr></thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-t border-dl-border align-top">
                    <td className="py-1 pr-2 font-mono">{a.createdAt}</td>
                    <td className="py-1 pr-2 font-mono">{a.eventType}</td>
                    <td className="py-1 font-mono break-all">{JSON.stringify(a.payloadJson)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </DesignLawLayout>
  );
}
