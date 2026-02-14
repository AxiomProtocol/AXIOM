import { useState } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

type AccordionItem = {
  id: string;
  title: string;
  content: React.ReactNode;
};

function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border border-dl-border overflow-hidden">
          <button
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full px-6 py-4 text-left flex items-center justify-between bg-dl-bg-alt"
          >
            <span className="font-dl-serif text-dl-navy">{item.title}</span>
            <svg
              className={`w-5 h-5 text-dl-gray ${openId === item.id ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openId === item.id && (
            <div className="px-6 py-4 bg-dl-bg">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: 'live' | 'observation' | 'planned' }) {
  const styles = {
    live: 'bg-dl-bg-alt text-dl-forest border-dl-border',
    observation: 'bg-dl-bg-alt text-dl-navy border-dl-border',
    planned: 'bg-dl-bg-alt text-dl-gray border-dl-border',
  };

  const labels = {
    live: 'Live',
    observation: 'In Observation',
    planned: 'Planned',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-dl-mono border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function InstitutionalPage() {
  const lastUpdated = 'February 14, 2026';
  const observationWindowStart = 'January 2026';

  return (
    <DesignLawLayout>
      <Head>
        <title>Institutional Overview | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol institutional documentation for allocators, builders, and partners." />
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-dl-serif text-3xl text-dl-navy">Axiom Protocol</h1>
            <p className="text-dl-gray mt-1">Institutional Overview</p>
          </div>
          <div className="flex flex-col sm:items-end gap-1 text-sm text-dl-gray font-dl-mono">
            <span>Last Updated: {lastUpdated}</span>
            <span>Observation Window: {observationWindowStart}</span>
          </div>
        </div>

        <section className="mb-12">
          <SectionHeading>1. Executive Overview</SectionHeading>
          <p className="text-dl-navy leading-relaxed">
            Axiom Protocol is a land-first community ownership platform built on Arbitrum One with 43 deployed automated control layers (verified contract addresses on Arbiscan).
            The protocol enables communities to acquire, develop, and own real estate through SEC-compliant crowdfunding,
            SUSU-style savings pooling, and digitally issued land participation instruments. It bridges traditional real estate finance with
            decentralized infrastructure, offering institutional-grade treasury management, transparent settlement systems,
            and community-driven governance. The protocol's mission is to build America's first 1,000-acre on-chain sovereign
            digital-physical economy.
          </p>
        </section>

        <section className="mb-12">
          <SectionHeading>2. Core Thesis</SectionHeading>
          <div className="space-y-4 text-dl-navy">
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Capital Infrastructure, Not Speculation</h3>
              <p className="text-sm">
                Axiom is designed as financial infrastructure for community capital deployment, not a speculative token project.
                Revenue generation is tied to real economic activity: lending interest, protocol fees, land income, and
                insurance premiums—not token emissions.
              </p>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Settlement-First Architecture</h3>
              <p className="text-sm">
                The protocol prioritizes settlement correctness over yield optimization. All capital deployment requires
                dual attestation from independent node operators, 24-hour timelock governance, and verifiable audit trails
                before execution.
              </p>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Real-World Asset Execution Focus</h3>
              <p className="text-sm">
                Primary focus is on mortgage note participation, property-backed lending (Fix & Flip, DSCR), and community
                land acquisition. Token mechanics exist to coordinate infrastructure participation, not as primary
                investment vehicles.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>3. System Architecture</SectionHeading>
          <div className="space-y-6">
            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3">Layered Model</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left py-2 pr-4 font-medium text-dl-navy">Layer</th>
                      <th className="text-left py-2 pr-4 font-medium text-dl-navy">Components</th>
                      <th className="text-left py-2 font-medium text-dl-navy">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-dl-navy">
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4">Presentation</td>
                      <td className="py-2 pr-4 font-dl-mono">Next.js 14, React 18</td>
                      <td className="py-2">User interfaces, dashboards</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4">Application</td>
                      <td className="py-2 pr-4 font-dl-mono">Node.js, Express, API Routes</td>
                      <td className="py-2">Business logic, orchestration</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4">Data</td>
                      <td className="py-2 pr-4 font-dl-mono">PostgreSQL, Drizzle ORM</td>
                      <td className="py-2">Off-chain state, analytics</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4">Settlement</td>
                      <td className="py-2 pr-4 font-dl-mono">Arbitrum One Settlement Contracts</td>
                      <td className="py-2">On-chain transactions, immutable records</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Integration</td>
                      <td className="py-2 pr-4 font-dl-mono">Alchemy, Resend, ATTOM Data</td>
                      <td className="py-2">External services, data feeds</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3">Arbitrum One as Primary Settlement Layer</h3>
              <p className="text-sm text-dl-navy mb-3">
                All financial logic, governance, and settlement occurs on Arbitrum One (Chain ID: 42161).
                The protocol treats Arbitrum as the "balance sheet and settlement layer" while other chains
                (if integrated) serve as collateral or liquidity sources with risk-translated values.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-dl-bg-alt border border-dl-border text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">43</div>
                  <div className="text-dl-gray">Contracts Deployed</div>
                </div>
                <div className="p-3 bg-dl-bg-alt border border-dl-border text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">34</div>
                  <div className="text-dl-gray">Verified</div>
                </div>
                <div className="p-3 bg-dl-bg-alt border border-dl-border text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">24h</div>
                  <div className="text-dl-gray">Timelock Delay</div>
                </div>
                <div className="p-3 bg-dl-bg-alt border border-dl-border text-center">
                  <div className="text-2xl font-dl-mono text-dl-navy">6</div>
                  <div className="text-dl-gray">Role Categories</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3">Node Participation Model</h3>
              <p className="text-sm text-dl-navy mb-3">
                The Node Operator Network provides a verification layer for Capital Bridge settlements.
                Participation is permissioned, not permissionless. Node operators validate documentation
                and attest to settlement readiness—they do not have custody of funds.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left py-2 pr-4 font-medium text-dl-navy">Role</th>
                      <th className="text-left py-2 pr-4 font-medium text-dl-navy">Tier</th>
                      <th className="text-left py-2 font-medium text-dl-navy">Capabilities</th>
                    </tr>
                  </thead>
                  <tbody className="text-dl-navy">
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">Observer</td>
                      <td className="py-2 pr-4 font-dl-mono">LIGHT</td>
                      <td className="py-2">Read-only metrics, weekly reports, dashboard access</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">Validator</td>
                      <td className="py-2 pr-4 font-dl-mono">STANDARD</td>
                      <td className="py-2">Artifact validation, underwriting review</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-dl-mono">Attestor</td>
                      <td className="py-2 pr-4 font-dl-mono">STRONG</td>
                      <td className="py-2">Final attestation authority, dual attestation participation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>4. Financial Products Overview</SectionHeading>
          <Accordion items={[
            {
              id: 'axusd',
              title: 'AXUSD Stablecoin',
              content: (
                <div className="space-y-3 text-sm text-dl-navy">
                  <p>
                    AXUSD is the settlement currency for all protocol transactions. It is designed as a 1:1 USD-pegged
                    stablecoin deployed on Arbitrum One.
                  </p>
                  <div className="p-3 bg-dl-bg-alt border border-dl-border text-dl-navy">
                    <strong>Current Status:</strong> Token deployed. CDP and PSM modules are planned for Phase 1
                    Treasury Integration. AXUSD is not currently mintable by users.
                  </div>
                  <p>
                    <strong>Contract:</strong> <code className="text-xs bg-dl-bg-alt px-1 py-0.5 font-dl-mono">0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C</code>
                  </p>
                  <p>
                    <strong>Constraints:</strong> No redemption promises. Integration with lending, SUSU, land acquisition,
                    and node rewards is planned but dependent on infrastructure readiness.
                  </p>
                </div>
              ),
            },
            {
              id: 'lending',
              title: 'Lending Products',
              content: (
                <div className="space-y-3 text-sm text-dl-navy">
                  <p>Institutional-grade lending products backed by real property collateral:</p>
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-dl-border">
                        <th className="text-left py-2 pr-4 font-medium">Product</th>
                        <th className="text-left py-2 pr-4 font-medium">LTV</th>
                        <th className="text-left py-2 pr-4 font-medium">APR</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dl-border">
                        <td className="py-2 pr-4">Fix & Flip Bridge</td>
                        <td className="py-2 pr-4 font-dl-mono">75% ARV</td>
                        <td className="py-2 pr-4 font-dl-mono">12%</td>
                        <td className="py-2"><StatusBadge status="observation" /></td>
                      </tr>
                      <tr className="border-b border-dl-border">
                        <td className="py-2 pr-4">30-Year DSCR Rental</td>
                        <td className="py-2 pr-4 font-dl-mono">75%</td>
                        <td className="py-2 pr-4 font-dl-mono">8%</td>
                        <td className="py-2"><StatusBadge status="observation" /></td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">BRRRR Refinance</td>
                        <td className="py-2 pr-4 font-dl-mono">70%</td>
                        <td className="py-2 pr-4 font-dl-mono">8.5%</td>
                        <td className="py-2"><StatusBadge status="observation" /></td>
                      </tr>
                    </tbody>
                  </table>
                  <p>
                    <strong>Regulatory Framework:</strong> SEC Reg D 506(c) - Accredited investors only.
                  </p>
                </div>
              ),
            },
            {
              id: 'notes',
              title: 'Note Participation & Settlement',
              content: (
                <div className="space-y-3 text-sm text-dl-navy">
                  <p>
                    The Note Portal manages private credit note participation for treasury operations.
                    This is the primary mechanism for the first settlement execution.
                  </p>
                  <div className="p-3 bg-dl-bg-alt border border-dl-border">
                    <strong>Settlement 001 Parameters:</strong>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Asset: Performing residential mortgage note participation</li>
                      <li>Size: $250-500 (pilot scale)</li>
                      <li>Verification: 3+ independent node operators</li>
                      <li>Structure: Cashflow participation only (no servicing/foreclosure rights)</li>
                    </ul>
                  </div>
                  <p>
                    <strong>Purpose:</strong> Prove end-to-end settlement capability before scaling.
                    No asset issuance, no public participation, no AXUSD minting until settlement loop is verified.
                  </p>
                </div>
              ),
            },
            {
              id: 'susu',
              title: 'SUSU Savings Circles',
              content: (
                <div className="space-y-3 text-sm text-dl-navy">
                  <p>
                    On-chain Rotating Savings and Credit Associations (ROSCAs) enabling community-based
                    savings pools with blockchain transparency.
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Configurable pools: 2-50 members</li>
                    <li>Supported tokens: AXM or ERC20</li>
                    <li>Cycle durations: Daily to monthly</li>
                    <li>Payout order: Sequential or randomized</li>
                  </ul>
                  <div className="p-3 bg-dl-bg-alt border border-dl-border text-dl-navy">
                    <strong>Mode Classification:</strong> Pools exceeding $1,000/cycle, $10,000 total,
                    20 members, or 90 days automatically require enhanced compliance verification.
                  </div>
                </div>
              ),
            },
            {
              id: 'land',
              title: 'Land Acquisition System',
              content: (
                <div className="space-y-3 text-sm text-dl-navy">
                  <p>
                    Community ownership of real property through asset onboarding and issuance workflows, structured to align with applicable securities regulations.
                  </p>
                  <p><strong>Token Standard:</strong> <span className="font-dl-mono">ERC-1155</span> (multi-token) for fractional land shares</p>
                  <p><strong>Regulatory Framework:</strong> SEC Reg CF for community participation</p>
                  <div className="p-3 bg-dl-bg-alt border border-dl-border">
                    <strong>Acquisition Pipeline:</strong>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                      <li>Sourcing: Identify target properties</li>
                      <li>Due Diligence: Property evaluation, title search</li>
                      <li>Crowdfunding: SEC Reg CF compliant capital raise</li>
                      <li>Asset Issuance: Issue ERC-1155 ownership instruments</li>
                      <li>Governance: Community decisions on development</li>
                      <li>Revenue: Distribute income to token holders</li>
                    </ol>
                  </div>
                </div>
              ),
            },
          ]} />
        </section>

        <section className="mb-12">
          <SectionHeading>5. Compliance & Risk Posture</SectionHeading>
          <div className="space-y-4">
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Regulatory Framework</h3>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-dl-border">
                    <th className="text-left py-2 pr-4 font-medium text-dl-navy">Regulation</th>
                    <th className="text-left py-2 pr-4 font-medium text-dl-navy">Products</th>
                    <th className="text-left py-2 font-medium text-dl-navy">Investor Requirements</th>
                  </tr>
                </thead>
                <tbody className="text-dl-navy">
                  <tr className="border-b border-dl-border">
                    <td className="py-2 pr-4 font-dl-mono">SEC Reg D 506(c)</td>
                    <td className="py-2 pr-4">Lending Fund, Mortgage Notes, Savings, Rent Streams</td>
                    <td className="py-2">Accredited Investors Only</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-dl-mono">SEC Reg CF</td>
                    <td className="py-2 pr-4">Community Land Funds</td>
                    <td className="py-2">All investors (with limits)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 border-l-4 border-dl-border bg-dl-bg-alt">
              <h3 className="font-dl-serif text-dl-navy mb-2">Important Disclaimers</h3>
              <ul className="text-sm text-dl-navy space-y-2">
                <li>
                  <strong>Intended function:</strong> AXM is designed to function as a governance and coordination mechanism. Whether any particular token constitutes a security depends on applicable law and specific facts and circumstances. Participants should consult independent legal counsel.
                </li>
                <li>
                  <strong>No redemption guarantee:</strong> AXUSD is designed as settlement infrastructure. Redemption capacity is limited to available reserves. There is no guarantee that redemption requests can be fulfilled at any given time.
                </li>
                <li>
                  <strong>Observation window:</strong> The protocol is in an observation period. Capital
                  deployment is gated by the Readiness Gate system requiring 90+ days operational stability.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">How Institutions Interact Safely</h3>
              <ul className="text-sm text-dl-navy space-y-2">
                <li><strong>Observer Dashboard:</strong> Public transparency dashboard with treasury metrics, governance status, and risk monitoring.</li>
                <li><strong>Readiness Gate:</strong> Capital deployment requires passing four checks: observation period, uptime, incident history, and TVL threshold.</li>
                <li><strong>Dual Attestation:</strong> All settlements require attestations from two independent Attestors with different competency categories.</li>
                <li><strong>24-Hour Timelock:</strong> All governance actions except emergency pause require minimum 24-hour delay.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>6. Governance & Transparency</SectionHeading>
          <div className="space-y-4">
            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3">Role Hierarchy</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border">
                      <th className="text-left py-2 pr-4 font-medium text-dl-navy">Role</th>
                      <th className="text-left py-2 font-medium text-dl-navy">Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="text-dl-navy">
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">DEFAULT_ADMIN_ROLE</td>
                      <td className="py-2">Protocol-level control (multi-party authorization)</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">RISK_COMMITTEE_ROLE</td>
                      <td className="py-2">Risk parameter updates</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">SETTLEMENT_AUTHORITY</td>
                      <td className="py-2">Product activation</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">GUARDIAN_ROLE</td>
                      <td className="py-2">Emergency pause (immediate)</td>
                    </tr>
                    <tr className="border-b border-dl-border">
                      <td className="py-2 pr-4 font-dl-mono">OPERATOR_ROLE</td>
                      <td className="py-2">Day-to-day operations</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-dl-mono">CIRCUIT_BREAKER_ROLE</td>
                      <td className="py-2">Automated emergency triggers</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Auditability</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>43 contracts deployed on Arbiscan (34 source-verified)</li>
                <li>Complete event logging for critical operations</li>
                <li>Credits Ledger with transparent accrual and distribution</li>
                <li>Observer Dashboard with 7 public transparency pages</li>
                <li>Immutable on-chain audit trail for settlements</li>
              </ul>
            </div>

            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">What This Is Not</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>Not a DAO with anonymous governance</li>
                <li>Not a yield farming protocol</li>
                <li>Not a permissionless system</li>
                <li>Governance is explicit, accountable, and traceable</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>7. Institutional Engagement Paths</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Limited Partners (LPs)</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>Access to SEC Reg D 506(c) lending funds</li>
                <li>Observer Dashboard for transparency</li>
                <li>Quarterly reporting and performance metrics</li>
                <li>No token exposure required</li>
              </ul>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Builders & Developers</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>API access for integration</li>
                <li>Contract and integration documentation</li>
                <li>Builder & Farmer credit programs</li>
                <li>Infrastructure development participation</li>
              </ul>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Node Operators</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>Verification and attestation roles</li>
                <li>USD-denominated compensation (<span className="font-dl-mono">$100</span>/settlement)</li>
                <li>Milestone-based accrual via Credits Ledger</li>
                <li>Tiered participation (Observer → Validator → Attestor)</li>
              </ul>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Research & Grant Partners</h3>
              <ul className="text-sm text-dl-navy space-y-1">
                <li>Property research and underwriting</li>
                <li>Note acquisition pipeline participation</li>
                <li>Academic and institutional research collaboration</li>
                <li>Due diligence documentation access</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>8. Current Status</SectionHeading>
          <div className="space-y-4">
            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3 flex items-center gap-2">
                <StatusBadge status="live" /> Live Components
              </h3>
              <ul className="text-sm text-dl-navy space-y-1 ml-4">
                <li>43 automated control layers deployed on Arbitrum One (34 source-verified)</li>
                <li>Core infrastructure: AxiomV2, Treasury, Participation, Governance, Identity</li>
                <li>DEX V2 ecosystem (10 contracts)</li>
                <li>AXUSD token contract</li>
                <li>Lending fund infrastructure (3 contracts)</li>
                <li>Node Operator Portal and Credits Ledger</li>
                <li>Observer Dashboard (7 pages)</li>
                <li>Note Acquisition Portal</li>
              </ul>
            </div>
            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3 flex items-center gap-2">
                <StatusBadge status="observation" /> In Observation / Testing
              </h3>
              <ul className="text-sm text-dl-navy space-y-1 ml-4">
                <li>Settlement 001 execution preparation</li>
                <li>Capital Bridge workflow verification</li>
                <li>Readiness Gate criteria validation</li>
                <li>Node operator certification pipeline</li>
              </ul>
            </div>
            <div>
              <h3 className="font-dl-serif text-dl-navy mb-3 flex items-center gap-2">
                <StatusBadge status="planned" /> Planned / Capital-Dependent
              </h3>
              <ul className="text-sm text-dl-navy space-y-1 ml-4">
                <li>AXUSD extended collateral modules</li>
                <li>Independent third-party security audits</li>
                <li>Treasury adapter contracts for external capital</li>
                <li>Universe L3 network migration (testnet not yet launched)</li>
                <li>External pilot programs ($100K-$500K allocations)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <SectionHeading>9. Documentation & Verification</SectionHeading>
          <div className="space-y-4">
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Primary Documentation</h3>
              <ul className="text-sm text-dl-navy space-y-2">
                <li>
                  <strong>Whitepaper:</strong> <code className="text-xs bg-dl-bg px-1 py-0.5 font-dl-mono">docs/AXIOM_WHITEPAPER.md</code> (1,051 lines)
                </li>
                <li>
                  <strong>GitHub Repository:</strong>{' '}
                  <a
                    href="https://github.com/AxiomProtocol/AXIOM"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dl-navy underline"
                  >
                    github.com/AxiomProtocol/AXIOM
                  </a>
                </li>
                <li>
                  <strong>Contract Registry:</strong> 43 contracts deployed on Arbitrum One (34 source-verified on Arbiscan)
                </li>
              </ul>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Verification Recommendation</h3>
              <p className="text-sm text-dl-navy">
                Independent review is encouraged. All claims in this document are sourced from the
                AXIOM_WHITEPAPER.md and verified contract deployments. Prospective partners should
                conduct their own technical and legal due diligence.
              </p>
            </div>
            <div className="p-4 bg-dl-bg-alt border border-dl-border">
              <h3 className="font-dl-serif text-dl-navy mb-2">Contact</h3>
              <p className="text-sm text-dl-navy">
                For institutional inquiries, partnership discussions, or verification requests,
                please use the contact form on the main website or reach out via the GitHub repository.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-dl-border text-sm text-dl-gray text-center">
          <p>Axiom Protocol | Institutional Overview</p>
          <p className="mt-1 font-dl-mono">Last Updated: {lastUpdated} | Observation Window Start: {observationWindowStart}</p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
