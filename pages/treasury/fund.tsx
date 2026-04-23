import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

const NEXUS = {
  beneficiary: 'Akili Group, LLC',
  bankName: 'Grasshopper Bank, N.A. (via Increase)',
  routing: '074920909',
  account: '7192752995',
  accountType: 'Checking',
  bankAddress: '420 Lexington Avenue, Suite 2446, New York, NY 10170',
};

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-dl-line py-3 gap-2">
      <div className="text-xs uppercase tracking-wide text-dl-muted font-mono">{label}</div>
      <div className="font-mono text-sm break-all md:text-right">{value}</div>
    </div>
  );
}

export default function FundTreasuryPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Fund the Treasury — Axiom</title>
        <meta
          name="description"
          content="Fund the Axiom Protocol treasury via ACH or wire transfer to the Increase Nexus operating account."
        />
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-serif mb-2">Fund the Treasury</h1>
        <p className="text-sm text-dl-muted font-mono mb-6">
          Treasury funding is accepted via ACH or domestic wire to the Axiom
          Nexus operating account at Increase. Card payments for treasury are no
          longer supported.
        </p>

        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-1">Wire / ACH Instructions</h2>
          <p className="text-xs text-dl-muted font-mono mb-4">
            Use these details to push funds from any U.S. bank or institutional
            payment platform. Funds settle directly into the protocol&apos;s
            operating account.
          </p>

          <CopyRow label="Beneficiary" value={NEXUS.beneficiary} />
          <CopyRow label="Bank" value={NEXUS.bankName} />
          <CopyRow label="Routing (ABA)" value={NEXUS.routing} />
          <CopyRow label="Account Number" value={NEXUS.account} />
          <CopyRow label="Account Type" value={NEXUS.accountType} />
          <CopyRow label="Bank Address" value={NEXUS.bankAddress} />
        </div>

        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-2">Reference / Memo</h2>
          <p className="text-sm font-mono mb-3">
            Include the following in the wire memo or ACH addenda so the
            inbound transfer can be matched to the correct attribution:
          </p>
          <ul className="text-sm font-mono list-disc pl-5 space-y-1">
            <li>Sender name as it appears on the originating account</li>
            <li>Connected wallet address (if attributing to an on-chain identity)</li>
            <li>Purpose code &mdash; <span className="font-bold">TREASURY-FUND</span></li>
          </ul>
        </div>

        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-2">Looking to Buy AXUSD or AXAU?</h2>
          <p className="text-sm font-mono mb-4">
            Consumer card payments are processed through Coinbase. Card &rarr;
            USDC &rarr; AXUSD (or AXAU) flows are available on the public onramp:
          </p>
          <Link
            href="/onramp"
            className="inline-block px-5 py-3 bg-dl-ink text-dl-surface font-mono text-sm uppercase tracking-wide hover:opacity-90"
          >
            Open the Card Onramp &rarr;
          </Link>
        </div>

        <div className="text-xs text-dl-muted font-mono space-y-2">
          <p>
            <strong>Settlement:</strong> ACH typically settles in 1&ndash;3
            business days; domestic wires settle same-day if sent before the
            cutoff.
          </p>
          <p>
            <strong>Verification:</strong> All inbound credits are reflected in
            the daily solvency snapshot at <Link href="/disclosure" className="underline">/disclosure</Link>.
          </p>
          <p>
            <strong>International:</strong> SWIFT and FX-routed wires are
            handled through the institutional desk. Contact{' '}
            <Link href="/contact" className="underline">/contact</Link> for
            instructions.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
