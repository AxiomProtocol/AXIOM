import Head from 'next/head';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

const CircleWalletEntry = dynamic(
  () => import('../components/circle/CircleWalletEntry'),
  { ssr: false }
);

const C = {
  navy:     '#1e3a5f',
  navyDeep: '#0d1f36',
  gold:     '#b8860b',
  goldPale: '#d4a017',
  goldBg:   '#fdf8ee',
  border:   '#d1d5db',
  bg:       '#ffffff',
  bgAlt:    '#fafaf8',
  text:     '#111827',
  muted:    '#6b7280',
  green:    '#166534',
  greenBg:  '#f0fdf4',
  red:      '#991b1b',
  redBg:    '#fef2f2',
};

const mono  = '"Courier New", monospace';
const serif = '"Cormorant Garamond", Georgia, serif';
const body  = 'Georgia, serif';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'TT', name: 'Trinidad & Tobago' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'OTHER', name: 'Other' },
];

const DOC_TYPES = [
  { value: 'passport',         label: 'Passport' },
  { value: 'drivers_license',  label: "Driver's License" },
  { value: 'national_id',      label: 'National ID Card' },
  { value: 'residence_permit', label: 'Residence Permit' },
];

type Step = 'form' | 'submitted' | 'full' | 'already_submitted';

interface SlotData {
  cap: number;
  approved: number;
  remaining: number;
  isFull: boolean;
}

