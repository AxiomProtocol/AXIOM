import type { GetServerSideProps } from 'next';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

export default function AchAdapterRetiredPage() {
  return (
    <OperatorConsoleLayout>
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1 style={{ marginBottom: '1rem' }}>ACH Adapter — Retired</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          The ACH banking provider integration was decommissioned on 2026-04-28.
          The banking provider slot is open and ready for a replacement provider.
        </p>
        <dl style={{ lineHeight: 2 }}>
          <dt style={{ fontWeight: 'bold' }}>Status</dt>
          <dd>DECOMMISSIONED</dd>
          <dt style={{ fontWeight: 'bold' }}>Decommission date</dt>
          <dd>2026-04-28</dd>
          <dt style={{ fontWeight: 'bold' }}>Replacement</dt>
          <dd>Not yet selected — see lib/banking/registry.ts</dd>
          <dt style={{ fontWeight: 'bold' }}>Affected rails</dt>
          <dd>ACH deposits, ACH withdrawals, virtual cards, direct deposit</dd>
          <dt style={{ fontWeight: 'bold' }}>Unaffected rails</dt>
          <dd>Stripe card payments, Coinbase Onramp, BitGo CaaS custody, Stellar SEP on-chain</dd>
        </dl>
      </div>
    </OperatorConsoleLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  return { props: {} };
};
