import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount, useSignMessage } from 'wagmi';
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
  { id: 1, name: 'Identity Registration',    max: 10000, icon: '◎' },
  { id: 2, name: 'Wealth Practice Member',   max: 5000,  icon: '⬡' },
  { id: 3, name: 'Governance Participant',   max: 2500,  icon: '⬢' },
  { id: 4, name: 'Property Deal Participant', max: 1000,  icon: '▦' },
  { id: 5, name: 'AXAU Early Adopter',       max: 500,   icon: '◈' },
  { id: 6, name: 'Founder Circle',           max: 100,   icon: '✦' },
];

const TREASURY_ADDRESS = '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const ARBISCAN_BASE    = 'https://arbiscan.io';

interface FounderEligibility {
  eligible: boolean;
  minted: boolean;
  mintedTokenId?: number | null;
  mintedTxHash?: string | null;
  reason?: string | null;
}
interface ParticipationTypeEligibility {
  tokenId: number;
  eligible: boolean;
  minted: boolean;
  mintedTxHash?: string | null;
}
interface AllEligibility {
  founderContract?: string | null;
  participationContract?: string | null;
  founder: FounderEligibility;
  participation: ParticipationTypeEligibility[];
}

// ── mono helpers ──
const mono = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: 'monospace', ...extra,
});

