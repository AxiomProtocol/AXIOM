import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  PageShell,
  SectionHeading,
  StatusBadge,
} from '../../components/design-law';

interface ContractEntry {
  label: string;
  address: string;
}

interface GuardRail {
  number: number;
  title: string;
  description: string;
  check: string;
}

interface PhaseInfo {
  name: string;
  weeks: string;
  tasks: string[];
  exitCriteria: string[];
}

const CORE_CONTRACTS: ContractEntry[] = [
  { label: 'PRIMARY AXUSD', address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C' },
  { label: 'PRIMARY PSM', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' },
  { label: 'EULER AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c' },
  { label: 'EULER PSM', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793' },
  { label: 'Euler Vault (eAXUSD-4)', address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059' },
  { label: 'Revenue Router', address: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a' },
  { label: 'Treasury Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' },
  { label: 'AXM Token', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' },
  { label: 'SEED Token', address: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046' },
];

const GUARD_RAILS: GuardRail[] = [
  {
    number: 1,
    title: 'Fee Recipient Assumption Check',
    description: 'Before any setFeeReceiver() call, verify Euler vault fees are non-zero. Never assume fees are flowing — read on-chain.',
    check: 'GET /api/founder-ops/fee-plumbing-preflight',
  },
  {
    number: 2,
    title: 'Revenue Router Accounting Visibility',
    description: 'Never trust balance assumptions. Always perform explicit balance read + event verification.',
    check: 'GET /api/founder-ops/overview → feePlumbing field',
  },
  {
    number: 3,
    title: 'ERC4626 Share Math Edge Case',
    description: 'On every Euler Vault deposit, assert minSharesOut > 0. First depositor gets 1:1 shares.',
    check: 'Manual verification on each deposit tx',
  },
  {
    number: 4,
    title: 'Self-Borrow Risk Contamination',
    description: 'ALL founder loopback test positions MUST be tagged as NON-REPRESENTATIVE in the operations log.',
    check: 'POST /api/founder-ops/log entries must include tag',
  },
  {
    number: 5,
    title: 'Sentinel Authority Boundary',
    description: 'Sentinel is ADVISORY ONLY until a post-public governance vote explicitly grants execution authority.',
    check: '/sentinel dashboard → stance must show ADVISORY',
  },
  {
    number: 6,
    title: 'Property Phase Timing Risk',
    description: 'If no qualifying property is identified by Week 44, execute a HARD PAUSE on the property acquisition track.',
    check: 'Week 44 operations log entry required',
  },
];

const PHASES: PhaseInfo[] = [
  {
    name: 'Phase 1 — Foundation',
    weeks: 'Weeks 1–13',
    tasks: [
      'PSM Stress Test (Weeks 1–2): Mint/redeem AXUSD via PRIMARY PSM, verify 1:1 USDC peg',
      'Euler Vault Activation (Weeks 3–4): Mint via EULER PSM, deposit into Euler Vault, verify share math',
      'Revenue Router Verification (Weeks 5–6): Confirm fee flow, verify 50/30/20 distribution split',
      'AXM Accumulation (Weeks 7–8): Execute AXM buys on Camelot DEX, record slippage',
      'Lending Fund Activation (Weeks 9–10): Test deposit/withdrawal flows, verify compliance docs',
      'SEED & SUSU Launch (Weeks 11–13): Deploy SEED staking, initialize SUSU savings circle',
    ],
    exitCriteria: [
      'PSM mint/redeem cycle completed with both PSMs',
      'Euler Vault receiving deposits, generating fees',
      'Revenue Router distributing to all 3 buckets',
      'AXM position established on Camelot',
      'All transactions logged in founder-ops',
      'Zero untagged self-borrow positions',
    ],
  },
  {
    name: 'Phase 2 — Product Activation',
    weeks: 'Weeks 14–26',
    tasks: [
      'DePIN Node Deployment (Weeks 14–16): Activate first node, verify revenue flow',
      'Sentinel Live Trading (Weeks 17–19): Semi-active mode, first authorized trade',
      'Cross-Product Integration (Weeks 20–22): Full lifecycle trace with tx hashes',
      'Stress Testing (Weeks 23–26): Max positions, withdrawal paths, edge cases',
    ],
    exitCriteria: [
      'All 7 product categories activated with real capital',
      'DePIN node generating measurable revenue',
      'Sentinel pipeline producing auditable decisions',
      'Full lifecycle trace documented end-to-end',
    ],
  },
  {
    name: 'Phase 3 — Revenue Optimization',
    weeks: 'Weeks 27–39',
    tasks: [
      'Yield Optimization (Weeks 27–30): Optimize Euler + SEED positions, calculate actual APY',
      'Treasury Growth Analysis (Weeks 31–34): Aggregate revenue, project trajectory',
      'Governance Preparation (Weeks 35–39): Document learnings, define voting thresholds',
    ],
    exitCriteria: [
      'Revenue optimization implemented and measured',
      'Treasury growth trajectory calculated',
      'Property acquisition feasibility determined',
      'Governance framework documented',
    ],
  },
  {
    name: 'Phase 4 — Property Acquisition',
    weeks: 'Weeks 40–52',
    tasks: [
      'Property Pipeline (Weeks 40–43): ATTOM/RentCast/Walk Score API search',
      'HARD PAUSE Checkpoint (Week 44): Go/no-go on property acquisition',
      'Due Diligence (Weeks 45–48): Tokenization prep, legal review',
      'Acquisition (Weeks 49–52): Execute, tokenize, final audit report',
    ],
    exitCriteria: [
      'Property acquired OR hard pause documented',
      'Complete 52-week transaction audit trail',
      'All smart contracts validated through real use',
      'Protocol ready for public phase assessment',
    ],
  },
];

const RISK_CHECKPOINTS = [
  { week: 4, gate: 'PSM peg stability confirmed' },
  { week: 8, gate: 'Euler fees flowing to Revenue Router' },
  { week: 13, gate: 'Phase 1 exit criteria met' },
  { week: 17, gate: 'DePIN node revenue verified' },
  { week: 22, gate: 'Full lifecycle trace documented' },
  { week: 26, gate: 'Phase 2 exit criteria met' },
  { week: 34, gate: 'Treasury growth trajectory calculated' },
  { week: 39, gate: 'Phase 3 exit criteria met' },
  { week: 44, gate: 'Property acquisition go/no-go decision' },
];

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'phases' | 'guardrails'>('overview');
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/founder-ops/overview')
      .then((r) => r.json())
      .then((d) => {
        setLiveStatus(d.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'contracts', label: 'Contract Registry' },
    { key: 'phases', label: '52-Week Phases' },
    { key: 'guardrails', label: 'Guard Rails' },
  ] as const;

  return (
    <DesignLawLayout>
      <Head>
        <title>Operational Playbook v2.1 | AXIOM Protocol</title>
      </Head>
      <PageShell
        title="Internal Operational Playbook"
        subtitle="52-Week $100/Week Proof-of-Concept Validation — v2.1 (Feb 10, 2026)"
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #1B2A4A' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '0.5rem 1rem',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                  border: 'none',
                  borderBottom: activeTab === t.key ? '2px solid #1B2A4A' : '2px solid transparent',
                  background: 'transparent',
                  color: activeTab === t.key ? '#1B2A4A' : '#6B7280',
                  cursor: 'pointer',
                  fontWeight: activeTab === t.key ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <SectionHeading>Mission</SectionHeading>
            <p style={{ fontFamily: 'Georgia, serif', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Validate all 56+ deployed smart contracts on Arbitrum One through real capital flows over 52 weeks
              at $100/week ($5,200 total). Generate auditable on-chain evidence of every product's full lifecycle.
              Accumulate sufficient protocol-generated revenue to acquire the first investment property.
            </p>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', marginBottom: '2rem' }}>
              Classification: INTERNAL — Solo Founder Use Only | Network: Arbitrum One (42161)
            </p>

            <SectionHeading>Dual AXUSD Ecosystem</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.75rem', color: '#1B2A4A' }}>PRIMARY AXUSD (GENIUS Act)</h4>
                <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Address</td><td style={{ wordBreak: 'break-all' }}>0x7358...5b89C</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Supply</td><td>1,000,048+ AXUSD</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>PSM Ceiling</td><td>5,000,000 USDC</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Use For</td><td>Minting, PSM swaps, public metrics</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.75rem', color: '#1B2A4A' }}>EULER AXUSD (Original)</h4>
                <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Address</td><td style={{ wordBreak: 'break-all' }}>0xA790...79429</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Supply</td><td>156.50 AXUSD</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>PSM Ceiling</td><td>500,000 USDC</td></tr>
                    <tr><td style={{ padding: '0.25rem 0', color: '#6B7280' }}>Use For</td><td>Euler Vault, Revenue Router, lending</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ border: '1px solid #8B0000', padding: '1rem', marginBottom: '2rem', background: '#FFF5F5' }}>
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000', margin: 0, fontWeight: 600 }}>
                DO NOT MIX: Never deposit PRIMARY AXUSD into Euler Vault. Never report EULER AXUSD metrics as public supply.
              </p>
            </div>

            <SectionHeading>Fee Plumbing</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', marginBottom: '1.5rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Fee Source', 'Euler Vault (eAXUSD-4)'],
                  ['Fee Recipient', 'Revenue Router'],
                  ['Interest Fee', '10% of borrower interest'],
                  ['SEED Yield', '50%'],
                  ['Treasury', '30%'],
                  ['Backstop', '20%'],
                  ['Status', liveStatus?.feePlumbing?.status || 'Loading...'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.5rem 0', color: '#6B7280', width: '40%' }}>{k}</td>
                    <td style={{ padding: '0.5rem 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Weekly Capital Allocation</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>DEFAULT</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>HALTED</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>RISK_ON</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AXUSD Minting (PRIMARY)', '$40', '$40', '$40'],
                  ['AXM Accumulation', '$25', '$15', '$35'],
                  ['Buffer / Gas', '$20', '$30', '$10'],
                  ['DePIN Node', '$15', '$15', '$15'],
                  ['Total', '$100', '$100', '$100'],
                ].map(([cat, def_, halt, risk], i, arr) => (
                  <tr key={cat} style={{ borderBottom: '1px solid #E5E7EB', fontWeight: i === arr.length - 1 ? 600 : 400 }}>
                    <td style={{ padding: '0.5rem' }}>{cat}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{def_}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{halt}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Live System Status</SectionHeading>
            {loading ? (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280' }}>Loading live data...</p>
            ) : liveStatus ? (
              <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(liveStatus.dataSourceStatus || {}).map(([src, status]) => (
                    <tr key={src} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.5rem 0', color: '#6B7280', textTransform: 'capitalize' }}>{src}</td>
                      <td style={{ padding: '0.5rem 0' }}>
                        <StatusBadge status={status === 'OK' ? 'active' : 'warning'} label={String(status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#8B0000' }}>Failed to load live status</p>
            )}

            <div style={{ marginTop: '2rem' }}>
              <SectionHeading>Risk Checkpoints</SectionHeading>
              <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '4rem' }}>#</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '5rem' }}>Week</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {RISK_CHECKPOINTS.map((cp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.5rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.5rem' }}>{cp.week}</td>
                      <td style={{ padding: '0.5rem' }}>{cp.gate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'contracts' && (
          <>
            <SectionHeading>Core Protocol Addresses</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1B2A4A' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Contract</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Address</th>
                </tr>
              </thead>
              <tbody>
                {CORE_CONTRACTS.map((c) => (
                  <tr key={c.label} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.5rem' }}>{c.label}</td>
                    <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>
                      <a
                        href={`https://arbiscan.io/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1B2A4A', textDecoration: 'underline' }}
                      >
                        {c.address}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionHeading>Binding Verification</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>EulerVault.asset()</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>RevenueRouter.axusd()</td>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', color: '#6B7280' }}>Match</td>
                  <td style={{ padding: '0.5rem' }}><StatusBadge status="active" label="CONFIRMED" /></td>
                </tr>
              </tbody>
            </table>

            <SectionHeading>Legacy / Deprecated</SectionHeading>
            <table style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all', color: '#6B7280' }}>0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F</td>
                  <td style={{ padding: '0.5rem' }}>handleUSD (fxUSD) — NOT Axiom</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.5rem', wordBreak: 'break-all', color: '#6B7280' }}>0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429</td>
                  <td style={{ padding: '0.5rem' }}>Euler Vault V3 — deprecated (broken hook config)</td>
                </tr>
              </tbody>
            </table>

            <SectionHeading>Source of Truth</SectionHeading>
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', lineHeight: 1.8 }}>
              All runtime code imports from: <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>src/config/activeContracts.generated.ts</code>
              <br />
              Regenerate: <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>npm run verify:contracts</code>
            </p>
          </>
        )}

        {activeTab === 'phases' && (
          <>
            {PHASES.map((phase) => (
              <div key={phase.name} style={{ marginBottom: '2rem' }}>
                <SectionHeading>{phase.name}</SectionHeading>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                  {phase.weeks}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  {phase.tasks.map((task, i) => (
                    <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #E5E7EB', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                      {task}
                    </div>
                  ))}
                </div>
                <div style={{ border: '1px solid #1B2A4A', padding: '1rem' }}>
                  <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', margin: '0 0 0.5rem', color: '#1B2A4A' }}>Exit Criteria</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                    {phase.exitCriteria.map((c, i) => (
                      <li key={i} style={{ padding: '0.25rem 0' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'guardrails' && (
          <>
            <SectionHeading>6 Mandatory Guard Rails</SectionHeading>
            {GUARD_RAILS.map((gr) => (
              <div key={gr.number} style={{ border: '1px solid #1B2A4A', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 0.5rem', color: '#1B2A4A' }}>
                  #{gr.number}: {gr.title}
                </h4>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                  {gr.description}
                </p>
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                  Check: {gr.check}
                </p>
              </div>
            ))}

            <div style={{ marginTop: '2rem' }}>
              <SectionHeading>Weekly Operations Checklist</SectionHeading>
              <ol style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', paddingLeft: '1.25rem' }}>
                <li style={{ padding: '0.25rem 0' }}>Run <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>npm run verify:contracts</code> — confirm addresses unchanged</li>
                <li style={{ padding: '0.25rem 0' }}>Check <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>GET /api/founder-ops/overview</code> — all 6 sources OK</li>
                <li style={{ padding: '0.25rem 0' }}>Check <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>GET /api/founder-ops/fee-plumbing-preflight</code> — OPERATIONAL</li>
                <li style={{ padding: '0.25rem 0' }}>Check /sentinel — current regime and stance</li>
                <li style={{ padding: '0.25rem 0' }}>Execute weekly capital allocation per Sentinel regime</li>
                <li style={{ padding: '0.25rem 0' }}>AXUSD minting: use PRIMARY PSM only</li>
                <li style={{ padding: '0.25rem 0' }}>Euler deposits: use EULER PSM to mint, then deposit EULER AXUSD only</li>
                <li style={{ padding: '0.25rem 0' }}>Log all transactions via <code style={{ background: '#F3F4F6', padding: '0.15rem 0.4rem' }}>POST /api/founder-ops/log</code></li>
                <li style={{ padding: '0.25rem 0' }}>Verify Revenue Router received any new fees</li>
                <li style={{ padding: '0.25rem 0' }}>Update operations log with week number and outcomes</li>
              </ol>
            </div>
          </>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
