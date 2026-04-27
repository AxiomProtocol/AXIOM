import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
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

const RARITY_COLORS: Record<string, string> = {
  Legendary: '#C9A84C',
  Epic:      '#7C3AED',
  Rare:      '#2D6A4F',
  Uncommon:  '#3B82F6',
  Common:    '#6B7280',
};

const PAGE_SIZE = 8;

export default function NFTPreviewPage({ tokens, page, totalPages, pageTokens }: Props) {
  const router = useRouter();

  function goTo(p: number) {
    router.push({ pathname: '/nft/preview', query: { page: p } }, undefined, { scroll: true });
  }

  function TokenCard({ t }: { t: TokenPreview }) {
    const color      = RARITY_COLORS[t.rarityTier] ?? '#6B7280';
    const label      = t.contractType === 'ERC721' ? 'Founder Badge' : 'Participation';
    const defaultSrc = `/nft-preview/${t.contractKey}-${t.tokenId}.png`;
    const ipfsUrl    = t.imageCid ? `https://gateway.pinata.cloud/ipfs/${t.imageCid}` : null;

    const inputRef                            = useRef<HTMLInputElement>(null);
    const [uploading, setUploading]           = useState(false);
    const [status, setStatus]                 = useState<'idle' | 'ok' | 'err'>('idle');
    const [previewSrc, setPreviewSrc]         = useState(defaultSrc);
    const [liveCid, setLiveCid]               = useState<string | null>(t.imageCid);
    const [errMsg, setErrMsg]                 = useState('');

    async function handleFile(file: File) {
      setUploading(true);
      setStatus('idle');
      setErrMsg('');

      // Show instant local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewSrc(localUrl);

      try {
        const body = new FormData();
        body.append('file', file);
        body.append('tokenId', String(t.tokenId));
        body.append('contractKey', t.contractKey);

        const res = await fetch('/api/nft/upload-artwork', { method: 'POST', body });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

        setLiveCid(json.cid);
        setStatus('ok');
        // Bust the cached PNG by adding a timestamp query
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
      <div style={{ border: `2px solid ${color}33`, background: '#080D14', display: 'flex', flexDirection: 'column' }}>

        {/* Image area — click to upload */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          title="Click to upload artwork"
          style={{
            position: 'relative',
            aspectRatio: '1/1',
            overflow: 'hidden',
            background: '#0D1117',
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          <img
            src={previewSrc}
            alt={`${label} #${t.tokenId}`}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Hover overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: uploading ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
            onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#FAFAFA', letterSpacing: 1 }}>
              {uploading ? 'UPLOADING…' : '↑ UPLOAD IMAGE'}
            </span>
          </div>

          {/* Rarity badge */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: color, color: '#fff',
            fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
            padding: '2px 6px', letterSpacing: 1,
          }}>
            {t.rarityTier.toUpperCase()}
          </div>

          {/* Status flash */}
          {status === 'ok' && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: '#065F46', color: '#6EE7B7',
              fontFamily: 'monospace', fontSize: 9, padding: '2px 6px',
            }}>
              ✓ PINNED
            </div>
          )}
          {status === 'err' && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8, right: 8,
              background: '#7F1D1D', color: '#FCA5A5',
              fontFamily: 'monospace', fontSize: 9, padding: '2px 6px',
              wordBreak: 'break-all',
            }}>
              ✗ {errMsg.slice(0, 60)}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>

        {/* Card footer */}
        <div style={{ padding: '10px 12px', flex: 1 }}>
          <div style={{ fontFamily: 'serif', fontSize: 13, color: '#FAFAFA', marginBottom: 3 }}>
            {label} #{t.tokenId}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4B5563' }}>
            {t.contractType} · {t.contractAddress.slice(0, 6)}…{t.contractAddress.slice(-4)}
          </div>
          {liveCid ? (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${liveCid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 5, fontFamily: 'monospace', fontSize: 9, color: '#374151', textDecoration: 'none', wordBreak: 'break-all' }}
            >
              ipfs/{liveCid.slice(0, 28)}…
            </a>
          ) : (
            <div style={{ marginTop: 5, fontFamily: 'monospace', fontSize: 9, color: '#374151' }}>
              no artwork yet — click to upload
            </div>
          )}
        </div>
      </div>
    );
  }

  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, tokens.length);

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'serif', fontSize: 28, color: '#FAFAFA', margin: 0 }}>
            NFT Artwork
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
            {tokens.length} tokens · {tokens.filter(t => t.imageCid).length} pinned to IPFS · showing {start}–{end}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', marginTop: 4, marginBottom: 0 }}>
            Click any card to upload your artwork → auto-pinned to IPFS
          </p>
        </div>

        {/* Token grid — 4 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {pageTokens.map(t => (
            <TokenCard key={`${t.contractType}-${t.tokenId}`} t={t} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'monospace', fontSize: 12, marginBottom: 40 }}>
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              style={{
                background: page <= 1 ? '#1F2937' : '#1B2B4B',
                color: page <= 1 ? '#4B5563' : '#FAFAFA',
                border: '1px solid #374151', padding: '8px 20px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace', fontSize: 12,
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => goTo(p)}
                style={{
                  background: p === page ? '#C9A84C' : '#111827',
                  color: p === page ? '#080D14' : '#9CA3AF',
                  border: '1px solid #374151', padding: '8px 14px',
                  cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
                  fontWeight: p === page ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              style={{
                background: page >= totalPages ? '#1F2937' : '#1B2B4B',
                color: page >= totalPages ? '#4B5563' : '#FAFAFA',
                border: '1px solid #374151', padding: '8px 20px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace', fontSize: 12,
              }}
            >
              Next →
            </button>

            <span style={{ color: '#4B5563', marginLeft: 8 }}>
              Page {page} of {totalPages}
            </span>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {Object.entries(RARITY_COLORS).map(([tier, color]) => (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 11 }}>
              <div style={{ width: 10, height: 10, background: color }} />
              <span style={{ color: '#9CA3AF' }}>{tier}</span>
            </div>
          ))}
        </div>

      </div>
    </DesignLawLayout>
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

  const totalPages  = Math.max(1, Math.ceil(tokens.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageTokens  = tokens.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return {
    props: { tokens, page: safePage, totalPages, pageTokens },
  };
};
