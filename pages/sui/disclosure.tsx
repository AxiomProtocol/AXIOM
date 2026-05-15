import type { NextPage } from 'next';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

// =============================================================================
// Public Transparency Disclosure — Sui AMC Community Distribution (Phase 10)
//
// Publicly accessible. No wallet required.
// Discloses: token nature, operational risks, on-chain records, audit status.
// =============================================================================

const PACKAGE_ID  = '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487';
const CAMPAIGN_ID = '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982';
const PUBLISH_TX  = 'Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c';
const ACTIVATE_TX = '5AHTFEVAwggD4tBnwJpmSE6adxrVfjgnjR5BG3HhgW8E';
const LIVE_CLAIM  = 'AZVMA5RwG3LJokgXhpSGAQmDpqHCNAL9ZxkorzKLiVPn';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border border-dl-border p-6 mb-6">
    <h2 className="font-serif text-xl text-dl-heading mb-4">{title}</h2>
    {children}
  </section>
);

const DisclosureRow = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: 'warn' | 'ok' }) => (
  <div className="flex flex-col sm:flex-row sm:items-start border-b border-dl-border/40 py-2 gap-1 sm:gap-4">
    <span className="font-mono text-xs text-dl-muted uppercase tracking-wide sm:w-48 shrink-0">{label}</span>
    <span className={`font-mono text-xs break-all ${
      highlight === 'warn' ? 'text-yellow-400'
      : highlight === 'ok' ? 'text-green-400'
      : 'text-dl-fg'
    }`}>{value}</span>
  </div>
);

