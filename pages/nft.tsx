import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

const RARITY_COLORS: Record<string, string> = {
  Legendary: '#C9A84C',
  Epic:      '#7C3AED',
  Rare:      '#2D6A4F',
  Uncommon:  '#2563EB',
  Common:    '#6B7280',
};

const RARITY_LABELS: Record<string, string> = {
  Legendary: '1% — Obsidian Vault',
  Epic:      '4% — Sovereign Archive',
  Rare:      '10% — Forest Ledger',
  Uncommon:  '25% — Navy Protocol',
  Common:    '60% — Standard Issue',
};

interface CollectionStats {
  deployed: boolean;
  contractAddress?: string;
  mintedCount?: number;
  uniqueHolders?: number;
  rarityBreakdown?: Record<string, number>;
  recentTokens?: {
    tokenId: number;
    rarityTier: string;
    imageCid?: string;
    owner?: string;
    mintedAt?: string;
  }[];
}

interface StatsData {
  collections: {
    founder: CollectionStats;
    participation: CollectionStats;
    land: CollectionStats;
  };
  timestamp: string;
}

const PARTICIPATION_TOKEN_TYPES = [
  { id: 1, name: 'Identity Registration',      max: 10000, icon: '◎' },
  { id: 2, name: 'Wealth Practice Member',       max: 5000,  icon: '⬡' },
  { id: 3, name: 'Governance Participant',       max: 2500,  icon: '⬢' },
  { id: 4, name: 'Property Deal Participant',    max: 1000,  icon: '▦' },
  { id: 5, name: 'AXAU Early Adopter',          max: 500,   icon: '◈' },
  { id: 6, name: 'Founder Circle',              max: 100,   icon: '✦' },
];