// ── WalletMintSection ─────────────────────────────────────────────────────────
function WalletMintSection() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync }     = useSignMessage();

  const [eligibility,  setEligibility]  = useState<AllEligibility | null>(null);
  const [checking,     setChecking]     = useState(false);
  const [checkErr,     setCheckErr]     = useState('');
  const [mintingFounder, setMintingFounder] = useState(false);
  const [mintingPart,  setMintingPart]  = useState<number | null>(null);
  const [founderResult, setFounderResult] = useState<{ tokenId: number; txHash: string; rarityTier: string } | null>(null);
  const [partResult,   setPartResult]   = useState<Record<number, { txHash: string }>>({});
  const [founderErr,   setFounderErr]   = useState('');
  const [partErr,      setPartErr]      = useState<Record<number, string>>({});
  const [partFeeHash,  setPartFeeHash]  = useState<Record<number, string>>({});

  const checkEligibility = useCallback(async (wallet: string) => {
    setChecking(true);
    setCheckErr('');
    try {
      const res  = await fetch(`/api/nft/eligibility?wallet=${wallet}&all=true`);
      const data = await res.json();
      if (res.ok) {
        setEligibility(data);
      } else {
        setCheckErr(data.error ?? `Eligibility check failed (${res.status})`);
      }
    } catch (err: unknown) {
      setCheckErr(err instanceof Error ? err.message : 'Could not reach the eligibility service — please try again.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) checkEligibility(address);
    else { setEligibility(null); setCheckErr(''); }
  }, [isConnected, address, checkEligibility]);

  // ── Founder Badge mint ────────────────────────────────────────────────────
  async function mintFounderBadge() {
    if (!address) return;
    setMintingFounder(true);
    setFounderErr('');
    try {
      const timestamp = Date.now();
      const message   = `Axiom NFT Mint Authorization\nCollection: founder\nWallet: ${address.toLowerCase()}\nTimestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      const res  = await fetch('/api/nft/mint-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, timestamp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Mint failed (${res.status})`);

      setFounderResult({ tokenId: data.tokenId, txHash: data.txHash, rarityTier: data.rarityTier });
      setEligibility(prev => prev ? { ...prev, founder: { ...prev.founder, minted: true, mintedTokenId: data.tokenId, mintedTxHash: data.txHash } } : prev);
    } catch (err: unknown) {
      setFounderErr(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      setMintingFounder(false);
    }
  }

  // ── Participation mint ────────────────────────────────────────────────────
  async function mintParticipation(tokenId: number) {
    if (!address) return;
    const feeTxHash = partFeeHash[tokenId]?.trim();
    if (!feeTxHash || !/^0x[a-fA-F0-9]{64}$/.test(feeTxHash)) {
      setPartErr(prev => ({ ...prev, [tokenId]: 'Enter a valid fee transaction hash (0x + 64 hex chars)' }));
      return;
    }
    setMintingPart(tokenId);
    setPartErr(prev => ({ ...prev, [tokenId]: '' }));
    try {
      const timestamp = Date.now();
      const message   = `Axiom NFT Mint Authorization\nCollection: participation\nType: ${tokenId}\nWallet: ${address.toLowerCase()}\nTimestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      const res  = await fetch('/api/nft/mint-participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, tokenId, signature, timestamp, feeTxHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Mint failed (${res.status})`);

      setPartResult(prev => ({ ...prev, [tokenId]: { txHash: data.txHash } }));
      setEligibility(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participation: prev.participation.map(p =>
            p.tokenId === tokenId ? { ...p, minted: true, mintedTxHash: data.txHash } : p
          ),
        };
      });
    } catch (err: unknown) {
      setPartErr(prev => ({ ...prev, [tokenId]: err instanceof Error ? err.message : 'Mint failed' }));
    } finally {
      setMintingPart(null);
    }
  }

  // ── Render: not connected ─────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Claim Your Badges
        </h2>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
          <div style={mono({ fontSize: '28px', color: '#D1D5DB' })}>◈</div>
          <p style={mono({ fontSize: '12px', color: '#374151', letterSpacing: '1px' })}>
            CONNECT YOUR WALLET TO CHECK ELIGIBILITY
          </p>
          <p style={mono({ fontSize: '11px', color: '#4B5563', lineHeight: 1.6, maxWidth: '480px' })}>
            Use the "Access Platform" button in the top navigation to connect. Eligibility is checked against your on-chain
            history — early AXM holders, governance participants, and Wealth Practice members qualify for the Founder Badge.
          </p>
        </div>
      </section>
    );
  }

  // ── Render: eligibility fetch error ──────────────────────────────────────
  if (checkErr && !checking) {
    return (
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Claim Your Badges
        </h2>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={mono({ fontSize: '10px', color: '#991B1B', letterSpacing: '1px', marginBottom: '0.25rem' })}>
              ELIGIBILITY CHECK FAILED
            </div>
            <div style={mono({ fontSize: '10px', color: '#6B7280' })}>{checkErr}</div>
          </div>
          <button
            onClick={() => address && checkEligibility(address)}
            style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', padding: '5px 14px', fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer' }}
          >
            RETRY
          </button>
        </div>
      </section>
    );
  }

  // ── Render: checking ─────────────────────────────────────────────────────
  if (checking) {
    return (
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Claim Your Badges
        </h2>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={mono({ fontSize: '10px', color: '#C9A84C', letterSpacing: '2px', animation: 'pulse 1.5s infinite' })}>
            CHECKING ELIGIBILITY…
          </div>
          <div style={mono({ fontSize: '10px', color: '#4B5563' })}>
            {address?.slice(0, 10)}…{address?.slice(-6)}
          </div>
        </div>
      </section>
    );
  }

  const founderElig        = eligibility?.founder;
  const partElig           = eligibility?.participation ?? [];
  const founderContract    = eligibility?.founderContract;
  const partContract       = eligibility?.participationContract;

  // ── Render: results ───────────────────────────────────────────────────────
  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
          Claim Your Badges
        </h2>
        <span style={mono({ fontSize: '10px', color: '#4B5563', background: '#FAFAF8', padding: '3px 8px', border: '1px solid #F3F4F6' })}>
          {address?.slice(0, 10)}…{address?.slice(-6)}
        </span>
      </div>

      {/* ── Founder Badge ──────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={mono({ fontSize: '12px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '0.25rem' })}>
              AXIOM FOUNDER BADGE
            </div>
            <div style={mono({ fontSize: '10px', color: '#6B7280' })}>ERC-721 · SOULBOUND · MAX 100</div>
          </div>
          {/* Status pill */}
          {founderElig?.minted ? (
            <span style={mono({ fontSize: '10px', color: '#166534', background: '#ECFDF5', padding: '3px 10px', border: '1px solid #86EFAC' })}>
              ✓ MINTED
            </span>
          ) : founderElig?.eligible ? (
            <span style={mono({ fontSize: '10px', color: '#92400E', background: '#FEF3C7', padding: '3px 10px', border: '1px solid #F59E0B' })}>
              ● ELIGIBLE
            </span>
          ) : (
            <span style={mono({ fontSize: '10px', color: '#6B7280', background: '#FFFFFF', padding: '3px 10px', border: '1px solid #E5E7EB' })}>
              NOT ELIGIBLE
            </span>
          )}
        </div>

        {/* Already minted */}
        {(founderElig?.minted || founderResult) && (
          <div style={{ background: '#ECFDF5', border: '1px solid #86EFAC', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={mono({ fontSize: '11px', color: '#166534', marginBottom: '0.5rem' })}>
              You hold Founder Badge #{founderResult?.tokenId ?? founderElig?.mintedTokenId}
              {(founderResult?.rarityTier) && (
                <span style={{ color: RARITY_COLORS[founderResult.rarityTier] ?? '#C9A84C', marginLeft: '0.5rem' }}>
                  [{founderResult.rarityTier}]
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {founderContract && (founderResult?.tokenId ?? founderElig?.mintedTokenId) && (
                <a
                  href={`${ARBISCAN_BASE}/nft/${founderContract}/${founderResult?.tokenId ?? founderElig?.mintedTokenId}`}
                  target="_blank" rel="noopener noreferrer"
                  style={mono({ fontSize: '10px', color: '#1D4ED8', textDecoration: 'none' })}
                >
                  View NFT on Arbiscan ↗
                </a>
              )}
              {(founderResult?.txHash ?? founderElig?.mintedTxHash) && (
                <a
                  href={`${ARBISCAN_BASE}/tx/${founderResult?.txHash ?? founderElig?.mintedTxHash}`}
                  target="_blank" rel="noopener noreferrer"
                  style={mono({ fontSize: '10px', color: '#6B7280', textDecoration: 'none' })}
                >
                  Mint transaction ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Eligible and not minted */}
        {founderElig?.eligible && !founderElig.minted && !founderResult && (
          <div>
            {founderErr && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={mono({ fontSize: '10px', color: '#991B1B' })}>{founderErr}</span>
              </div>
            )}
            <p style={mono({ fontSize: '10px', color: '#374151', lineHeight: 1.6, marginBottom: '0.75rem' })}>
              You are eligible to claim your soulbound Founder Badge. This token is non-transferable after mint.
              Clicking "Claim" will prompt you to sign an authorization message — no gas required from your wallet.
            </p>
            <button
              onClick={mintFounderBadge}
              disabled={mintingFounder}
              style={{
                background: mintingFounder ? '#F3F4F6' : '#C9A84C',
                color: mintingFounder ? '#6B7280' : '#000000',
                border: '1px solid #C9A84C',
                padding: '0.6rem 1.5rem',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '1px',
                cursor: mintingFounder ? 'wait' : 'pointer',
              }}
            >
              {mintingFounder ? 'MINTING…' : 'CLAIM FOUNDER BADGE'}
            </button>
          </div>
        )}

        {/* Not eligible */}
        {!founderElig?.eligible && !founderElig?.minted && (
          <p style={mono({ fontSize: '10px', color: '#6B7280', lineHeight: 1.6 })}>
            {founderElig?.reason ??
              'Your wallet is not currently on the Founder Badge eligibility list. Eligibility is granted to early AXM holders, governance participants, and founding Wealth Practice members. Contact the team if you believe this is an error.'}
          </p>
        )}
      </div>

      {/* ── Participation Tokens ───────────────────────────────── */}
      <div style={{ background: '#FAFAF8', border: '1px solid #F3F4F6', padding: '1.25rem' }}>
        <div style={mono({ fontSize: '12px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '1rem' })}>
          PARTICIPATION BADGES · ERC-1155 · 10 AXUSD FEE EACH
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: '#E5E7EB' }}>
          {PARTICIPATION_TOKEN_TYPES.map(type => {
            const pe      = partElig.find(p => p.tokenId === type.id);
            const result  = partResult[type.id];
            const err     = partErr[type.id];
            const isMinted = pe?.minted || !!result;
            const isMinting = mintingPart === type.id;

            return (
              <div key={type.id} style={{ background: '#FFFFFF', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={mono({ fontSize: '14px', color: '#C9A84C' })}>{type.icon}</span>
                    <span style={mono({ fontSize: '11px', color: '#1E3A5F', fontWeight: 600 })}>{type.name}</span>
                  </div>
                  {isMinted ? (
                    <span style={mono({ fontSize: '9px', color: '#166534', background: '#ECFDF5', padding: '2px 6px' })}>✓ MINTED</span>
                  ) : pe?.eligible ? (
                    <span style={mono({ fontSize: '9px', color: '#92400E', background: '#FEF3C7', padding: '2px 6px' })}>ELIGIBLE</span>
                  ) : (
                    <span style={mono({ fontSize: '9px', color: '#4B5563', padding: '2px 6px' })}>LOCKED</span>
                  )}
                </div>

                {isMinted && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {partContract && (
                      <a
                        href={`${ARBISCAN_BASE}/nft/${partContract}/${type.id}`}
                        target="_blank" rel="noopener noreferrer"
                        style={mono({ fontSize: '9px', color: '#1D4ED8', textDecoration: 'none' })}
                      >
                        View NFT ↗
                      </a>
                    )}
                    {(result?.txHash ?? pe?.mintedTxHash) && (
                      <a
                        href={`${ARBISCAN_BASE}/tx/${result?.txHash ?? pe?.mintedTxHash}`}
                        target="_blank" rel="noopener noreferrer"
                        style={mono({ fontSize: '9px', color: '#6B7280', textDecoration: 'none' })}
                      >
                        Mint tx ↗
                      </a>
                    )}
                  </div>
                )}

                {pe?.eligible && !isMinted && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p style={mono({ fontSize: '9px', color: '#6B7280', lineHeight: 1.5, marginBottom: '0.5rem' })}>
                      Send exactly 10 AXUSD to{' '}
                      <span style={{ color: '#374151' }}>{TREASURY_ADDRESS.slice(0,10)}…</span>, then paste the tx hash:
                    </p>
                    <input
                      type="text"
                      placeholder="0x fee transaction hash"
                      value={partFeeHash[type.id] ?? ''}
                      onChange={e => setPartFeeHash(prev => ({ ...prev, [type.id]: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#FAFAF8', border: '1px solid #E5E7EB',
                        color: '#374151', fontFamily: 'monospace', fontSize: '9px',
                        padding: '5px 8px', marginBottom: '0.5rem',
                        outline: 'none',
                      }}
                    />
                    {err && <div style={mono({ fontSize: '9px', color: '#991B1B', marginBottom: '0.5rem' })}>{err}</div>}
                    <button
                      onClick={() => mintParticipation(type.id)}
                      disabled={isMinting}
                      style={{
                        background: isMinting ? '#F3F4F6' : '#F3F4F6',
                        color: isMinting ? '#6B7280' : '#C9A84C',
                        border: '1px solid #C9A84C',
                        padding: '4px 12px',
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        cursor: isMinting ? 'wait' : 'pointer',
                        letterSpacing: '1px',
                        width: '100%',
                      }}
                    >
                      {isMinting ? 'MINTING…' : 'CLAIM BADGE'}
                    </button>
                  </div>
                )}

                {!pe?.eligible && !isMinted && (
                  <p style={mono({ fontSize: '9px', color: '#4B5563', lineHeight: 1.4, marginTop: '0.25rem' })}>
                    Complete the associated protocol action to unlock this badge type.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p style={mono({ fontSize: '10px', color: '#4B5563', marginTop: '0.75rem', lineHeight: 1.6 })}>
          Treasury: {TREASURY_ADDRESS} · AXUSD contract: 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C · Arbitrum One
        </p>
      </div>
    </section>
  );
}

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
      <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          AXIOM PROTOCOL · UTILITY COLLECTION · ARBITRUM ONE
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 700, color: '#1E3A5F', lineHeight: 1.15, marginBottom: '1rem' }}>
          NFT Utility System
        </h1>
        <p style={{ fontFamily: 'sans-serif', fontSize: '1rem', color: '#374151', lineHeight: 1.6, maxWidth: '680px' }}>
          Three animated, rarity-tiered collections on Arbitrum One. Each NFT carries real protocol utility — priority queue access, governance weight multipliers, and fee discounts. No speculation. No hype. Earned through participation.
        </p>
      </div>

      {/* ── Wallet eligibility + mint ─────────────────────────────────── */}
      <WalletMintSection />

      {/* ── Utility gates ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          On-Chain Utility
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#E5E7EB' }}>
          {[
            { label: 'AXAU Mint Priority',    detail: 'Founder Badge holders enter the AXAU mint queue first',             gate: 'Founder Badge' },
            { label: 'Governance Multiplier', detail: '1.5× vote weight on Axiom Protocol governance proposals',          gate: 'Founder Badge' },
            { label: 'Property Analysis',     detail: '15% discount on all Property Analysis report purchases via Stripe', gate: 'Any Collection NFT' },
            { label: 'DAO Contributor Status', detail: 'Participation Badge required for payroll queue eligibility',       gate: 'Participation Badge' },
          ].map((u) => (
            <div key={u.label} style={{ background: '#FFFFFF', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase' }}>{u.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px' }}>{u.gate}</span>
              </div>
              <p style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{u.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rarity system ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Rarity System
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: '#E5E7EB', marginBottom: '1rem' }}>
          {Object.entries(RARITY_LABELS).map(([tier, label]) => (
            <div key={tier} style={{ background: '#FFFFFF', padding: '1rem', cursor: 'pointer', borderTop: `3px solid ${RARITY_COLORS[tier]}` }}
              onClick={() => setPreviewTier(tier)}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: RARITY_COLORS[tier], marginBottom: '0.25rem' }}>{tier}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1rem' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
              Axiom Founder Badge
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#C9A84C', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-721 · SOULBOUND · 100 CAP</p>
          </div>
          {founder?.deployed && (
            <a href={`https://arbitrum.blockscout.com/address/${founder.contractAddress}#code`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1D4ED8', textDecoration: 'none' }}>
              {founder.contractAddress?.slice(0, 10)}…{founder.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#E5E7EB', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Supply Cap', value: '100' },
            { label: 'Minted',           value: loading ? '—' : String(founder?.mintedCount ?? 0) },
            { label: 'Unique Holders',   value: loading ? '—' : founder?.deployed ? String(founder.uniqueHolders ?? 0) : '—' },
            { label: 'Remaining',        value: loading ? '—' : founder?.deployed ? String(100 - (founder.mintedCount ?? 0)) : '—' },
            { label: 'Transfer',         value: 'Soulbound' },
            { label: 'Royalty',          value: '7.5% EIP-2981' },
          ].map(s => (
            <div key={s.label} style={{ background: '#FFFFFF', padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#1E3A5F' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {founder?.deployed && (founder.rarityBreakdown) && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', marginBottom: '0.75rem' }}>RARITY DISTRIBUTION (MINTED)</p>
            <div style={{ display: 'flex', gap: '1px', background: '#E5E7EB', height: '24px' }}>
              {Object.entries(founder.rarityBreakdown).map(([tier, count]) => {
                const pct = founder.mintedCount ? (count / founder.mintedCount) * 100 : 0;
                return pct > 0 ? (
                  <div key={tier} title={`${tier}: ${count}`} style={{ background: RARITY_COLORS[tier], width: `${pct}%`, minWidth: count > 0 ? '2px' : '0' }} />
                ) : null;
              })}
            </div>
          </div>
        )}

        <div style={{ background: '#FAFAF8', border: '1px solid #F3F4F6', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Non-transferable after mint. Qualifying wallets: early AXM holders, governance participants, founding Wealth Practice members. Eligibility verified server-side against on-chain state.
          </p>
        </div>
      </section>

      {/* ── Collection 2: Participation ───────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
              Axiom Participation
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2D6A4F', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-1155 · MULTI-EDITION · 6 ACTION TYPES</p>
          </div>
          {participation?.deployed && (
            <a href={`https://arbitrum.blockscout.com/address/${participation.contractAddress}#code`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1D4ED8', textDecoration: 'none' }}>
              {participation.contractAddress?.slice(0, 10)}…{participation.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: '#E5E7EB', marginBottom: '1.5rem' }}>
          {PARTICIPATION_TOKEN_TYPES.map((type) => (
            <div key={type.id} style={{ background: '#FFFFFF', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#C9A84C' }}>{type.icon}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280' }}>ID #{type.id}</span>
              </div>
              <div style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', fontWeight: 600, color: '#1E3A5F', marginBottom: '0.25rem' }}>{type.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280' }}>Max supply: {type.max.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#FAFAF8', border: '1px solid #F3F4F6', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Minted automatically when completing protocol actions. Each token type is gated by a verified on-chain event — identity KYC confirmation, Wealth Practice join, governance vote cast, deal approval, early AXAU allocation, Founder circle designation.
          </p>
        </div>
      </section>

      {/* ── Collection 3: Land Receipt ────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
              Axiom Land Receipt
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#166534', letterSpacing: '2px', margin: '0.25rem 0 0' }}>ERC-1155 · PER-PROPERTY · 1,000 CAP/PARCEL</p>
          </div>
          {land?.deployed && (
            <a href={`https://arbitrum.blockscout.com/address/${land.contractAddress}#code`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1D4ED8', textDecoration: 'none' }}>
              {land.contractAddress?.slice(0, 10)}…{land.contractAddress?.slice(-6)} ↗
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#E5E7EB', marginBottom: '1.5rem' }}>
          {[
            { label: 'Token ID Model',   value: 'One per parcel' },
            { label: 'Supply per Parcel', value: '1,000 max' },
            { label: 'Parcels Registered', value: loading ? '—' : String(land?.mintedCount ?? 0) },
            { label: 'Governance Gate',   value: 'GOVERNANCE_ROLE' },
            { label: 'Royalty',           value: '7.5% EIP-2981' },
            { label: 'Transferable',      value: 'Yes (secondary market)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#FFFFFF', padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: '#1E3A5F' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#FAFAF8', border: '1px solid #F3F4F6', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            Minted by protocol governance on deal approval. Each land parcel token ID maps to an asset registry entry. Receipts represent participation in the Axiom land acquisition pipeline — not a fractional ownership instrument. Traits include parcel location class, deal stage, and acquisition tier.
          </p>
        </div>
      </section>

      {/* ── Trait upgrade mechanic ─────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Trait Upgrade Mechanic
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#E5E7EB', marginBottom: '1rem' }}>
          {[
            { tier: 'Common',   prob: '40%', cost: '50 AXM' },
            { tier: 'Uncommon', prob: '30%', cost: '50 AXM' },
            { tier: 'Rare',     prob: '20%', cost: '50 AXM' },
            { tier: 'Epic',     prob: '10%', cost: '50 AXM' },
          ].map(r => (
            <div key={r.tier} style={{ background: '#FFFFFF', padding: '1rem', borderTop: `3px solid ${RARITY_COLORS[r.tier]}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: RARITY_COLORS[r.tier], marginBottom: '0.25rem' }}>{r.tier} → {Object.keys(RARITY_COLORS)[Object.keys(RARITY_COLORS).indexOf(r.tier) - 1]}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#374151' }}>Success rate: {r.prob}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280' }}>Cost: {r.cost} burned</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FAFAF8', border: '1px solid #F3F4F6', padding: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
            50 AXM burned per upgrade attempt. Probabilistic outcome. Success advances rarity one tier. Animation is regenerated on tier advancement. Legendary tokens cannot be upgraded further. AXM burned is consumed on failure — no refund.
          </p>
        </div>
      </section>

      {/* ── Technical spec ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Technical Specification
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '0.75rem' }}>CONTRACT STANDARDS</p>
            {[
              ['ERC-721 (Soulbound)',  'AxiomFounderBadge'],
              ['ERC-1155',            'AxiomParticipation + AxiomLandReceipt'],
              ['EIP-2981',            'Royalty: 7.5% → Treasury'],
              ['ERC-4906',            'Dynamic metadata update events'],
              ['AccessControl',       'MINTER_ROLE, GOVERNANCE_ROLE'],
            ].map(([std, impl]) => (
              <div key={std} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #F3F4F6', gap: '1rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1E3A5F', flexShrink: 0 }}>{std}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', textAlign: 'right' }}>{impl}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#C9A84C', letterSpacing: '1px', marginBottom: '0.75rem' }}>METADATA PIPELINE</p>
            {[
              ['Trait seed',      'keccak256(tokenId + contract + block + owner)'],
              ['Rarity engine',   'Deterministic, on-chain verifiable'],
              ['Static image',    'Gemini AI → IPFS (Storacha)'],
              ['Animation',       'CSS/SVG (HTML) served by metadata API'],
              ['Metadata format', 'OpenSea standard + animation_url'],
              ['IPFS gateway',    'w3s.link (Storacha)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #F3F4F6', gap: '1rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1E3A5F', flexShrink: 0 }}>{k}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verified Contracts ────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Verified Contracts
        </h2>
        <div style={{ display: 'grid', gap: '1px', background: '#E5E7EB' }}>
          {[
            { label: 'Axiom Founder Badge',  type: 'ERC-721 Soulbound',   address: founder?.contractAddress,      deployed: founder?.deployed },
            { label: 'Axiom Participation',  type: 'ERC-1155',            address: participation?.contractAddress, deployed: participation?.deployed },
            { label: 'Axiom Land Receipt',   type: 'ERC-1155 Per-Parcel', address: land?.contractAddress,          deployed: land?.deployed },
          ].map((c) => (
            <div key={c.label} style={{ background: '#FFFFFF', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  {c.deployed && (
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#166534', fontWeight: 700, background: '#ECFDF5', padding: '1px 6px' }}>✓ VERIFIED</span>
                  )}
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1E3A5F', fontWeight: 600 }}>{c.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '1px 5px' }}>{c.type}</span>
                </div>
                {c.address && (
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563' }}>{c.address}</span>
                )}
              </div>
              {c.address ? (
                <a
                  href={`https://arbitrum.blockscout.com/address/${c.address}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1D4ED8', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  View Source + ABI ↗
                </a>
              ) : (
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4B5563' }}>
                  —
                </span>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', marginTop: '0.5rem' }}>
          Source code verified on Arbitrum Blockscout. ABI readable by any third party. Compiler: Solidity 0.8.20, optimizer 200 runs, viaIR enabled.
        </p>
      </section>

      {/* ── OpenSea integration ───────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '1.25rem', fontWeight: 700, color: '#1E3A5F', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
          Marketplace Integration
        </h2>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'OpenSea', detail: 'contractURI() with seller_fee_basis_points: 750. EIP-2981 on-chain royalty enforcement.', status: 'Configured' },
              { label: 'Blur', detail: 'EIP-2981 royalties respected. No separate integration required.', status: 'Compatible' },
              { label: 'LooksRare', detail: 'EIP-2981 standard royalty. Collection registered via contractURI.', status: 'Compatible' },
            ].map(m => (
              <div key={m.label} style={{ padding: '0.75rem', background: '#FAFAF8', border: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#1E3A5F' }}>{m.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#166534', background: '#ECFDF5', padding: '1px 6px' }}>{m.status}</span>
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6B7280', lineHeight: 1.5 }}>{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclosure footer ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', lineHeight: 1.8 }}>
          NFT DISCLOSURE · These tokens represent protocol participation and utility access within the Axiom Protocol ecosystem. They are not investment contracts, do not represent fractional ownership of any asset, and confer no financial return or profit expectation. Land Receipt NFTs do not constitute fractional real estate ownership — they are participation records. Variable royalties enforced on-chain via EIP-2981. All token types are experimental and subject to change. Not an offer to sell securities.
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4B5563', marginTop: '0.5rem' }}>
          <Link href="/disclosure" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Institutional Disclosure</Link>
          {' · '}
          <Link href="/trust" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Trust Stack</Link>
          {' · '}
          <a href="https://arbitrum.blockscout.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'none' }}>→ Blockscout ↗</a>
        </p>
      </div>
    </DesignLawLayout>
  );
}