/* ─── SLOT METER ─────────────────────────────────────────── */
function SlotMeter({ slots }: { slots: SlotData }) {
  const pct = Math.min(100, Math.round((slots.approved / slots.cap) * 100));
  const urgent = slots.remaining <= 20 && !slots.isFull;
  const barColor = slots.isFull ? C.red : urgent ? '#b45309' : C.gold;

  return (
    <div style={{
      background: C.goldBg,
      border: `1px solid ${C.gold}60`,
      borderLeft: `4px solid ${urgent ? '#b45309' : C.gold}`,
      padding: '20px 24px', marginBottom: 40,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: urgent ? '#b45309' : C.gold, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {urgent ? '⚠ FILLING FAST — EARLY ACCESS SLOTS' : 'EARLY ACCESS SLOTS'}
        </span>
        <span style={{ fontFamily: mono, fontSize: 14, color: C.navy, fontWeight: 700 }}>
          {slots.approved} <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>of {slots.cap} claimed</span>
        </span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor }} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: body, fontSize: 12, color: urgent ? '#b45309' : C.muted, fontWeight: urgent ? 700 : 400 }}>
          {slots.isFull
            ? 'Early Access is full — all 100 spots claimed'
            : slots.remaining <= 10
            ? `Only ${slots.remaining} spot${slots.remaining === 1 ? '' : 's'} remaining — act now`
            : slots.remaining <= 20
            ? `${slots.remaining} spots remaining — filling quickly`
            : `${slots.remaining} of 100 spots still available`}
        </span>
        {!slots.isFull && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: C.green, textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            OPEN
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── SUCCESS SCREEN ─────────────────────────────────────── */
function SuccessScreen({ submissionId, emailQueued }: { submissionId: string; emailQueued: boolean }) {
  const shortId = submissionId.slice(0, 8).toUpperCase();
  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
        <Image src="/axau-early-access/icon-approved.png" alt="AXAU application received" fill sizes="(max-width: 768px) 100vw, 680px" style={{ objectFit: 'cover', objectPosition: 'center' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navyDeep}22 0%, ${C.navyDeep}cc 100%)` }} />
        <div style={{ position: 'absolute', bottom: 24, left: 28 }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: '#ffffff99', textTransform: 'uppercase' }}>APPLICATION STATUS</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6, background: C.navy, padding: '4px 12px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.goldPale, display: 'inline-block' }} />
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', color: '#fff', fontWeight: 700 }}>RECEIVED</span>
          </div>
        </div>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, padding: '36px 40px' }}>
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: C.navy, margin: '0 0 14px' }}>Application Received</h2>
        <p style={{ fontFamily: body, fontSize: 15, color: C.muted, maxWidth: 500, margin: '0 0 32px', lineHeight: 1.75 }}>
          Your application is queued for ops review. You will receive a confirmation email once your identity has been verified and your wallet is activated. As a founding participant, your benefits are reserved from this moment.
        </p>
        <div style={{ background: C.goldBg, border: `1px solid ${C.gold}40`, borderLeft: `3px solid ${C.gold}`, padding: '16px 20px', marginBottom: 28 }}>
          <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase', margin: '0 0 8px' }}>WHAT HAPPENS NEXT</p>
          {['Our ops team reviews your application (typically within 48 hours).', 'Your wallet is registered on-chain as a founding participant.', 'You receive an email with minting instructions and your founding cohort badge.', 'Deposit PAXG at the mint terminal to receive AXAU directly to your wallet.'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginTop: i > 0 ? 8 : 0, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: C.gold, minWidth: 18, paddingTop: 2 }}>{i + 1}.</span>
              <span style={{ fontFamily: body, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: 32 }}>
          <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 14px' }}>CONFIRMATION RECEIPT</p>
          {[
            { label: 'Reference ID', value: `#${shortId}` },
            { label: 'Status', value: 'SUBMITTED', color: C.navy },
            { label: 'Confirmation', value: emailQueued ? 'EMAIL SENT' : 'NO EMAIL', color: emailQueued ? C.green : C.muted },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{row.label}</span>
              <span style={{ fontFamily: mono, fontSize: 12, color: row.color ?? C.navy, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/axau" style={{ display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff', fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>VIEW AXAU PAGE →</a>
          <a href="/" style={{ display: 'inline-block', padding: '12px 28px', border: `1px solid ${C.border}`, color: C.navy, fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', background: C.bg }}>GO TO DASHBOARD</a>
        </div>
      </div>
    </div>
  );
}

/* ─── FULL SCREEN ────────────────────────────────────────── */
function FullScreen() {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: '48px 40px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>Early Access is Full</h2>
      <p style={{ fontFamily: body, fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.75 }}>
        All 100 early access spots have been claimed. New applications are not currently being accepted. Visit the AXAU page to learn more about future access rounds.
      </p>
      <a href="/axau" style={{ display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff', fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>VIEW AXAU →</a>
    </div>
  );
}

/* ─── ALREADY SUBMITTED ──────────────────────────────────── */
function AlreadySubmittedScreen() {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: '48px 40px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>Application on File</h2>
      <p style={{ fontFamily: body, fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.75 }}>
        This wallet already has an active AXAU early access application on file. You will be notified by email once your wallet is activated.
      </p>
      <a href="/axau" style={{ display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff', fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>VIEW AXAU PAGE →</a>
    </div>
  );
}

/* ─── STATIC DATA ────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Apply', body: 'Submit your wallet address and identity details. No document upload required at this stage.', img: '/axau-early-access/icon-apply.png', alt: 'Apply icon' },
  { n: '02', title: 'Review', body: 'Your application is reviewed by the ops team within 48 hours. You will be notified by email once cleared for on-chain activation.', img: '/axau-early-access/icon-approved.png', alt: 'Review icon' },
  { n: '03', title: 'Mint', body: 'Go to the AXAU mint terminal, deposit PAXG, and receive AXAU directly to your wallet. No intermediaries.', img: '/axau-early-access/icon-mint.png', alt: 'Mint icon' },
];

const PILLARS = [
  {
    icon: '◈',
    title: 'Coverage Ratio Enforced On-Chain',
    body: 'The GoldVault automated control layer verifies reserve coverage before every mint. If the ratio drops below the policy floor, the mint is rejected at the protocol level — no human override.',
  },
  {
    icon: '◎',
    title: 'Non-Custodial by Architecture',
    body: 'AXAU is issued directly to your wallet. No intermediary, no custodian, no pooled account. The automated control layer holds PAXG; your key controls the issued AXAU. Self-custody is the default — not an option.',
  },
  {
    icon: '◉',
    title: 'Publicly Auditable Reserve State',
    body: 'Every reserve balance, mint event, and redemption is recorded on Arbitrum One. Coverage ratio, vault state, and identity status are readable by anyone with a block explorer — no login required.',
  },
  {
    icon: '◇',
    title: 'Low-Latency On-Chain Settlement',
    body: 'Arbitrum One delivers sub-second finality at a fraction of Ethereum mainnet costs. Mint and redeem execute in one transaction with no settlement queue, no bank hours, no intermediary delay.',
  },
];

const REWARDS = [
  {
    num: '01',
    title: 'Founding Participant Status',
    body: 'Your wallet is permanently recorded on-chain as one of the first 100 participants in the AXAU Reserve. This credential is issued alongside your identity registration and cannot be replicated.',
    tag: 'PERMANENT · ON-CHAIN',
  },
  {
    num: '02',
    title: 'Priority Access to Future Instruments',
    body: 'Founding participants receive early access to new Axiom reserve instruments, lending pools, and syndication offerings before public launch — ahead of the general participant queue.',
    tag: 'FIRST ACCESS',
  },
  {
    num: '03',
    title: 'Preferred Fee Recognition',
    body: 'The first 100 participants are recognised in the protocol\'s fee governance framework as the founding cohort. Subject to governance, founding participants are eligible for preferred treatment on mint and redeem fees as the protocol scales.',
    tag: 'SUBJECT TO GOVERNANCE',
  },
  {
    num: '04',
    title: 'Direct Protocol Communication',
    body: 'Founding participants receive direct-channel access to the Axiom Protocol team — advance notice of governance votes, reserve changes, new product launches, and protocol milestones.',
    tag: 'FOUNDING COHORT CHANNEL',
  },
  {
    num: '05',
    title: 'Governance Participation Rights',
    body: 'As an identity-verified founding participant, you are eligible to participate in Axiom community governance discussions and signal on key protocol parameters alongside AXM token holders.',
    tag: 'COMMUNITY GOVERNANCE',
  },
];

const COMPARE_ROWS = [
  { label: 'Backed by physical gold',   axau: true,  paxg: true,  etf: true,  physical: true  },
  { label: 'Self-custody',              axau: true,  paxg: true,  etf: false, physical: 'P'   },
  { label: 'On-chain verifiable',       axau: true,  paxg: true,  etf: false, physical: false },
  { label: 'Arbitrum native',           axau: true,  paxg: false, etf: false, physical: false },
  { label: 'DeFi composable',           axau: true,  paxg: 'P',   etf: false, physical: false },
  { label: 'Instant settlement',        axau: true,  paxg: true,  etf: 'P',   physical: false },
  { label: 'No counterparty risk',      axau: true,  paxg: true,  etf: false, physical: 'P'   },
  { label: 'Identity-gated (ERC-3643)', axau: true,  paxg: false, etf: false, physical: false },
];

const FAQS = [
  {
    q: 'What is AXAU?',
    a: 'AXAU is a gold reserve unit issued on Arbitrum One under the ERC-3643 identity-gated standard. Each AXAU represents a fractional claim on a PAXG-backed reserve. Participants mint AXAU by depositing PAXG at the protocol\'s mint terminal and may redeem AXAU back to PAXG at any time.',
  },
  {
    q: 'What backs AXAU?',
    a: 'AXAU is backed 1:1 by PAXG, a regulated digital gold token issued by Paxos Trust Company. PAXG is itself redeemable for allocated London Good Delivery gold bars. The backing is fully on-chain and verifiable at any time through the protocol\'s reserve contracts on Arbitrum One.',
  },
  {
    q: 'Who can apply for early access?',
    a: 'Any individual aged 18 or older from a supported jurisdiction can apply. Identity verification is required under the ERC-3643 standard. No document upload is needed at application — you provide your details and our ops team activates your wallet. The first 100 verified applicants gain minting access.',
  },
  {
    q: 'Is AXAU audited?',
    a: 'The AXAU smart contracts are unaudited at this stage. An external security audit is on the protocol roadmap. This is disclosed transparently. Early participants should weigh this risk carefully and participate within their own risk tolerance.',
  },
  {
    q: 'What happens after I submit my application?',
    a: 'Our ops team reviews your application, typically within 48 hours. If approved, your wallet address is registered on-chain via the COMPLIANCE_ROLE. You will receive a confirmation email with instructions to proceed to the AXAU mint terminal. From there, you deposit PAXG and receive AXAU directly to your wallet.',
  },
  {
    q: 'Can I redeem AXAU back to PAXG?',
    a: 'Yes. AXAU is fully redeemable. At any time, identity-verified holders may return AXAU to the protocol\'s mint terminal and receive the equivalent PAXG back to their wallet. The redemption path is non-custodial and settled on-chain.',
  },
];

/* ─── HELPERS ────────────────────────────────────────────── */
function Check({ yes }: { yes: boolean | 'P' }) {
  if (yes === true)  return <span style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>✓</span>;
  if (yes === 'P')   return <span style={{ color: C.gold, fontFamily: mono, fontSize: 10 }}>PARTIAL</span>;
  return <span style={{ color: C.muted, fontSize: 14 }}>—</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, margin: '0 0 16px' }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '48px 0' }} />;
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
export default function AxauAccessPage() {
  const { address, isConnected } = useAccount();

  const [slots, setSlots]               = useState<SlotData | null>(null);
  const [step, setStep]                 = useState<Step>('form');
  const [submissionId, setSubmissionId] = useState('');
  const [emailQueued, setEmailQueued]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [openFaq, setOpenFaq]           = useState<number | null>(null);

  const [form, setForm] = useState({
    walletAddress: '', email: '', fullName: '',
    dateOfBirth: '', country: 'US', documentType: '',
  });

  useEffect(() => {
    if (isConnected && address) setForm(f => ({ ...f, walletAddress: address }));
  }, [address, isConnected]);

  useEffect(() => {
    fetch('/api/axau/access-slots')
      .then(r => r.json())
      .then((d: SlotData) => { setSlots(d); if (d.isFull) setStep('full'); })
      .catch(() => {});
  }, []);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res  = await fetch('/api/erc3643/identity/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) {
        if (json.isFull)                         { setStep('full');             return; }
        if (res.status === 409 && !json.isFull)  { setStep('already_submitted'); return; }
        setError(json.error || 'Submission failed. Please try again.');
        return;
      }
      setSubmissionId(json.data.id ?? '');
      setEmailQueued(json.data.emailQueued === true);
      setStep('submitted');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `1px solid ${C.border}`, background: C.bg,
    fontFamily: body, fontSize: 14, color: C.text,
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: mono, fontSize: 10,
    letterSpacing: '0.13em', textTransform: 'uppercase', color: C.muted, marginBottom: 6,
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>AXAU Early Access — Axiom Protocol</title>
        <meta name="description" content="Join the first 100 verified participants to mint AXAU — a gold reserve unit backed 1:1 by PAXG on Arbitrum One. Founding participant benefits included." />
      </Head>

      {/* ── CINEMATIC HERO ── */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(280px, 42vw, 500px)', overflow: 'hidden' }}>
        <Image src="/axau-early-access/hero-vault.png" alt="AXAU gold reserve vault" fill sizes="100vw" style={{ objectFit: 'cover', objectPosition: 'center 40%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 25%, ${C.navyDeep}e8 100%)` }} />
        <div style={{ position: 'absolute', bottom: 40, left: 40, right: '38%' }}>
          <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', color: C.goldPale, textTransform: 'uppercase', margin: '0 0 10px' }}>
            Layer 02 Reserve Infrastructure · Arbitrum One · ERC-3643 Identity-Gated
          </p>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, color: '#ffffff', lineHeight: 1.08, margin: '0 0 14px', textShadow: `0 2px 16px ${C.navyDeep}` }}>
            Apply for Reserve Access.<br />Enter the Infrastructure Layer.
          </h1>
          <p style={{ fontFamily: body, fontSize: 14, color: '#ffffffcc', lineHeight: 1.75, margin: '0 0 20px', maxWidth: 420 }}>
            AXAU is the Axiom Protocol&apos;s Layer 02 reserve unit — backed 1:1 by PAXG on Arbitrum One. Access requires an ERC-3643 identity credential. Founding participants gain direct mint access, priority rights, and on-chain governance participation.
          </p>
          <a href="#apply" style={{
            display: 'inline-block', padding: '12px 28px',
            background: C.gold, color: C.navyDeep,
            fontFamily: mono, fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
          }}>
            CLAIM YOUR SPOT →
          </a>
        </div>
        <div style={{ position: 'absolute', top: 20, right: 24, fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: `${C.goldPale}cc`, textTransform: 'uppercase', textAlign: 'right' }}>
          <div>ARBITRUM ONE</div>
          <div style={{ marginTop: 3 }}>ERC-3643</div>
        </div>
      </div>

      {/* Gold rule */}
      <div style={{ height: 3, background: C.gold }} />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 0 80px' }}>

        {/* Slot meter */}
        {slots && <SlotMeter slots={slots} />}

        {/* ── WHY AXAU ── */}
        {step === 'form' && (
          <>
            <SectionLabel>WHY AXAU</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, border: `1px solid ${C.border}`, marginBottom: 48 }}>
              {PILLARS.map((p, i) => (
                <div key={p.title} style={{
                  padding: '24px 22px',
                  borderRight: i < PILLARS.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: i % 2 === 0 ? C.bg : C.bgAlt,
                }}>
                  <div style={{ fontFamily: mono, fontSize: 20, color: C.gold, marginBottom: 12 }}>{p.icon}</div>
                  <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: C.navy, margin: '0 0 8px' }}>{p.title}</p>
                  <p style={{ fontFamily: body, fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>{p.body}</p>
                </div>
              ))}
            </div>

            {/* ── FOUNDING PARTICIPANT REWARDS ── */}
            <SectionLabel>FOUNDING PARTICIPANT REWARDS</SectionLabel>
            <div style={{
              border: `1px solid ${C.gold}60`,
              borderTop: `3px solid ${C.gold}`,
              marginBottom: 48,
              background: C.goldBg,
            }}>
              <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${C.gold}30` }}>
                <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: C.navy, margin: '0 0 8px' }}>
                  Benefits Reserved for the First 100
                </h2>
                <p style={{ fontFamily: body, fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                  Early access is more than a head start — it carries a set of founding privileges designed to reward those who help establish the AXAU Reserve from day one.
                </p>
              </div>
              <div>
                {REWARDS.map((r, i) => (
                  <div key={r.num} style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr',
                    padding: '20px 28px', gap: 16,
                    borderBottom: i < REWARDS.length - 1 ? `1px solid ${C.gold}30` : 'none',
                    background: i % 2 === 0 ? 'transparent' : `${C.gold}08`,
                  }}>
                    <div style={{ fontFamily: mono, fontSize: 22, color: `${C.gold}80`, fontWeight: 700, paddingTop: 2 }}>{r.num}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navy }}>{r.title}</span>
                        <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.16em', color: C.gold, border: `1px solid ${C.gold}60`, padding: '2px 8px' }}>{r.tag}</span>
                      </div>
                      <p style={{ fontFamily: body, fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── HOW IT WORKS ── */}
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, border: `1px solid ${C.border}`, marginBottom: 48 }}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{ borderRight: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ position: 'relative', width: '100%', paddingTop: '62%', overflow: 'hidden', borderBottom: `1px solid ${C.border}`, background: C.navyDeep }}>
                    <Image src={s.img} alt={s.alt} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover', objectPosition: 'center' }} />
                    <div style={{ position: 'absolute', top: 10, left: 12, fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: `${C.goldPale}cc`, textTransform: 'uppercase' }}>
                      STEP {s.n}
                    </div>
                  </div>
                  <div style={{ padding: '18px 20px', background: C.bgAlt }}>
                    <p style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navy, margin: '0 0 7px' }}>{s.title}</p>
                    <p style={{ fontFamily: body, fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.65 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── COMPARISON TABLE ── */}
            <SectionLabel>HOW AXAU COMPARES</SectionLabel>
            <div style={{ border: `1px solid ${C.border}`, marginBottom: 48, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left', fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: '#ffffff99', fontWeight: 400, borderRight: `1px solid #ffffff18` }}>FEATURE</th>
                    {['AXAU', 'PAXG', 'GOLD ETF', 'PHYSICAL'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'center', fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: h === 'AXAU' ? C.goldPale : '#ffffff80', fontWeight: h === 'AXAU' ? 700 : 400, borderRight: `1px solid #ffffff18`, minWidth: 80 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={row.label} style={{ background: i % 2 === 0 ? C.bg : C.bgAlt, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '11px 18px', fontFamily: body, fontSize: 12, color: C.text, borderRight: `1px solid ${C.border}` }}>{row.label}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', background: `${C.gold}08`, borderRight: `1px solid ${C.border}` }}><Check yes={row.axau} /></td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', borderRight: `1px solid ${C.border}` }}><Check yes={row.paxg} /></td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', borderRight: `1px solid ${C.border}` }}><Check yes={row.etf} /></td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}><Check yes={row.physical} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── FAQ ── */}
            <SectionLabel>COMMON QUESTIONS</SectionLabel>
            <div style={{ border: `1px solid ${C.border}`, marginBottom: 48 }}>
              {FAQS.map((faq, i) => (
                <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', padding: '18px 22px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: openFaq === i ? C.bgAlt : C.bg, border: 'none',
                      cursor: 'pointer', textAlign: 'left', gap: 16,
                    }}
                  >
                    <span style={{ fontFamily: body, fontSize: 14, fontWeight: 700, color: C.navy, lineHeight: 1.4 }}>{faq.q}</span>
                    <span style={{ fontFamily: mono, fontSize: 14, color: C.gold, flexShrink: 0 }}>{openFaq === i ? '−' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 22px 20px', background: C.bgAlt }}>
                      <p style={{ fontFamily: body, fontSize: 13, color: C.muted, lineHeight: 1.75, margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STATE SCREENS ── */}
        {step === 'full'             && <FullScreen />}
        {step === 'submitted'        && <SuccessScreen submissionId={submissionId} emailQueued={emailQueued} />}
        {step === 'already_submitted'&& <AlreadySubmittedScreen />}

        {/* ── APPLICATION FORM ── */}
        {step === 'form' && (
          <div id="apply">
            {/* Accent banner */}
            <div style={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
              <Image src="/axau-early-access/gold-bar-aerial.png" alt="AXAU gold reserve bar" fill sizes="(max-width: 768px) 100vw, 800px" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.navyDeep}d0 0%, ${C.navyDeep}44 60%, transparent 100%)` }} />
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', alignItems: 'center', padding: '0 28px' }}>
                <div>
                  <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: C.goldPale, textTransform: 'uppercase', margin: '0 0 4px' }}>IDENTITY VERIFICATION</p>
                  <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>Secure Your Founding Spot</p>
                </div>
              </div>
              {slots && !slots.isFull && (
                <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', textAlign: 'right' }}>
                  <p style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{slots.remaining}</p>
                  <p style={{ fontFamily: mono, fontSize: 9, color: `${C.goldPale}cc`, letterSpacing: '0.14em', margin: '2px 0 0', textTransform: 'uppercase' }}>spots left</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, background: C.bg, padding: '32px 36px' }}>
              <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '0 0 20px', paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                IDENTITY VERIFICATION APPLICATION
              </p>

              <CircleWalletEntry
                context="early-access"
                onWalletReady={(addr) => setForm(f => ({ ...f, walletAddress: addr }))}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Wallet Address *</label>
                  <input required type="text" placeholder="0x..." {...field('walletAddress')} pattern="^0x[a-fA-F0-9]{40}$" title="Enter a valid Ethereum wallet address starting with 0x" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input required type="email" placeholder="you@example.com" {...field('email')} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Full Legal Name *</label>
                <input required type="text" placeholder="As it appears on your government-issued ID" {...field('fullName')} minLength={2} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Date of Birth *</label>
                  <input required type="date" {...field('dateOfBirth')} max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Country of Residence *</label>
                  <select required {...field('country')} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Government ID Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {DOC_TYPES.map(d => {
                    const selected = form.documentType === d.value;
                    return (
                      <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, documentType: d.value }))} style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', border: selected ? `2px solid ${C.navy}` : `1px solid ${C.border}`, background: selected ? '#eef2f8' : C.bg, fontFamily: body, fontSize: 13, color: selected ? C.navy : C.text, fontWeight: selected ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selected && (
                          <span style={{ width: 16, height: 16, background: C.navy, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        )}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{ padding: '12px 16px', background: C.redBg, border: `1px solid #fca5a5`, marginBottom: 20, fontFamily: body, fontSize: 13, color: C.red, lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              {/* Reward reminder above submit */}
              <div style={{ background: C.goldBg, border: `1px solid ${C.gold}40`, borderLeft: `3px solid ${C.gold}`, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontFamily: body, fontSize: 12, color: C.navy, margin: 0, lineHeight: 1.6 }}>
                  <strong>Founding participant benefits</strong> — on-chain status, priority product access, preferred fee recognition, and governance participation — are reserved upon application. These benefits apply to the first 100 verified participants only.
                </p>
              </div>

              <p style={{ fontFamily: body, fontSize: 12, color: C.muted, lineHeight: 1.65, margin: '0 0 24px', padding: '12px 16px', background: C.bgAlt, border: `1px solid ${C.border}` }}>
                By submitting, you confirm the information is accurate and that you are at least 18 years old. Applications are queued for ops review — you will be notified by email once your wallet is enabled. No document upload is required at this stage.
              </p>

              <button
                type="submit"
                disabled={submitting || !form.documentType}
                style={{
                  width: '100%', padding: '16px',
                  background: submitting || !form.documentType ? '#94a3b8' : C.navy,
                  color: '#fff', border: 'none',
                  cursor: submitting || !form.documentType ? 'not-allowed' : 'pointer',
                  fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
                }}
              >
                {submitting ? 'SUBMITTING...' : 'CLAIM YOUR FOUNDING SPOT →'}
              </button>
            </form>
          </div>
        )}

        {step === 'form' && (
          <p style={{ fontFamily: body, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 24 }}>
            Already approved?{' '}
            <a href="/axau#mint-terminal" style={{ color: C.navy, fontWeight: 700 }}>Go to the AXAU mint terminal →</a>
          </p>
        )}
      </div>
    </DesignLawLayout>
  );
}