export default function NFTPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [previewTier, setPreviewTier] = useState<string>('Rare');

  useEffect(() => {
    fetch('/api/nft/collection-stats')
      .then(r => r.json())
      .then(d => {
        setStats(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const founder      = stats?.collections?.founder;
  const participation = stats?.collections?.participation;
  const land         = stats?.collections?.land;

  return (
    <DesignLawLayout>
      <Head>
        <title>Axiom Protocol NFT System — Founder Badge · Participation · Land Receipt</title>
        <meta name="description" content="Three-tier animated utility NFT collection on Arbitrum One. AxiomFounderBadge (soulbound ERC-721), AxiomParticipation (ERC-1155), AxiomLandReceipt (ERC-1155). Real on-chain utility." />
      </Head>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #2D4A3E', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          AXIOM PROTOCOL · UTILITY COLLECTION · ARBITRUM ONE
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 700, color: '#FAFAFA', lineHeight: 1.15, marginBottom: '1rem' }}>
          NFT Utility System
        </h1>
        <p style={{ fontFamily: 'sans-serif', fontSize: '1rem', color: '#9CA3AF', lineHeight: 1.6, maxWidth: '680px' }}>
          Three animated, rarity-tiered collections on Arbitrum One. Each NFT carries real protocol utility — priority queue access, governance weight multipliers, and fee discounts. No speculation. No hype. Earned through participation.
        </p>
      </div>

      {/* ── Utility gates ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          On-Chain Utility
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#374151' }}>
          {[
            { label: 'AXAU Mint Priority',    detail: 'Founder Badge holders enter the AXAU mint queue first',             gate: 'Founder Badge' },
            { label: 'Governance Multiplier', detail: '1.5× vote weight on Axiom Protocol governance proposals',          gate: 'Founder Badge' },
            { label: 'Property Analysis',     detail: '15% discount on all Property Analysis report purchases via Stripe', gate: 'Any Collection NFT' },
            { label: 'DAO Contributor Status', detail: 'Participation Badge required for payroll queue eligibility',       gate: 'Participation Badge' },
          ].map((u) => (
            <div key={u.label} style={{ background: '#111827', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase' }}>{u.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', background: '#1F2937', padding: '2px 6px' }}>{u.gate}</span>
              </div>
              <p style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', color: '#9CA3AF', lineHeight: 1.5 }}>{u.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rarity system ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          Rarity System
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: '#374151', marginBottom: '1rem' }}>
          {Object.entries(RARITY_LABELS).map(([tier, label]) => (
            <div key={tier} style={{ background: '#111827', padding: '1rem', cursor: 'pointer', borderTop: `3px solid ${RARITY_COLORS[tier]}` }}
              onClick={() => setPreviewTier(tier)}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: RARITY_COLORS[tier], marginBottom: '0.25rem' }}>{tier}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#111827', border: '1px solid #374151', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', letterSpacing: '1px', marginBottom: '0.5rem' }}>ANIMATION PREVIEW — {previewTier.toUpperCase()}</p>
          <iframe
            src={`/api/nft/animation?tokenId=1&contract=0x0000000000000000000000000000000000000001&rarity=${previewTier}`}
            style={{ width: '100%', maxWidth: '400px', height: '200px', border: 'none', display: 'block' }}
            title={`${previewTier} NFT Animation`}
          />
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', marginTop: '0.5rem' }}>
            Traits computed deterministically on-chain via keccak256(tokenId + contractAddress + deployBlock + owner). No server randomness.
          </p>
        </div>
      </section>

      {/* ── Collection 1: Founder Badge ───────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
              Axiom Founder Badge
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#C9A84C', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-721 · SOULBOUND · 100 CAP</p>
          </div>
          {founder?.deployed && (
            <a href={`https://arbiscan.io/address/${founder.contractAddress}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3B82F6', textDecoration: 'none' }}>
              {founder.contractAddress?.slice(0, 10)}…{founder.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#374151', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Supply Cap', value: '100' },
            { label: 'Minted',           value: loading ? '—' : founder?.deployed ? String(founder.mintedCount ?? 0) : 'Not Deployed' },
            { label: 'Unique Holders',   value: loading ? '—' : founder?.deployed ? String(founder.uniqueHolders ?? 0) : '—' },
            { label: 'Remaining',        value: loading ? '—' : founder?.deployed ? String(100 - (founder.mintedCount ?? 0)) : '—' },
            { label: 'Transfer',         value: 'Soulbound' },
            { label: 'Royalty',          value: '7.5% EIP-2981' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111827', padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#FAFAFA' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {founder?.deployed && (founder.rarityBreakdown) && (
          <div style={{ background: '#111827', border: '1px solid #374151', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', marginBottom: '0.75rem' }}>RARITY DISTRIBUTION (MINTED)</p>
            <div style={{ display: 'flex', gap: '1px', background: '#374151', height: '24px' }}>
              {Object.entries(founder.rarityBreakdown).map(([tier, count]) => {
                const pct = founder.mintedCount ? (count / founder.mintedCount) * 100 : 0;
                return pct > 0 ? (
                  <div key={tier} title={`${tier}: ${count}`} style={{ background: RARITY_COLORS[tier], width: `${pct}%`, minWidth: count > 0 ? '2px' : '0' }} />
                ) : null;
              })}
            </div>
          </div>
        )}

        <div style={{ background: '#0D1117', border: '1px solid #1F2937', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Non-transferable after mint. Qualifying wallets: early AXM holders, governance participants, founding Wealth Practice members. Eligibility verified server-side against on-chain state.{' '}
            {!founder?.deployed && <span style={{ color: '#C9A84C' }}>Contract not yet deployed — deploy with: <code style={{ background: '#1F2937', padding: '1px 4px' }}>npx hardhat run scripts/nft/deploy-nft.ts --network arbitrum-one</code></span>}
          </p>
        </div>
      </section>

      {/* ── Collection 2: Participation ───────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
              Axiom Participation
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2D6A4F', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-1155 · MULTI-EDITION · 6 ACTION TYPES</p>
          </div>
          {participation?.deployed && (
            <a href={`https://arbiscan.io/address/${participation.contractAddress}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3B82F6', textDecoration: 'none' }}>
              {participation.contractAddress?.slice(0, 10)}…{participation.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: '#374151', marginBottom: '1.5rem' }}>
          {PARTICIPATION_TOKEN_TYPES.map((type) => (
            <div key={type.id} style={{ background: '#111827', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#C9A84C' }}>{type.icon}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280' }}>ID #{type.id}</span>
              </div>
              <div style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', fontWeight: 600, color: '#FAFAFA', marginBottom: '0.25rem' }}>{type.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280' }}>Max supply: {type.max.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#0D1117', border: '1px solid #1F2937', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Minted automatically when completing protocol actions. Each token type is gated by a verified on-chain event — identity KYC confirmation, Wealth Practice join, governance vote cast, deal approval, early AXAU allocation, Founder circle designation.
          </p>
        </div>
      </section>

      {/* ── Collection 3: Land Receipt ────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', margin: 0 }}>
              Axiom Land Receipt
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#52B788', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-1155 · PER-PROPERTY · 1,000 CAP/PARCEL</p>
          </div>
          {land?.deployed && (
            <a href={`https://arbiscan.io/address/${land.contractAddress}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3B82F6', textDecoration: 'none' }}>
              {land.contractAddress?.slice(0, 10)}…{land.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#374151', marginBottom: '1.5rem' }}>
          {[
            { label: 'Token ID Model',   value: 'One per parcel' },
            { label: 'Supply per Parcel', value: '1,000 max' },
            { label: 'Parcels Registered', value: loading ? '—' : land?.deployed ? String(land.mintedCount ?? 0) : 'Not Deployed' },
            { label: 'Governance Gate',   value: 'GOVERNANCE_ROLE' },
            { label: 'Royalty',           value: '7.5% EIP-2981' },
            { label: 'Transferable',      value: 'Yes (secondary market)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111827', padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: '#FAFAFA' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#0D1117', border: '1px solid #1F2937', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Minted by protocol governance on deal approval. Each land parcel token ID maps to an asset registry entry. Receipts represent participation in the Axiom land acquisition pipeline — not a fractional ownership instrument. Traits include parcel location class, deal stage, and acquisition tier.
          </p>
        </div>
      </section>

      {/* ── Trait upgrade mechanic ─────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          Trait Upgrade Mechanic
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#374151', marginBottom: '1rem' }}>
          {[
            { tier: 'Common',   prob: '40%', cost: '50 AXM' },
            { tier: 'Uncommon', prob: '30%', cost: '50 AXM' },
            { tier: 'Rare',     prob: '20%', cost: '50 AXM' },
            { tier: 'Epic',     prob: '10%', cost: '50 AXM' },
          ].map(r => (
            <div key={r.tier} style={{ background: '#111827', padding: '1rem', borderTop: `3px solid ${RARITY_COLORS[r.tier]}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: RARITY_COLORS[r.tier], marginBottom: '0.25rem' }}>{r.tier} → {Object.keys(RARITY_COLORS)[Object.keys(RARITY_COLORS).indexOf(r.tier) - 1]}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9CA3AF' }}>Success rate: {r.prob}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280' }}>Cost: {r.cost} burned</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0D1117', border: '1px solid #1F2937', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            50 AXM burned per upgrade attempt. Probabilistic outcome. Success advances rarity one tier. Animation is regenerated on tier advancement. Legendary tokens cannot be upgraded further. AXM burned is consumed on failure — no refund.
          </p>
        </div>
      </section>

      {/* ── Technical spec ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          Technical Specification
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid #374151', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '0.75rem' }}>CONTRACT STANDARDS</p>
            {[
              ['ERC-721 (Soulbound)',  'AxiomFounderBadge'],
              ['ERC-1155',            'AxiomParticipation + AxiomLandReceipt'],
              ['EIP-2981',            'Royalty: 7.5% → Treasury'],
              ['ERC-4906',            'Dynamic metadata update events'],
              ['AccessControl',       'MINTER_ROLE, GOVERNANCE_ROLE'],
            ].map(([std, impl]) => (
              <div key={std} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1F2937', gap: '1rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#FAFAFA', flexShrink: 0 }}>{std}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', textAlign: 'right' }}>{impl}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#111827', border: '1px solid #374151', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '0.75rem' }}>METADATA PIPELINE</p>
            {[
              ['Trait seed',      'keccak256(tokenId + contract + block + owner)'],
              ['Rarity engine',   'Deterministic, on-chain verifiable'],
              ['Static image',    'Gemini AI → IPFS (Storacha)'],
              ['Animation',       'CSS/SVG (HTML) served by metadata API'],
              ['Metadata format', 'OpenSea standard + animation_url'],
              ['IPFS gateway',    'w3s.link (Storacha)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1F2937', gap: '1rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#FAFAFA', flexShrink: 0 }}>{k}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OpenSea integration ───────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          Marketplace Integration
        </h2>
        <div style={{ background: '#111827', border: '1px solid #374151', padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'OpenSea', detail: 'contractURI() with seller_fee_basis_points: 750. EIP-2981 on-chain royalty enforcement.', status: 'Configured' },
              { label: 'Blur', detail: 'EIP-2981 royalties respected. No separate integration required.', status: 'Compatible' },
              { label: 'LooksRare', detail: 'EIP-2981 standard royalty. Collection registered via contractURI.', status: 'Compatible' },
            ].map(m => (
              <div key={m.label} style={{ padding: '0.75rem', background: '#0D1117', border: '1px solid #1F2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#FAFAFA' }}>{m.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#52B788', background: '#0D2B1F', padding: '1px 6px' }}>{m.status}</span>
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', lineHeight: 1.5 }}>{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deployment instructions ───────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#FAFAFA', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
          Deployment
        </h2>
        <div style={{ background: '#0D1117', border: '1px solid #374151', padding: '1.25rem', fontFamily: 'monospace', fontSize: '12px', color: '#9CA3AF', lineHeight: 2 }}>
          <div><span style={{ color: '#6B7280' }}># Deploy all three contracts to Arbitrum One</span></div>
          <div><span style={{ color: '#C9A84C' }}>npx hardhat run</span> scripts/nft/deploy-nft.ts <span style={{ color: '#3B82F6' }}>--network arbitrum-one</span></div>
          <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#6B7280' }}># Output: deployment-output.json with contract addresses</span></div>
          <div><span style={{ color: '#6B7280' }}># Then set env vars: NFT_CONTRACT_FOUNDER, NFT_CONTRACT_PARTICIPATION, NFT_CONTRACT_LAND</span></div>
          <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#6B7280' }}># Compile contracts</span></div>
          <div><span style={{ color: '#C9A84C' }}>npx hardhat compile</span></div>
        </div>
      </section>

      {/* ── Disclosure footer ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', lineHeight: 1.8 }}>
          NFT DISCLOSURE · These tokens represent protocol participation and utility access within the Axiom Protocol ecosystem. They are not investment contracts, do not represent fractional ownership of any asset, and confer no financial return or profit expectation. Land Receipt NFTs do not constitute fractional real estate ownership — they are participation records. Variable royalties enforced on-chain via EIP-2981. All token types are experimental and subject to change. Not an offer to sell securities.
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', marginTop: '0.5rem' }}>
          <Link href="/disclosure" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Institutional Disclosure</Link>
          {' · '}
          <Link href="/trust" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Trust Stack</Link>
          {' · '}
          <a href="https://arbiscan.io" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Arbiscan ↗</a>
        </p>
      </div>
    </DesignLawLayout>
  );
}
