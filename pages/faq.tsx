import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQEntry {
  q: string;
  a: React.ReactNode;
}

const FAQ_SECTIONS: { title: string; items: FAQEntry[] }[] = [
  {
    title: 'Protocol Overview',
    items: [
      {
        q: 'What is Axiom Protocol?',
        a: (
          <>
            <p>Axiom Protocol is a governance-first financial operating system for real-world assets. It delivers:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>AXAU</strong> — a gold-backed reserve unit, collateralised 1:1 by PAXG on Arbitrum One</li>
              <li><strong>AXUSD</strong> — an identity-gated settlement stablecoin (ERC-3643)</li>
              <li><strong>Capital Programs</strong> — structured Reg D 506(c) real estate investment vehicles</li>
              <li><strong>Intelligence Layer</strong> — regime analysis (MIRDT), risk authorization (Sentinel), and institutional transparency (Observer)</li>
              <li><strong>Community Access</strong> — Wealth Practice group economics and a Land Acquisition Pipeline</li>
            </ul>
            <p className="mt-2">
              All components operate on Arbitrum One with full on-chain audit trails. Independent verification does not require trust — it requires reading the chain.
            </p>
          </>
        ),
      },
      {
        q: 'Is this a crypto project or a real estate platform?',
        a: (
          <p>
            Neither description is complete. Axiom is a financial operating system that uses on-chain infrastructure (automated control layers, identity credentials, on-chain financial rails) as the mechanism for governance, settlement, and reporting.
            Real assets (real estate, gold via PAXG) are the underlying subject matter. The platform is designed for both community participants (no crypto knowledge required) and institutional allocators who require on-chain transparency.
          </p>
        ),
      },
      {
        q: 'What network does Axiom Protocol run on?',
        a: (
          <p>
            All production automated control layers are deployed on <strong>Arbitrum One</strong> (Chain ID 42161). The governance token (AXM), AXAU reserve contract, AXUSD rail, Camelot DEX pools, lending fund vaults, and observer infrastructure are all live on Arbitrum One.
            A future migration to Universe Blockchain (an Arbitrum L3) is on the roadmap but has not been executed.
          </p>
        ),
      },
    ],
  },
  {
    title: 'AXAU and AXUSD',
    items: [
      {
        q: 'What is the difference between AXAU and AXUSD?',
        a: (
          <>
            <p><strong>AXAU</strong> is the gold-backed reserve unit. Each AXAU is collateralised 1:1 by PAXG (a gold token backed by LBMA-standard gold). AXAU is a store of value instrument — it tracks gold, not USD.</p>
            <p className="mt-2"><strong>AXUSD</strong> is the settlement stablecoin. It is pegged to USD and is used for transactional capital, platform settlement, and PSM-backed liquidity. AXUSD is the operating currency of the protocol — paying into pools, receiving distributions, and on-chain settlement all use AXUSD.</p>
            <p className="mt-2">Both tokens use the ERC-3643 identity standard and require an on-chain identity credential to hold and transfer.</p>
          </>
        ),
      },
      {
        q: 'How is AXAU collateralised?',
        a: (
          <>
            <p>
              AXAU is backed 1:1 by PAXG, which is itself backed by allocated London gold bars held by Paxos Trust Company. The mint/redeem cycle works as follows:
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>User submits an AXAU purchase request</li>
              <li>Operations team acquires the corresponding PAXG</li>
              <li>PAXG is deposited to the AXAU vault contract</li>
              <li>AXAU is minted to the identity-verified wallet</li>
            </ol>
            <p className="mt-2">Redemption follows the reverse path. All vault balances and collateral ratios are visible on the{' '}<Link href="/solvency" className="text-dl-navy underline">Solvency Console</Link>.</p>
          </>
        ),
      },
      {
        q: 'What is identity gating (ERC-3643)?',
        a: (
          <p>
            ERC-3643 (also known as T-REX) is an on-chain identity and compliance standard. Before holding or transferring AXAU or AXUSD, a wallet must hold an on-chain identity credential issued by Axiom Protocol.
            This credential is obtained by completing identity verification (KYC process). The credential is stored on-chain — once issued, it persists without requiring re-verification on every transaction.
            This architecture allows the protocol to enforce eligibility rules at the token level without a centralised custodian controlling the assets.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Participation and Access',
    items: [
      {
        q: 'Do I need to be an accredited investor to participate?',
        a: (
          <>
            <p>It depends on the product:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Wealth Practice groups</strong> — No accreditation required. Groups start as low as $25/month.</li>
              <li><strong>Community Entry Credit</strong> — No accreditation required. Income-backed credit line.</li>
              <li><strong>Property Analysis, Deal Flow</strong> — No accreditation required.</li>
              <li><strong>AXAU Reserve / AXUSD</strong> — Identity verification required (ERC-3643), not accreditation.</li>
              <li><strong>Capital Program / Lending Fund (Reg D 506(c))</strong> — Accredited investor verification required.</li>
              <li><strong>Syndication (Reg D 506(c))</strong> — Accreditation required for structured offerings.</li>
            </ul>
          </>
        ),
      },
      {
        q: 'What are the two paths — direct and assisted?',
        a: (
          <>
            <p><strong>Direct (self-custody, on-chain):</strong> Connect your self-custody wallet on Arbitrum One, complete identity verification, and interact directly with the automated control layers. Full transparency, full self-custody, no intermediary.</p>
            <p className="mt-2"><strong>Assisted (ops-mediated):</strong> For participants who prefer not to manage wallets directly, certain operations (especially AXAU purchases and Wealth Practice group contributions) can be coordinated through the operations team. Settlement still flows through on-chain infrastructure.</p>
            <p className="mt-2">Both paths produce on-chain records. The choice is about who holds the keys.</p>
          </>
        ),
      },
      {
        q: 'What self-custody wallet do I need?',
        a: (
          <p>
            Any ERC-20 compatible wallet configured for Arbitrum One will work — MetaMask is the most common option. The platform uses Wagmi v2 + Reown AppKit for wallet connection, which supports MetaMask, WalletConnect-compatible wallets, and Coinbase Wallet.
            You do not need to understand the underlying contract mechanics — the platform interface is designed to feel like a financial dashboard.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Trust, Audits, and Governance',
    items: [
      {
        q: 'Have the automated control layers been audited?',
        a: (
          <p>
            The automated control layers (smart contracts) deployed on Arbitrum One have not yet been formally audited by a third-party security firm. A third-party audit is on the development roadmap. All contracts are deployed on mainnet and verifiable on Arbiscan.
            In the interim, the protocol relies on on-chain transparency, the Observer Dashboard for independent verification, and the Proof of Execution log for operational accountability. Participants should treat the absence of a completed audit as a material risk factor.
          </p>
        ),
      },
      {
        q: 'How does on-chain governance work?',
        a: (
          <>
            <p>
              The AXM governance token on Arbitrum One carries voting rights over protocol parameters including treasury allocation policy, risk parameters, and capital program rules. On-chain governance actions are recorded with full audit trails.
            </p>
            <p className="mt-2">
              The Founder Operations Dashboard provides internal governance logging. The{' '}
              <Link href="/observer" className="text-dl-navy underline">Observer Dashboard</Link>{' '}
              provides public read-only access to governance role assignments and on-chain state.
              The{' '}
              <Link href="/sentinel" className="text-dl-navy underline">Sentinel</Link>{' '}
              layer enforces policy-based authorization on all capital decisions, requiring explicit human confirmation on all outputs.
            </p>
          </>
        ),
      },
      {
        q: 'What is the treasury allocation policy?',
        a: (
          <>
            <p>Every dollar raised into the Capital Program follows a fixed 35/35/20/10 allocation:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>35%</strong> — Property equity acquisition</li>
              <li><strong>35%</strong> — Debt service</li>
              <li><strong>20%</strong> — Operating reserve</li>
              <li><strong>10%</strong> — Protocol development</li>
            </ul>
            <p className="mt-2">This policy is defined programmatically and enforced on-chain. The Solvency Console and Observer Dashboard display live treasury allocations.</p>
          </>
        ),
      },
      {
        q: 'Is Axiom Protocol a licensed financial institution?',
        a: (
          <p>
            No. Axiom Protocol is not a bank, registered investment advisor, broker-dealer, or licensed financial institution. The Capital Program and Lending Fund are structured to align with SEC Regulation D 506(c) exemptions for accredited investors — this is a regulatory framework used for private placement offerings, not a full registration.
            Nothing on this platform constitutes legal, financial, or investment advice. All participants should consult qualified professionals before making any financial commitments.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Wealth Practice and Community',
    items: [
      {
        q: 'What is the Wealth Practice?',
        a: (
          <>
            <p>
              The Wealth Practice is Axiom Protocol's structured community savings framework. It replaces the traditional SUSU/ROSCA (Rotating Savings and Credit Association) model with a three-stage trust pipeline and on-chain settlement:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Stage 1 — Interest Hub:</strong> 4-week interest period. No capital commitment. Learn the process.</li>
              <li><strong>Stage 2 — Purpose Group:</strong> Fixed cycle contributions. Build a GEF participation record.</li>
              <li><strong>Stage 3 — On-Chain Pool:</strong> Graduated groups move to fully on-chain settlement with Wealth Practice contracts.</li>
            </ul>
            <p className="mt-2">No accreditation required. No crypto knowledge required to begin. Groups are currently forming in Atlanta, Houston, and Charlotte.</p>
          </>
        ),
      },
      {
        q: 'What happens if a group member misses a contribution?',
        a: (
          <p>
            The three-stage trust pipeline is designed to surface consistent participants before capital is pooled on-chain. In Stage 2 (Purpose Group), missed contributions are logged against the member's GEF score and may pause tier advancement. Community Entry Credit provides a contribution smoothing mechanism for members facing short-term liquidity constraints. Repeated violations result in removal from the group per the published group governance rules.
          </p>
        ),
      },
    ],
  },
];

function FAQItem({ item, defaultOpen = false }: { item: FAQEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-b border-dl-border ${open ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="font-dl-serif text-base text-dl-navy pr-4 leading-snug">{item.q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-dl-gray flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-dl-gray flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-dl-gray space-y-2 leading-relaxed border-l-4 border-l-dl-gold ml-0">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>FAQ — Axiom Protocol</title>
        <meta name="description" content="Frequently asked questions about Axiom Protocol: AXAU and AXUSD, participation paths, identity gating (ERC-3643), governance, audits, and the Wealth Practice." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-forest uppercase tracking-widest mb-4 font-dl-mono">Frequently Asked Questions</p>
        <h1 className="font-dl-serif text-2xl sm:text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Platform FAQ
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Answers to the most common questions about how Axiom Protocol works — from protocol structure and token design to governance, participation paths, and risk factors.
        </p>
      </div>

      <div className="mb-12 space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title}>
            <SectionHeading>{section.title}</SectionHeading>
            <div className="border border-dl-border mt-4">
              {section.items.map((item, i) => (
                <FAQItem key={i} item={item} defaultOpen={i === 0 && section.title === 'Protocol Overview'} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-dl-border p-6 bg-dl-bg-alt border-l-4 border-l-dl-error mb-10">
        <h3 className="font-dl-serif text-base text-dl-navy mb-3">Legal Notice</h3>
        <p className="text-xs text-dl-gray leading-relaxed mb-3">
          Nothing on this platform constitutes legal, financial, investment, or tax advice. No outcomes are guaranteed. All participation carries material risk including total loss of capital. The automated control layers have not been formally audited by a third-party security firm.
        </p>
        <p className="text-xs text-dl-gray leading-relaxed">
          The Capital Program and Lending Fund are structured to align with SEC Regulation D 506(c) — this is not a determination of securities law compliance. Participants are responsible for their own decisions and should consult qualified legal and financial professionals before committing capital.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/disclosure" className="px-5 py-2.5 bg-dl-navy text-white text-sm font-medium no-underline">
          Read Full Disclosure
        </Link>
        <Link href="/solvency" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
          Solvency Console
        </Link>
        <Link href="/start" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
          Get Started
        </Link>
        <Link href="/contact" className="px-5 py-2.5 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium no-underline">
          Contact
        </Link>
      </div>
    </DesignLawLayout>
  );
}
