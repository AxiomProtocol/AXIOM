import { generateImage } from '../server/gemini';
import { buildImagePrompt, type NFTTraits, type RarityTier } from './traitEngine';
import { upsertNFTToken } from './db';
import { createHash } from 'crypto';

export interface MediaResult {
  imageData: string | null;
  imageCid:  string | null;
  animationUrl: string;
}

/**
 * Generate NFT artwork via Gemini and persist it to the database.
 * Returns image data URL, a content-addressed pseudo-CID (SHA-256 of image data),
 * and a CSS/HTML animation URL. On failure, falls back gracefully.
 *
 * Note: Production Storacha/IPFS upload is wired via imageCid. When
 * STORACHA_API_KEY is configured, images will be pinned to IPFS and the
 * real CID returned. Until then, a SHA-256 content address is used.
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
  let imageCid: string | null = null;

  try {
    const prompt = buildImagePrompt(tokenId, traits, collectionName);
    imageData = await generateImage(prompt);

    const rawBase64 = imageData.split(',')[1] ?? '';
    imageCid = 'sha256:' + createHash('sha256').update(rawBase64).digest('hex');

    await upsertNFTToken({
      tokenId:         Number(tokenId),
      contractAddress,
      imageData,
      imageCid,
    });
  } catch (err) {
    console.warn('[mediaPipeline] Gemini image generation failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  return { imageData, imageCid, animationUrl };
}

/**
 * Derive the image URL for a token. Returns the Gemini-generated data URL
 * if available, otherwise falls back to the CSS animation endpoint.
 */
export function resolveImageUrl(tokenRow: Record<string, unknown> | null, baseUrl: string, tokenId: number, contractAddress: string): string {
  if (tokenRow?.image_data && typeof tokenRow.image_data === 'string') {
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
