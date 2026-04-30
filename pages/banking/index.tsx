import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

export default function BankingPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Capital Intake — Axiom Protocol</title>
        <meta name="description" content="Deposit fiat capital into the Axiom Protocol via card or Coinbase Onramp." />
      </Head>

      <div className="max-w-3xl">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">Capital Intake</p>
        <h1 className="text-3xl font-serif mb-2">Funding Paths</h1>
        <p className="text-sm text-dl-gray leading-relaxed mb-8">
          ACH/wire banking rails are currently offline. Two card-based paths are available for fiat capital entry.
        </p>

        <div className="grid md:grid-cols-2 gap-0 border border-dl-border mb-8">
          <div className="p-6 border-b md:border-b-0 md:border-r border-dl-border">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase tracking-widest mb-2">Path 1 — Card → AXUSD</p>
            <h2 className="font-dl-serif text-lg text-dl-navy mb-2">Coinbase Onramp</h2>
            <p className="text-xs text-dl-gray leading-relaxed mb-4">
              Purchase USDC with a debit or credit card via Coinbase Pay, then convert 1:1 to AXUSD through
              the Peg Stability Module. No Coinbase account required. USDC typically arrives within minutes.
              Use this path to acquire AXUSD for any protocol interaction.
            </p>
            <div className="space-y-1 text-xs font-dl-mono text-dl-gray mb-4">
              <div className="flex justify-between"><span>Settlement</span><span className="text-dl-navy">Minutes</span></div>
              <div className="flex justify-between"><span>Destination</span><span className="text-dl-navy">AXUSD on Arbitrum One</span></div>
              <div className="flex justify-between"><span>Minimum</span><span className="text-dl-navy">$1.00</span></div>
            </div>
            <Link
              href="/onramp"
              className="inline-block px-5 py-2.5 bg-dl-ink text-dl-surface font-dl-mono text-xs uppercase tracking-wide hover:opacity-90"
            >
              Open Onramp →
            </Link>
          </div>

          <div className="p-6">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase tracking-widest mb-2">Path 2 — LP Capital Intake</p>
            <h2 className="font-dl-serif text-lg text-dl-navy mb-2">Stripe Card Checkout</h2>
            <p className="text-xs text-dl-gray leading-relaxed mb-4">
              Invest directly into the Axiom Lending Fund via card payment through Stripe. AXUSD is minted
              1:1 to your wallet after payment confirms. Complete the on-chain vault deposit to earn yield.
              For accredited investors participating in the Fix &amp; Flip Lending Fund (SEC Reg D 506(c)).
            </p>
            <div className="space-y-1 text-xs font-dl-mono text-dl-gray mb-4">
              <div className="flex justify-between"><span>Settlement</span><span className="text-dl-navy">Minutes (mint on confirm)</span></div>
              <div className="flex justify-between"><span>Destination</span><span className="text-dl-navy">AXUSD → Lending Vault</span></div>
              <div className="flex justify-between"><span>Maximum</span><span className="text-dl-navy">$10,000 per transaction</span></div>
            </div>
            <Link
              href="/lending-fund/invest"
              className="inline-block px-5 py-2.5 border border-dl-ink text-dl-navy font-dl-mono text-xs uppercase tracking-wide hover:bg-dl-bg-alt"
            >
              Invest in Lending Fund →
            </Link>
          </div>
        </div>

        <div className="border border-dl-border bg-dl-bg-alt px-6 py-5 mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">ACH / Wire — Offline</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            ACH and wire transfer deposit instructions are unavailable while banking rails are reconfigured.
            For treasury wire coordination, contact Operations directly.
          </p>
        </div>

        <div className="border border-dl-border p-6">
          <h2 className="font-dl-serif text-base text-dl-navy mb-3">On-Chain Capital (No Fiat Required)</h2>
          <p className="text-xs text-dl-gray leading-relaxed mb-4">
            If you already hold USDC on Arbitrum One, you can convert directly to AXUSD through the
            Peg Stability Module and participate in any protocol product without fiat entry.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/axusd" className="font-dl-mono text-xs text-dl-navy underline">Peg Stability Module</Link>
            <Link href="/dex" className="font-dl-mono text-xs text-dl-navy underline">Protocol Exchange</Link>
            <Link href="/lending-fund" className="font-dl-mono text-xs text-dl-navy underline">Lending Fund</Link>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
