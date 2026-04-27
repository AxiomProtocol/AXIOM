import { generateImage } from '../server/gemini';
import { buildImagePrompt, generateAnimationHTML, type NFTTraits, type RarityTier } from './traitEngine';
import { upsertNFTToken } from './db';
import { createHash } from 'crypto';

export interface MediaResult {
  imageData: string | null;
  imageCid:  string | null;
  imageUrl:  string;
  animationUrl: string;
}

/**
 * Upload a base64 image to NFT.Storage (if NFT_STORAGE_API_KEY is configured)
 * and return the IPFS CID. Falls back to null when credentials are absent.
 *
 * NFT.Storage HTTP API: POST https://api.nft.storage/upload
 * Authorization: Bearer <key>
 * Content-Type: image/png
 * Body: binary image bytes
 */
async function uploadToIPFS(base64Data: string, mimeType: string): Promise<string | null> {
  const apiKey = process.env.NFT_STORAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const buf = Buffer.from(base64Data, 'base64');
    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: buf,
    });

    if (!response.ok) {
      console.warn('[mediaPipeline] NFT.Storage upload HTTP error:', response.status, await response.text());
      return null;
    }

    const json = await response.json() as { ok: boolean; value?: { cid?: string } };
    return json?.value?.cid ?? null;
  } catch (err) {
    console.warn('[mediaPipeline] NFT.Storage upload failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Generate NFT artwork via Gemini and persist it to the database.
 *
 * Media pipeline stages:
 *   1. Generate static image via Gemini (gemini-2.5-flash-image)
 *   2. Upload to IPFS via NFT.Storage when NFT_STORAGE_API_KEY is configured;
 *      fall back to SHA-256 content-address stored in the DB
 *   3. Animation is served as tiered CSS/HTML via /api/nft/animation
 *      (OpenSea supports HTML animation_url; MP4/WebM generation pending a
 *      video generation API integration in follow-up task)
 *
 * Non-blocking: call with .catch() from mint handlers to avoid blocking mint response.
 */
export async function generateNFTMedia(params: {
  tokenId: number | string;
  contractAddress: string;
  traits: NFTTraits;
  collectionName: string;
  baseUrl: string;
}): Promise<MediaResult> {
  const { tokenId, contractAddress, traits, collectionName, baseUrl } = params;

  const animationUrl = `${baseUrl}/api/nft/animation?tokenId=${tokenId}&contractAddress=${encodeURIComponent(contractAddress)}`;

  let imageData: string | null = null;
  let imageCid:  string | null = null;
  let imageUrl               = animationUrl;

  try {
    const prompt  = buildImagePrompt(tokenId, traits, collectionName);
    imageData     = await generateImage(prompt);

    const [header, base64] = imageData.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';

    const ipfsCid = await uploadToIPFS(base64, mimeType);
    if (ipfsCid) {
      imageCid = ipfsCid;
      imageUrl = `https://nftstorage.link/ipfs/${ipfsCid}`;
    } else {
      imageCid = 'sha256:' + createHash('sha256').update(base64).digest('hex');
      imageUrl = `${baseUrl}/api/nft/image?tokenId=${tokenId}&contractAddress=${encodeURIComponent(contractAddress)}`;
    }

    await upsertNFTToken({
      tokenId:         Number(tokenId),
      contractAddress,
      imageData,
      imageCid,
    });
  } catch (err) {
    console.warn('[mediaPipeline] Gemini image generation failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  return { imageData, imageCid, imageUrl, animationUrl };
}

/**
 * Derive the image URL for a token. Returns the Gemini-generated image URL
 * if available (IPFS or DB-served), otherwise falls back to the CSS animation endpoint.
 */
export function resolveImageUrl(
  tokenRow: Record<string, unknown> | null,
  baseUrl: string,
  tokenId: number,
  contractAddress: string
): string {
  if (tokenRow?.image_cid && typeof tokenRow.image_cid === 'string' && !tokenRow.image_cid.startsWith('sha256:')) {
    return `https://nftstorage.link/ipfs/${tokenRow.image_cid}`;
  }
  if (tokenRow?.image_data) {
    return `${baseUrl}/api/nft/image?tokenId=${tokenId}&contractAddress=${encodeURIComponent(contractAddress)}`;
  }
  return `${baseUrl}/api/nft/animation?tokenId=${tokenId}&contractAddress=${encodeURIComponent(contractAddress)}`;
}

/**
 * Rarity-tiered animation durations for OpenSea animation_url metadata.
 */
export const ANIMATION_DURATIONS: Record<RarityTier, string> = {
  Legendary: '8s',
  Epic:      '6s',
  Rare:      '5s',
  Uncommon:  '4s',
  Common:    '3s',
};

export { generateAnimationHTML };
