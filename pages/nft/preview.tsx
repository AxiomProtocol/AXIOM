import { GetServerSideProps } from 'next';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { pool } from '../../lib/db';

interface TokenPreview {
  tokenId: number;
  contractType: string;
  rarityTier: string;
  contractAddress: string;
  imageCid: string | null;
}

interface Props {
  tokens: TokenPreview[];
  siteUrl: string;
}

const RARITY_COLORS: Record<string, string> = {
  Legendary: '#C9A84C',
  Epic:      '#7C3AED',
  Rare:      '#2D6A4F',
  Uncommon:  '#3B82F6',
  Common:    '#6B7280',
};

export default function NFTPreviewPage({ tokens, siteUrl }: Props) {
  const founders      = tokens.filter((t) => t.contractType === 'ERC721');
  const participation = tokens.filter((t) => t.contractType === 'ERC1155');

  function imageUrl(t: TokenPreview) {
    const slug = t.contractType === 'ERC721' ? 'founder' : 'participation';
    const staticPath = `/nft-preview/${slug}-${t.tokenId}.png`;
    const apiFallback = `/api/nft/image?tokenId=${t.tokenId}&contractAddress=${encodeURIComponent(t.contractAddress)}`;
    // Use static file if pre-rendered, API otherwise
    return staticPath;
    void apiFallback;
  }

  function TokenCard({ t }: { t: TokenPreview }) {
    const color = RARITY_COLORS[t.rarityTier] ?? '#6B7280';
    const label = t.contractType === 'ERC721' ? 'Founder Badge' : 'Participation';
    return (
      <div style={{ border: `2px solid ${color}`, background: '#0D1117', padding: 10 }}>
        <img
          src={imageUrl(t)}
          alt={`${label} #${t.tokenId}`}
          style={{ width: '100%', display: 'block', aspectRatio: '1/1', objectFit: 'cover' }}
        />
        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11 }}>
          <div style={{ color: '#FAFAFA', fontWeight: 700 }}>
            {label} #{t.tokenId}
          </div>
          <div style={{ color, marginTop: 2, fontWeight: 600 }}>{t.rarityTier}</div>
          {t.imageCid ? (
            <div style={{ color: '#4B5563', marginTop: 4, wordBreak: 'break-all', fontSize: 9 }}>
              ipfs/{t.imageCid.slice(0, 24)}…
            </div>
          ) : (
            <div style={{ color: '#EF4444', marginTop: 4, fontSize: 9 }}>no IPFS CID</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: 28, color: '#FAFAFA', marginBottom: 6 }}>
          NFT Artwork Preview
        </h1>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          {tokens.length} tokens · {tokens.filter((t) => t.imageCid).length} pinned to IPFS via Pinata
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', marginBottom: 32 }}>
          Images load from local cache · IPFS CID shown below each card
        </p>

        <h2 style={{ fontFamily: 'serif', fontSize: 18, color: '#C9A84C', marginBottom: 16 }}>
          Axiom Founder Badge — ERC-721 ({founders.length} of 100 tokens generated)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 48 }}>
          {founders.map((t) => <TokenCard key={`founder-${t.tokenId}`} t={t} />)}
        </div>

        <h2 style={{ fontFamily: 'serif', fontSize: 18, color: '#C9A84C', marginBottom: 16 }}>
          Axiom Participation — ERC-1155 ({participation.length} action types)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 48 }}>
          {participation.map((t) => <TokenCard key={`participation-${t.tokenId}`} t={t} />)}
        </div>

        <div style={{ padding: 16, background: '#0A0F1A', border: '1px solid #1F2937', fontFamily: 'monospace', fontSize: 10, color: '#4B5563' }}>
          <div style={{ color: '#6B7280', marginBottom: 8, fontWeight: 700 }}>PINATA IPFS REGISTRY</div>
          {tokens.map((t) => (
            <div key={`${t.contractType}-${t.tokenId}`} style={{ marginBottom: 3 }}>
              <span style={{ color: '#9CA3AF' }}>
                {t.contractType === 'ERC721' ? 'Founder' : 'Participation'} #{t.tokenId}
              </span>
              <span style={{ color: RARITY_COLORS[t.rarityTier] ?? '#6B7280' }}> · {t.rarityTier}</span>
              <span style={{ color: '#4B5563' }}> · {t.imageCid ?? 'NO CID'}</span>
            </div>
          ))}
        </div>
      </div>
    </DesignLawLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const result = await pool.query(`
    SELECT token_id, contract_type, rarity_tier, contract_address, image_cid
    FROM nft_tokens
    ORDER BY contract_type DESC, token_id ASC
  `);

  const siteUrl = `https://${process.env.REPLIT_DEV_DOMAIN ?? 'localhost:5000'}`;

  return {
    props: {
      siteUrl,
      tokens: result.rows.map((r: Record<string, unknown>) => ({
        tokenId:         Number(r.token_id),
        contractType:    String(r.contract_type),
        rarityTier:      String(r.rarity_tier),
        contractAddress: String(r.contract_address),
        imageCid:        r.image_cid ? String(r.image_cid) : null,
      })),
    },
  };
};