const ExplorerLink = ({ tx, label }: { tx: string; label: string }) => (
  <a
    href={`https://suiscan.xyz/mainnet/tx/${tx}`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-mono text-xs text-dl-fg underline break-all"
  >
    {label}: {tx}
  </a>
);

const SuiDisclosurePage: NextPage = () => (
  <DesignLawLayout>
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-serif text-4xl text-dl-heading mb-2">
        AMC Token — Public Transparency Disclosure
      </h1>
      <p className="font-mono text-xs text-dl-muted mb-2">
        Axiom Protocol · Sui Community Distribution · Effective 2026-05-15
      </p>
      <p className="font-mono text-xs text-dl-muted mb-10">
        This page is publicly accessible and updated as operational status changes.
      </p>

      {/* Token Nature Disclosures */}
      <Section title="Token Nature — What AMC Is and Is Not">
        <p className="text-sm text-dl-fg mb-4">
          The AXIOM MAINNET CLAIM token (AMC) is a non-financial community reward distributed
          via a Merkle-verified on-chain campaign on the Sui blockchain. The following disclosures
          apply unconditionally.
        </p>
        <div className="space-y-0">
          <DisclosureRow label="AMC is" value="A community participation reward token" highlight="ok" />
          <DisclosureRow label="AMC is NOT" value="AXUSD — the Axiom protocol stablecoin" highlight="warn" />
          <DisclosureRow label="AMC is NOT" value="AXAU — the Axiom gold reserve instrument" highlight="warn" />
          <DisclosureRow label="AMC is NOT" value="AXM — the Axiom governance token" highlight="warn" />
          <DisclosureRow label="AMC is NOT" value="A financial instrument or security" highlight="warn" />
          <DisclosureRow label="AMC is NOT" value="Redeemable for any fiat currency or asset" highlight="warn" />
          <DisclosureRow label="AMC is NOT" value="Backed by any reserve, treasury, or collateral" highlight="warn" />
          <DisclosureRow label="AMC carries" value="No ownership rights in Axiom Protocol" highlight="warn" />
          <DisclosureRow label="AMC carries" value="No governance rights unless explicitly stated in a future protocol amendment" highlight="warn" />
          <DisclosureRow label="AMC has" value="No guaranteed monetary value" highlight="warn" />
          <DisclosureRow label="Supply cap" value="1,000,000,000,000,000 base units (1 billion AMC at 6 decimals)" />
          <DisclosureRow label="Upgrade policy" value="IMMUTABLE — UpgradeCap destroyed on-chain" highlight="ok" />
        </div>
      </Section>

      {/* Operational Disclosures */}
      <Section title="Operational Disclosures">
        <div className="space-y-0">
          <DisclosureRow
            label="External audit"
            value="NOT YET CONDUCTED — deferred temporarily. Remediation deadline: 2026-07-14."
            highlight="warn"
          />
          <DisclosureRow
            label="Custody model"
            value="Single-wallet AdminCap (temporary). Multisig migration planned by 2026-06-14."
            highlight="warn"
          />
          <DisclosureRow
            label="Package immutability"
            value="CONFIRMED — UpgradeCap destroyed on Sui Mainnet. Package cannot be upgraded."
            highlight="ok"
          />
          <DisclosureRow
            label="Claim eligibility"
            value="Determined by operator-set Merkle root. Not all wallets are eligible."
          />
          <DisclosureRow
            label="Claim amount"
            value="1,000,000 base units (1 AMC) per eligible wallet. Fixed at campaign creation."
          />
          <DisclosureRow
            label="Expiry"
            value="No expiry epoch set. Campaign remains open until closed by operator."
          />
          <DisclosureRow
            label="Scope"
            value="Sui mainnet only. Unrelated to Arbitrum, Polygon, Avalanche, or any financial product."
          />
        </div>
      </Section>

      {/* On-Chain Records */}
      <Section title="On-Chain Records">
        <p className="font-mono text-xs text-dl-muted mb-4">
          All records are verifiable on the Sui Mainnet blockchain. Explorer links open suiscan.xyz.
        </p>
        <div className="space-y-0 mb-6">
          <DisclosureRow label="Network" value="Sui Mainnet" />
          <DisclosureRow label="Package ID" value={PACKAGE_ID} />
          <DisclosureRow label="Campaign object" value={CAMPAIGN_ID} />
          <DisclosureRow label="Merkle root" value="dd6b3d845ed2129701dac7cf2637baf7a0b599d27813be4c75d3deb80394c67a" />
          <DisclosureRow label="Pool funded" value="4,000,000 base units (4 AMC initial)" />
          <DisclosureRow label="Total claimed" value="1 wallet (as of 2026-05-15)" />
          <DisclosureRow label="Published" value="2026-05-15" />
        </div>
        <div className="space-y-2">
          <ExplorerLink tx={PUBLISH_TX} label="Publish Tx" />
          <ExplorerLink tx={ACTIVATE_TX} label="Activate Tx" />
          <ExplorerLink tx={LIVE_CLAIM} label="First Claim Tx" />
        </div>
      </Section>

      {/* Current Campaign State */}
      <Section title="Current Campaign State">
        <div className="space-y-0">
          <DisclosureRow label="Status" value="ACTIVE — claims are open" highlight="ok" />
          <DisclosureRow label="Eligible wallets" value="4 (as of launch)" />
          <DisclosureRow label="Claim path" value="/sui/claim" />
          <DisclosureRow label="Proof verification" value="On-chain via Merkle proof — no operator intervention required to claim" />
          <DisclosureRow label="Already claimed?" value="Each wallet address may claim once. Duplicates are rejected on-chain." />
        </div>
      </Section>

      {/* Accepted Risk Summary */}
      <Section title="Accepted Risk — Public Notice">
        <p className="text-sm text-dl-fg mb-4">
          Axiom Protocol operates this campaign under the following formally accepted risks.
          These are not hidden — they are disclosed here for full transparency.
        </p>
        <div className="border border-yellow-700 bg-yellow-950/10 p-4 mb-4">
          <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
            Accepted Risk — External Audit Deferred
          </p>
          <p className="text-sm text-dl-muted">
            The Move smart contracts governing this campaign have not yet been reviewed by an
            independent external auditor. An audit is planned. Remediation deadline: 2026-07-14.
            Users claiming AMC should be aware of this limitation.
          </p>
        </div>
        <div className="border border-yellow-700 bg-yellow-950/10 p-4">
          <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
            Accepted Risk — Single-Wallet AdminCap Custody
          </p>
          <p className="text-sm text-dl-muted">
            The AdminCap object that controls campaign operations (pause, close, update Merkle root)
            is currently held by a single operator wallet. Multi-party authorization migration is
            planned. Deadline: 2026-06-14.
          </p>
        </div>
      </Section>

      {/* Support */}
      <Section title="Support & Contact">
        <p className="text-sm text-dl-fg mb-4">
          For questions about AMC eligibility, claim issues, or this disclosure, use the following paths.
        </p>
        <div className="space-y-0">
          <DisclosureRow label="Wallet issues" value="Ensure you are connected to Sui Mainnet with a compatible wallet" />
          <DisclosureRow label="Eligibility" value="Eligibility is determined by the Merkle root set at campaign creation" />
          <DisclosureRow label="Already claimed" value="Each address may claim once — check your wallet for existing AMC balance" />
          <DisclosureRow label="Technical support" value="Contact Axiom Protocol via official community channels" />
          <DisclosureRow label="On-chain verification" value="suiscan.xyz — search by package ID or campaign object ID" />
        </div>
      </Section>

      <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-6">
        Axiom Protocol · AMC Public Disclosure · 2026-05-15 · Community distribution only
        — NOT AXUSD, AXAU, AXM, SEED, or KAG · No monetary value · Not a financial instrument
      </p>
    </div>
  </DesignLawLayout>
);

export default SuiDisclosurePage;
