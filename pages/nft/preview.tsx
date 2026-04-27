import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useRef, useState, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { pool } from '../../lib/db';

interface TokenPreview {
  tokenId: number;
  contractType: string;
  rarityTier: string;
  contractAddress: string;
  imageCid: string | null;
  contractKey: string;
}

interface Props {
  tokens: TokenPreview[];
  page: number;
  totalPages: number;
  pageTokens: TokenPreview[];
}

const RARITY: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Legendary: { color: '#92680A', bg: '#FDF8EE', border: '#C9A84C', label: 'LEGENDARY'  },
  Epic:      { color: '#6B21A8', bg: '#FAF5FF', border: '#A855F7', label: 'EPIC'       },
  Rare:      { color: '#0E7490', bg: '#ECFEFF', border: '#22D3EE', label: 'RARE'       },
  Uncommon:  { color: '#1D4ED8', bg: '#EFF6FF', border: '#60A5FA', label: 'UNCOMMON'   },
  Common:    { color: '#374151', bg: '#F9FAFB', border: '#9CA3AF', label: 'COMMON'     },
};

const PAGE_SIZE = 8;

// ── NFT Card ─────────────────────────────────────────────────────────────────
function NFTCard({ t, index }: { t: TokenPreview; index: number }) {
  const rarity     = RARITY[t.rarityTier] ?? RARITY.Common;
  const label      = t.contractType === 'ERC721' ? 'Founder Badge' : 'Participation';
  const defaultSrc = `/nft-preview/${t.contractKey}-${t.tokenId}.png`;

  const cardRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tilt,       setTilt]       = useState({ rx: 0, ry: 0 });
  const [hovering,   setHovering]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [status,     setStatus]     = useState<'idle'|'ok'|'err'>('idle');
  const [previewSrc, setPreviewSrc] = useState(defaultSrc);
  const [liveCid,    setLiveCid]    = useState<string | null>(t.imageCid);
  const [errMsg,     setErrMsg]     = useState('');

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    setTilt({ rx: -y * 10, ry: x * 10 });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setHovering(false);
  }, []);

  async function handleFile(file: File) {
    setUploading(true);
    setStatus('idle');
    setErrMsg('');
    setPreviewSrc(URL.createObjectURL(file));
    try {
      const body = new FormData();
      body.append('file',        file);
      body.append('tokenId',     String(t.tokenId));
      body.append('contractKey', t.contractKey);
      const res  = await fetch('/api/nft/upload-artwork', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLiveCid(json.cid);
      setStatus('ok');
      setPreviewSrc(`/nft-preview/${t.contractKey}-${t.tokenId}.png?t=${Date.now()}`);
    } catch (err: unknown) {
      setStatus('err');
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPreviewSrc(defaultSrc);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{ perspective: 1000, animationDelay: `${index * 70}ms` }}
      className="nft-card-entry"
    >
      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={onMouseLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          background: '#FFFFFF',
          border: `1.5px solid ${hovering ? rarity.border : '#E5E7EB'}`,
          boxShadow: hovering
            ? `0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px ${rarity.border}33, 0 4px 20px ${rarity.border}22`
            : '0 2px 12px rgba(0,0,0,0.07)',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(${hovering ? -4 : 0}px)`,
          transformStyle: 'preserve-3d',
          transition: hovering
            ? 'transform 0.12s ease, box-shadow 0.25s ease, border-color 0.2s ease'
            : 'transform 0.5s ease, box-shadow 0.4s ease, border-color 0.3s ease',
          cursor: uploading ? 'wait' : 'pointer',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: rarity.bg }}>
          <img
            src={previewSrc}
            alt={`${label} #${t.tokenId}`}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            style={{
              width: '100%', height: '100%', objectFit: 'contain', display: 'block',
              transform: hovering ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.5s ease',
            }}
          />

          {/* Upload overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: hovering || uploading ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}>
            {uploading ? (
              <>
                <div className="light-spinner" style={{ borderTopColor: rarity.border, borderColor: `${rarity.border}33` }} />
                <span style={{ fontFamily: '"Space Mono", monospace', fontSize: 9, color: rarity.color, letterSpacing: 3 }}>
                  PINNING TO IPFS…
                </span>
              </>
            ) : (
              <>
                <div style={{
                  width: 44, height: 44,
                  border: `1.5px solid ${rarity.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: rarity.bg,
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2v10M5 6l4-4 4 4" stroke={rarity.color} strokeWidth="1.5" strokeLinecap="square"/>
                    <path d="M2 14h14" stroke={rarity.color} strokeWidth="1.5" strokeLinecap="square"/>
                  </svg>
                </div>
                <span style={{ fontFamily: '"Space Mono", monospace', fontSize: 9, color: rarity.color, letterSpacing: 2 }}>
                  UPLOAD ARTWORK
                </span>
              </>
            )}
          </div>

          {/* Rarity badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: rarity.bg,
            border: `1px solid ${rarity.border}`,
            color: rarity.color,
            fontFamily: '"Space Mono", monospace',
            fontSize: 8, fontWeight: 700,
            padding: '3px 8px', letterSpacing: 2,
          }}>
            {rarity.label}
          </div>

          {/* Token number badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #E5E7EB',
            color: '#9CA3AF',
            fontFamily: '"Cinzel", serif',
            fontSize: 9, fontWeight: 600,
            padding: '3px 8px', letterSpacing: 1,
          }}>
            #{t.tokenId}
          </div>

          {/* Status */}
          {status === 'ok' && (
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              background: '#ECFDF5', border: '1px solid #6EE7B7',
              color: '#065F46',
              fontFamily: '"Space Mono", monospace', fontSize: 8,
              padding: '3px 8px', letterSpacing: 1,
            }}>
              ✓ PINNED
            </div>
          )}
          {status === 'err' && (
            <div style={{
              position: 'absolute', bottom: 10, left: 10, right: 10,
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontFamily: '"Space Mono", monospace', fontSize: 8,
              padding: '3px 6px', wordBreak: 'break-all',
            }}>
              ✗ {errMsg.slice(0, 55)}
            </div>
          )}
        </div>

        {/* Card footer */}
        <div style={{
          padding: '14px 16px 16px',
          borderTop: `1px solid ${hovering ? rarity.border + '44' : '#F3F4F6'}`,
          transition: 'border-color 0.25s ease',
        }}>
          <div style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 12, fontWeight: 600, letterSpacing: 1,
            color: '#111827', marginBottom: 5,
          }}>
            {label} <span style={{ color: rarity.color }}>#{t.tokenId}</span>
          </div>
          <div style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: 9, color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 8,
          }}>
            {t.contractType} · {t.contractAddress.slice(0,6)}…{t.contractAddress.slice(-4)}
          </div>
          {liveCid ? (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${liveCid}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: '"Space Mono", monospace',
                fontSize: 8, color: rarity.color,
                textDecoration: 'none', letterSpacing: 0.5,
                opacity: 0.75, transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
            >
              <svg width="7" height="7" viewBox="0 0 7 7" fill={rarity.color}><circle cx="3.5" cy="3.5" r="3"/></svg>
              ipfs/{liveCid.slice(0, 22)}…
            </a>
          ) : (
            <div style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: 8, color: '#D1D5DB', letterSpacing: 0.5,
              fontStyle: 'italic',
            }}>
              no artwork — click to upload
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function NFTPreviewPage({ tokens, page, totalPages, pageTokens }: Props) {
  const router = useRouter();

  function goTo(p: number) {
    router.push({ pathname: '/nft/preview', query: { page: p } }, undefined, { scroll: false });
  }

  const pinned = tokens.filter(t => t.imageCid).length;
  const rarityBreakdown = Object.entries(RARITY)
    .map(([tier, r]) => ({ tier, ...r, count: tokens.filter(t => t.rarityTier === tier).length }))
    .filter(x => x.count > 0);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        .nft-card-entry {
          animation: fadeUp 0.5s ease both;
        }
        .light-spinner {
          width: 26px; height: 26px;
          border-width: 1.5px;
          border-style: solid;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }
        .page-btn {
          transition: all 0.15s ease;
        }
        .page-btn:hover:not(:disabled) {
          border-color: #C9A84C !important;
          color: #92680A !important;
          background: #FDF8EE !important;
        }
      `}</style>

      <DesignLawLayout>
        <div style={{ background: '#F7F6F2', minHeight: '100vh' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 28px 100px' }}>

            {/* ── Hero ──────────────────────────────────────────────── */}
            <div style={{ marginBottom: 56, animation: 'fadeUp 0.6s ease both' }}>

              {/* Eyebrow */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
              }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C55)' }} />
                <span style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 9, letterSpacing: 4, color: '#C9A84C',
                  whiteSpace: 'nowrap',
                }}>
                  AXIOM PROTOCOL · ON-CHAIN COLLECTION · ARBITRUM ONE
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #C9A84C55, transparent)' }} />
              </div>

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h1 style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 'clamp(36px, 6vw, 72px)',
                    fontWeight: 900,
                    letterSpacing: 6,
                    color: '#111827',
                    margin: 0,
                    lineHeight: 1,
                  }}>
                    NFT
                    <span style={{
                      background: 'linear-gradient(135deg, #92680A 0%, #C9A84C 40%, #FFE08A 60%, #C9A84C 80%, #92680A 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginLeft: 18,
                    }}>
                      COLLECTION
                    </span>
                  </h1>
                  <div style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: 10, color: '#9CA3AF', letterSpacing: 4, marginTop: 12,
                  }}>
                    ERC-721 FOUNDER BADGES · ERC-1155 PARTICIPATION
                  </div>
                </div>

                {/* Upload instruction badge */}
                <div style={{
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  padding: '10px 18px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ width: 6, height: 6, background: '#C9A84C', animation: 'pulse-dot 2s ease infinite' }} />
                  <span style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: 8, color: '#6B7280', letterSpacing: 2,
                  }}>
                    CLICK ANY CARD TO UPLOAD · AUTO-PINS TO IPFS
                  </span>
                </div>
              </div>

              {/* Gold rule */}
              <div style={{ height: 2, marginTop: 28, background: 'linear-gradient(90deg, #C9A84C, #FFE08A 40%, #C9A84C 70%, transparent)' }} />
            </div>

            {/* ── Stats ─────────────────────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${2 + rarityBreakdown.length}, 1fr)`,
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              marginBottom: 40,
              animation: 'fadeUp 0.5s 0.1s ease both',
            }}>
              {[
                { label: 'TOTAL TOKENS', value: String(tokens.length), color: '#111827' },
                { label: 'IPFS PINNED',  value: `${pinned} / ${tokens.length}`, color: '#C9A84C' },
                ...rarityBreakdown.map(r => ({ label: r.label, value: String(r.count), color: r.color })),
              ].map((s, i, arr) => (
                <div key={i} style={{
                  padding: '20px 24px',
                  borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 28, fontWeight: 700,
                    color: s.color,
                    marginBottom: 5,
                    lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: 8, color: '#9CA3AF', letterSpacing: 2,
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── NFT Grid ──────────────────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              marginBottom: 48,
            }}>
              {pageTokens.map((t, i) => (
                <NFTCard key={`${t.contractType}-${t.tokenId}`} t={t} index={i} />
              ))}
            </div>

            {/* ── Pagination ────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, marginBottom: 56,
                animation: 'fadeUp 0.5s 0.2s ease both',
              }}>
                <button
                  className="page-btn"
                  onClick={() => goTo(page - 1)}
                  disabled={page <= 1}
                  style={{
                    background: '#FFFFFF', color: page <= 1 ? '#D1D5DB' : '#374151',
                    border: '1px solid #E5E7EB', padding: '9px 22px',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontFamily: '"Space Mono", monospace', fontSize: 9, letterSpacing: 2,
                  }}
                >
                  ← PREV
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className="page-btn"
                    onClick={() => goTo(p)}
                    style={{
                      background: p === page ? '#C9A84C' : '#FFFFFF',
                      color: p === page ? '#FFFFFF' : '#6B7280',
                      border: p === page ? '1px solid #C9A84C' : '1px solid #E5E7EB',
                      padding: '9px 16px',
                      cursor: 'pointer',
                      fontFamily: '"Cinzel", serif',
                      fontSize: 12, fontWeight: p === page ? 700 : 400,
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="page-btn"
                  onClick={() => goTo(page + 1)}
                  disabled={page >= totalPages}
                  style={{
                    background: '#FFFFFF', color: page >= totalPages ? '#D1D5DB' : '#374151',
                    border: '1px solid #E5E7EB', padding: '9px 22px',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontFamily: '"Space Mono", monospace', fontSize: 9, letterSpacing: 2,
                  }}
                >
                  NEXT →
                </button>
              </div>
            )}

            {/* ── Rarity legend ─────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              animation: 'fadeUp 0.5s 0.25s ease both',
            }}>
              {Object.entries(RARITY).map(([tier, r], i, arr) => (
                <div key={tier} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 22px',
                  borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                  flex: 1,
                }}>
                  <div style={{ width: 8, height: 8, background: r.border }} />
                  <span style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: 8, color: r.color, letterSpacing: 2,
                  }}>
                    {r.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontFamily: '"Cinzel", serif',
                    fontSize: 11, fontWeight: 600, color: r.color,
                  }}>
                    {tokens.filter(t => t.rarityTier === tier).length}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </DesignLawLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));

  const result = await pool.query(`
    SELECT token_id, contract_type, rarity_tier, contract_address, image_cid
    FROM nft_tokens
    ORDER BY contract_type DESC, token_id ASC
  `);

  const tokens: TokenPreview[] = result.rows.map((r: Record<string, unknown>) => ({
    tokenId:         Number(r.token_id),
    contractType:    String(r.contract_type),
    rarityTier:      String(r.rarity_tier),
    contractAddress: String(r.contract_address),
    imageCid:        r.image_cid ? String(r.image_cid) : null,
    contractKey:     String(r.contract_type) === 'ERC721' ? 'founder' : 'participation',
  }));

  const totalPages = Math.max(1, Math.ceil(tokens.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageTokens = tokens.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { props: { tokens, page: safePage, totalPages, pageTokens } };
};
