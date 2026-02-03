import { useState } from 'react';
import Head from 'next/head';

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
        <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">{item.title}</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openId === item.id && (
            <div className="px-6 py-4 bg-white">
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
    live: 'bg-green-100 text-green-800 border-green-200',
    observation: 'bg-amber-100 text-amber-800 border-amber-200',
    planned: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  
  const labels = {
    live: 'Live',
    observation: 'In Observation',
    planned: 'Planned',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function InstitutionalPage() {
  const lastUpdated = 'February 3, 2026';
  const observationWindowStart = 'January 2026';
  
  return (
    <>
      <Head>
        <title>Institutional Overview | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol institutional documentation for allocators, builders, and partners." />
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Axiom Protocol</h1>
              <p className="text-gray-600 mt-1">Institutional Overview</p>
            </div>
            <div className="flex flex-col sm:items-end gap-1 text-sm text-gray-500">
              <span>Last Updated: {lastUpdated}</span>
              <span>Observation Window: {observationWindowStart}</span>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              1. Executive Overview
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Axiom Protocol is a land-first community ownership platform built on Arbitrum One with 43 deployed smart contracts. 
              The protocol enables communities to acquire, develop, and own real estate through SEC-compliant crowdfunding, 
              SUSU-style savings pooling, and tokenized land options. It bridges traditional real estate finance with 
              decentralized infrastructure, offering institutional-grade treasury management, transparent settlement systems, 
              and community-driven governance. The protocol's mission is to build America's first 1,000-acre on-chain sovereign 
              smart city economy.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              2. Core Thesis
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Capital Infrastructure, Not Speculation</h3>
                <p className="text-sm">
                  Axiom is designed as financial infrastructure for community capital deployment, not a speculative token project. 
                  Revenue generation is tied to real economic activity: lending interest, protocol fees, land income, and 
                  insurance premiums—not token emissions.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Settlement-First Architecture</h3>
                <p className="text-sm">
                  The protocol prioritizes settlement correctness over yield optimization. All capital deployment requires 
                  dual attestation from independent node operators, 24-hour timelock governance, and verifiable audit trails 
                  before execution.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Real-World Asset Execution Focus</h3>
                <p className="text-sm">
                  Primary focus is on mortgage note participation, property-backed lending (Fix & Flip, DSCR), and community 
                  land acquisition. Token mechanics exist to coordinate infrastructure participation, not as primary 
                  investment vehicles.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              3. System Architecture
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Layered Model</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 font-medium text-gray-900">Layer</th>
                        <th className="text-left py-2 pr-4 font-medium text-gray-900">Components</th>
                        <th className="text-left py-2 font-medium text-gray-900">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Presentation</td>
                        <td className="py-2 pr-4">Next.js 14, React 18</td>
                        <td className="py-2">User interfaces, dashboards</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Application</td>
                        <td className="py-2 pr-4">Node.js, Express, API Routes</td>
                        <td className="py-2">Business logic, orchestration</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Data</td>
                        <td className="py-2 pr-4">PostgreSQL, Drizzle ORM</td>
                        <td className="py-2">Off-chain state, analytics</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Settlement</td>
                        <td className="py-2 pr-4">Arbitrum One Smart Contracts</td>
                        <td className="py-2">On-chain transactions, immutable records</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Integration</td>
                        <td className="py-2 pr-4">Alchemy, Resend, ATTOM Data</td>
                        <td className="py-2">External services, data feeds</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Arbitrum One as Primary Settlement Layer</h3>
                <p className="text-sm text-gray-700 mb-3">
                  All financial logic, governance, and settlement occurs on Arbitrum One (Chain ID: 42161). 
                  The protocol treats Arbitrum as the "balance sheet and settlement layer" while other chains 
                  (if integrated) serve as collateral or liquidity sources with risk-translated values.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-gray-900">43</div>
                    <div className="text-gray-600">Contracts Deployed</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-gray-900">34</div>
                    <div className="text-gray-600">Verified</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-gray-900">24h</div>
                    <div className="text-gray-600">Timelock Delay</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-gray-900">6</div>
                    <div className="text-gray-600">Role Categories</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Node Participation Model</h3>
                <p className="text-sm text-gray-700 mb-3">
                  The Node Operator Network provides a verification layer for Capital Bridge settlements. 
                  Participation is permissioned, not permissionless. Node operators validate documentation 
                  and attest to settlement readiness—they do not have custody of funds.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 font-medium text-gray-900">Role</th>
                        <th className="text-left py-2 pr-4 font-medium text-gray-900">Tier</th>
                        <th className="text-left py-2 font-medium text-gray-900">Capabilities</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Observer</td>
                        <td className="py-2 pr-4">LIGHT</td>
                        <td className="py-2">Read-only metrics, weekly reports, dashboard access</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">Validator</td>
                        <td className="py-2 pr-4">STANDARD</td>
                        <td className="py-2">Artifact validation, underwriting review</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Attestor</td>
                        <td className="py-2 pr-4">STRONG</td>
                        <td className="py-2">Final attestation authority, dual attestation participation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              4. Financial Products Overview
            </h2>
            <Accordion items={[
              {
                id: 'axusd',
                title: 'AXUSD Stablecoin',
                content: (
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      AXUSD is the settlement currency for all protocol transactions. It is designed as a 1:1 USD-pegged 
                      stablecoin deployed on Arbitrum One.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                      <strong>Current Status:</strong> Token deployed. CDP and PSM modules are planned for Phase 1 
                      Treasury Integration. AXUSD is not currently mintable by users.
                    </div>
                    <p>
                      <strong>Contract:</strong> <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C</code>
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
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>Institutional-grade lending products backed by real property collateral:</p>
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-4 font-medium">Product</th>
                          <th className="text-left py-2 pr-4 font-medium">LTV</th>
                          <th className="text-left py-2 pr-4 font-medium">APR</th>
                          <th className="text-left py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 pr-4">Fix & Flip Bridge</td>
                          <td className="py-2 pr-4">75% ARV</td>
                          <td className="py-2 pr-4">12%</td>
                          <td className="py-2"><StatusBadge status="live" /></td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 pr-4">30-Year DSCR Rental</td>
                          <td className="py-2 pr-4">75%</td>
                          <td className="py-2 pr-4">8%</td>
                          <td className="py-2"><StatusBadge status="live" /></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4">BRRRR Refinance</td>
                          <td className="py-2 pr-4">70%</td>
                          <td className="py-2 pr-4">8.5%</td>
                          <td className="py-2"><StatusBadge status="live" /></td>
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
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      The Note Portal manages private credit note participation for treasury operations. 
                      This is the primary mechanism for the first settlement execution.
                    </p>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
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
                      No tokenization, no public participation, no AXUSD minting until settlement loop is verified.
                    </p>
                  </div>
                ),
              },
              {
                id: 'susu',
                title: 'SUSU Savings Circles',
                content: (
                  <div className="space-y-3 text-sm text-gray-700">
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
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
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
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      SEC-compliant community ownership of real property through tokenized crowdfunding.
                    </p>
                    <p><strong>Token Standard:</strong> ERC-1155 (multi-token) for fractional land shares</p>
                    <p><strong>Regulatory Framework:</strong> SEC Reg CF for community participation</p>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <strong>Acquisition Pipeline:</strong>
                      <ol className="mt-2 list-decimal list-inside space-y-1">
                        <li>Sourcing: Identify target properties</li>
                        <li>Due Diligence: Property evaluation, title search</li>
                        <li>Crowdfunding: SEC Reg CF compliant capital raise</li>
                        <li>Tokenization: Issue ERC-1155 ownership tokens</li>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              5. Compliance & Risk Posture
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Regulatory Framework</h3>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-900">Regulation</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-900">Products</th>
                      <th className="text-left py-2 font-medium text-gray-900">Investor Requirements</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4">SEC Reg D 506(c)</td>
                      <td className="py-2 pr-4">Lending Fund, Mortgage Notes, Savings, Rent Streams</td>
                      <td className="py-2">Accredited Investors Only</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">SEC Reg CF</td>
                      <td className="py-2 pr-4">Community Land Funds</td>
                      <td className="py-2">All investors (with limits)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-l-4 border-amber-400 bg-amber-50">
                <h3 className="font-medium text-gray-900 mb-2">Important Disclaimers</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>
                    <strong>Not a security claim:</strong> AXM token utility is designed around governance, 
                    staking, and fee payment. Token mechanics coordinate infrastructure participation.
                  </li>
                  <li>
                    <strong>No redemption promises:</strong> AXUSD is designed as settlement infrastructure. 
                    There are no guarantees of redemption for underlying assets.
                  </li>
                  <li>
                    <strong>Observation window:</strong> The protocol is in an observation period. Capital 
                    deployment is gated by the Readiness Gate system requiring 90+ days operational stability.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">How Institutions Interact Safely</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li><strong>Observer Dashboard:</strong> Public transparency dashboard with treasury metrics, governance status, and risk monitoring.</li>
                  <li><strong>Readiness Gate:</strong> Capital deployment requires passing four checks: observation period, uptime, incident history, and TVL threshold.</li>
                  <li><strong>Dual Attestation:</strong> All settlements require attestations from two independent Attestors with different competency categories.</li>
                  <li><strong>24-Hour Timelock:</strong> All governance actions except emergency pause require minimum 24-hour delay.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              6. Governance & Transparency
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Role Hierarchy</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 font-medium text-gray-900">Role</th>
                        <th className="text-left py-2 font-medium text-gray-900">Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">DEFAULT_ADMIN_ROLE</td>
                        <td className="py-2">Protocol-level control (Gnosis Safe multisig)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">RISK_COMMITTEE_ROLE</td>
                        <td className="py-2">Risk parameter updates</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">SETTLEMENT_AUTHORITY</td>
                        <td className="py-2">Product activation</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">GUARDIAN_ROLE</td>
                        <td className="py-2">Emergency pause (immediate)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4">OPERATOR_ROLE</td>
                        <td className="py-2">Day-to-day operations</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">CIRCUIT_BREAKER_ROLE</td>
                        <td className="py-2">Automated emergency triggers</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Auditability</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>All 43 contracts verified on Blockscout</li>
                  <li>Complete event logging for critical operations</li>
                  <li>Credits Ledger with transparent accrual and distribution</li>
                  <li>Observer Dashboard with 7 public transparency pages</li>
                  <li>Immutable on-chain audit trail for settlements</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">What This Is Not</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Not a DAO with anonymous governance</li>
                  <li>Not a yield farming protocol</li>
                  <li>Not a permissionless system</li>
                  <li>Governance is explicit, accountable, and traceable</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              7. Institutional Engagement Paths
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Limited Partners (LPs)</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Access to SEC Reg D 506(c) lending funds</li>
                  <li>Observer Dashboard for transparency</li>
                  <li>Quarterly reporting and performance metrics</li>
                  <li>No token exposure required</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Builders & Developers</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>API access for integration</li>
                  <li>Smart contract documentation</li>
                  <li>Builder & Farmer credit programs</li>
                  <li>Infrastructure development participation</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Node Operators</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Verification and attestation roles</li>
                  <li>USD-denominated compensation ($100/settlement)</li>
                  <li>Milestone-based accrual via Credits Ledger</li>
                  <li>Tiered participation (Observer → Validator → Attestor)</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Research & Grant Partners</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Property research and underwriting</li>
                  <li>Note acquisition pipeline participation</li>
                  <li>Academic and institutional research collaboration</li>
                  <li>Due diligence documentation access</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              8. Current Status
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <StatusBadge status="live" /> Live Components
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>43 smart contracts deployed on Arbitrum One (34 verified)</li>
                  <li>Core infrastructure: AxiomV2, Treasury, Staking, Governance, Identity</li>
                  <li>DEX V2 ecosystem (10 contracts)</li>
                  <li>AXUSD token contract</li>
                  <li>Lending fund infrastructure (3 contracts)</li>
                  <li>Node Operator Portal and Credits Ledger</li>
                  <li>Observer Dashboard (7 pages)</li>
                  <li>Note Acquisition Portal</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <StatusBadge status="observation" /> In Observation / Testing
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>Settlement 001 execution preparation</li>
                  <li>Capital Bridge workflow verification</li>
                  <li>Readiness Gate criteria validation</li>
                  <li>Node operator certification pipeline</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <StatusBadge status="planned" /> Planned / Capital-Dependent
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>AXUSD CDP and PSM modules</li>
                  <li>External security audits</li>
                  <li>Treasury adapter contracts for external capital</li>
                  <li>Universe L3 testnet and mainnet migration</li>
                  <li>External pilot programs ($100K-$500K allocations)</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              9. Documentation & Verification
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Primary Documentation</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>
                    <strong>Whitepaper:</strong> <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">docs/AXIOM_WHITEPAPER.md</code> (1,051 lines)
                  </li>
                  <li>
                    <strong>GitHub Repository:</strong>{' '}
                    <a 
                      href="https://github.com/AxiomProtocol/AXIOM" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700 underline"
                    >
                      github.com/AxiomProtocol/AXIOM
                    </a>
                  </li>
                  <li>
                    <strong>Contract Registry:</strong> All 43 contracts verified on Arbitrum One Blockscout
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Verification Recommendation</h3>
                <p className="text-sm text-gray-700">
                  Independent review is encouraged. All claims in this document are sourced from the 
                  AXIOM_WHITEPAPER.md and verified contract deployments. Prospective partners should 
                  conduct their own technical and legal due diligence.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Contact</h3>
                <p className="text-sm text-gray-700">
                  For institutional inquiries, partnership discussions, or verification requests, 
                  please use the contact form on the main website or reach out via the GitHub repository.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500 text-center">
            <p>Axiom Protocol | Institutional Overview</p>
            <p className="mt-1">Last Updated: {lastUpdated} | Observation Window Start: {observationWindowStart}</p>
          </div>
        </div>
      </div>
    </>
  );
}
