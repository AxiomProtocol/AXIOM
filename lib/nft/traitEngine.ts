import { ethers } from 'ethers';

// ── Rarity tiers ─────────────────────────────────────────────────────────────

export type RarityTier = 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';

// Thresholds are raw byte values (0–255) for correct probability distribution:
// Legendary: byte 0–2   → 3/256 ≈ 1.17%
// Epic:      byte 3–12  → 10/256 ≈ 3.9%
// Rare:      byte 13–38 → 26/256 ≈ 10.2%
// Uncommon:  byte 39–102 → 64/256 = 25%
// Common:    byte 103–255 → 153/256 ≈ 59.8%
export const RARITY_TIERS: { tier: RarityTier; maxByte: number; weight: number }[] = [
  { tier: 'Legendary', maxByte: 2,   weight: 1  },
  { tier: 'Epic',      maxByte: 12,  weight: 4  },
  { tier: 'Rare',      maxByte: 38,  weight: 10 },
  { tier: 'Uncommon',  maxByte: 102, weight: 25 },
  { tier: 'Common',    maxByte: 255, weight: 60 },
];

// ── Trait category values ─────────────────────────────────────────────────────

const GENESIS_TIERS    = ['Founder', 'Pioneer', 'Builder', 'Contributor', 'Supporter'];
const PROTOCOL_SCORES  = ['Genesis Node', 'Chain Elder', 'Active Participant', 'Onboarded', 'Newcomer'];
const ASSET_CLASSES    = ['Gold + Land + Gov', 'Gold + Governance', 'Land Participant', 'Gold Holder', 'Governance Voter', 'Protocol Member'];
const BACKGROUNDS      = ['Obsidian Vault', 'Sovereign Navy', 'Forest Ledger', 'Midnight Treasury', 'Gilded Archive', 'Onyx Reserve', 'Charcoal Protocol'];
const FRAMES           = ['Gold Sovereign', 'Silver Architect', 'Bronze Builder', 'Iron Pioneer', 'Steel Contributor'];
const AURAS            = ['Auric Radiance', 'Sapphire Pulse', 'Emerald Current', 'Crimson Signal', 'Silver Halo', 'Void Resonance'];

// ── Trait output type ─────────────────────────────────────────────────────────

export interface NFTTraits {
  rarityTier:    RarityTier;
  rarityByte:    number;
  genesisTier:   string;
  protocolScore: string;
  assetClass:    string;
  background:    string;
  frame:         string;
  aura:          string;
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * Deterministically compute traits for a token from its keccak256 seed.
 * Seed is computed via computeSeed() which matches the on-chain formula:
 *   keccak256(abi.encodePacked(tokenId, contractAddress, deployBlock))
 * The seed is a 32-byte hex string (0x-prefixed).
 */
export function computeTraits(seed: string): NFTTraits {
  const buf = Buffer.from(seed.replace(/^0x/, ''), 'hex');

  function byte(offset: number): number {
    return buf[offset % buf.length];
  }

  function pick<T>(arr: T[], offset: number): T {
    return arr[byte(offset) % arr.length];
  }

  const rarityByte = byte(0);
  const rarityTier = scoreTier(rarityByte);

  return {
    rarityTier,
    rarityByte,
    genesisTier:   pick(GENESIS_TIERS,   1),
    protocolScore: pick(PROTOCOL_SCORES,  2),
    assetClass:    pick(ASSET_CLASSES,    3),
    background:    pick(BACKGROUNDS,      4),
    frame:         pick(FRAMES,           5),
    aura:          pick(AURAS,            6),
  };
}

/**
 * Map a raw byte (0–255) to a rarity tier.
 * Distribution: Legendary ~1%, Epic ~4%, Rare ~10%, Uncommon ~25%, Common ~60%.
 */
export function scoreTier(rarityByte: number): RarityTier {
  for (const { tier, maxByte } of RARITY_TIERS) {
    if (rarityByte <= maxByte) return tier;
  }
  return 'Common';
}

/**
 * Compute an off-chain seed that matches the on-chain keccak256 derivation.
 *
 * AxiomFounderBadge formula (ERC-721, includes minting wallet):
 *   keccak256(abi.encodePacked(uint256(tokenId), address(contract), uint256(deployBlock), address(owner)))
 *
 * AxiomParticipation / AxiomLandReceipt formula (ERC-1155, no on-chain seed):
 *   keccak256(abi.encodePacked(uint256(tokenId), address(contract), uint256(deployBlock)))
 *
 * @param tokenId       Token ID or parcel ID
 * @param contractAddress Contract address
 * @param deployBlock   Block number at which the contract was deployed
 * @param owner         Minting wallet address (required for ERC-721 FounderBadge; omit for ERC-1155)
 */
export function computeSeed(
  tokenId: number | string,
  contractAddress: string,
  deployBlock: number | string,
  owner?: string
): string {
  if (owner) {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['uint256', 'address', 'uint256', 'address'],
        [BigInt(tokenId), contractAddress, BigInt(deployBlock), owner]
      )
    );
  }
  return ethers.keccak256(
    ethers.solidityPacked(
      ['uint256', 'address', 'uint256'],
      [BigInt(tokenId), contractAddress, BigInt(deployBlock)]
    )
  );
}

/**
 * Convert traits to OpenSea attributes array format.
 */
export function traitsToAttributes(traits: NFTTraits) {
  return [
    { trait_type: 'Rarity',         value: traits.rarityTier                    },
    { trait_type: 'Rarity Byte',    value: traits.rarityByte, display_type: 'number' },
    { trait_type: 'Genesis Tier',   value: traits.genesisTier                   },
    { trait_type: 'Protocol Score', value: traits.protocolScore                 },
    { trait_type: 'Asset Class',    value: traits.assetClass                    },
    { trait_type: 'Background',     value: traits.background                    },
    { trait_type: 'Frame',          value: traits.frame                         },
    { trait_type: 'Aura',           value: traits.aura                          },
  ];
}

/**
 * Build a Gemini image prompt from traits.
 */
export function buildImagePrompt(tokenId: string | number, traits: NFTTraits, collectionName: string): string {
  const rarityDescriptors: Record<RarityTier, string> = {
    Legendary: 'an ultra-rare, ornate, cinematic',
    Epic:      'a premium, richly detailed',
    Rare:      'a striking, detailed',
    Uncommon:  'a polished, refined',
    Common:    'a clean, professional',
  };

  const descriptor = rarityDescriptors[traits.rarityTier];
  return [
    `Create ${descriptor} digital badge for the "${collectionName}" NFT collection on the Axiom Protocol blockchain platform.`,
    `Token #${tokenId}. Rarity: ${traits.rarityTier}.`,
    `Background style: ${traits.background}. Frame style: ${traits.frame}. Aura: ${traits.aura}.`,
    `Genesis Tier: ${traits.genesisTier}. Asset Class: ${traits.assetClass}.`,
    `Color palette: deep navy (#1B2B4B), forest green (#2D4A3E), muted gold (#C9A84C), pure white (#FAFAFA).`,
    `Style: institutional, sophisticated, geometric. No text or words. High contrast, sharp edges.`,
    `The badge should feel like a sovereign financial instrument — austere, prestigious, minimal.`,
  ].join(' ');
}

/**
 * Build an animation prompt for AI video generation (Legendary/Epic tier).
 */
export function buildAnimationPrompt(tokenId: string | number, traits: NFTTraits): string {
  const motionStyles: Record<RarityTier, string> = {
    Legendary: 'A cinematic, slow-rotating golden geometric mandala with particle light rays emanating outward. Deep navy background with floating golden dust. Looping 8-10 seconds.',
    Epic:      'An abstract floating badge with pulsing golden rings and emerald particle trails. Dark background, rich glow. Looping 6-8 seconds.',
    Rare:      'Subtle particle glow orbiting a central emblem. Navy background with golden highlights. Looping 4-5 seconds.',
    Uncommon:  'Gentle shimmer effect with slow light sweep across the badge surface. Looping 3-4 seconds.',
    Common:    'Soft breathing pulse with subtle edge glow. Looping 3 seconds.',
  };
  return motionStyles[traits.rarityTier];
}

/**
 * Generate an SVG/HTML animation for a token (used as animation_url when video is not available).
 * Returns an HTML string that animates using CSS — no external dependencies.
 */
export function generateAnimationHTML(tokenId: string | number, traits: NFTTraits): string {
  const colors: Record<RarityTier, { primary: string; accent: string; glow: string }> = {
    Legendary: { primary: '#C9A84C', accent: '#FFD700', glow: 'rgba(201,168,76,0.6)' },
    Epic:      { primary: '#7C3AED', accent: '#A855F7', glow: 'rgba(124,58,237,0.5)' },
    Rare:      { primary: '#2D6A4F', accent: '#52B788', glow: 'rgba(45,106,79,0.5)'  },
    Uncommon:  { primary: '#3B82F6', accent: '#60A5FA', glow: 'rgba(59,130,246,0.4)' },
    Common:    { primary: '#6B7280', accent: '#9CA3AF', glow: 'rgba(107,114,128,0.3)' },
  };

  const dur: Record<RarityTier, string> = {
    Legendary: '8s', Epic: '6s', Rare: '5s', Uncommon: '4s', Common: '3s',
  };

  const c = colors[traits.rarityTier];
  const d = dur[traits.rarityTier];
  const isLegendary = traits.rarityTier === 'Legendary';
  const isEpic = traits.rarityTier === 'Epic';
  const isRare = traits.rarityTier === 'Rare';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0D1117; width: 600px; height: 600px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .badge-container { position: relative; width: 500px; height: 500px; display: flex; align-items: center; justify-content: center; }
  .ring { position: absolute; border-radius: 50%; border: 2px solid ${c.primary}; animation: pulse ${d} ease-in-out infinite; }
  .ring-1 { width: 420px; height: 420px; animation-delay: 0s; opacity: 0.8; }
  .ring-2 { width: 360px; height: 360px; animation-delay: calc(${d} / 4); opacity: 0.6; border-color: ${c.accent}; }
  .ring-3 { width: 300px; height: 300px; animation-delay: calc(${d} / 2); opacity: 0.5; }
  .core { position: absolute; width: 240px; height: 240px; background: radial-gradient(circle at 40% 35%, #1B2B4B, #0D1117); border-radius: 50%; border: 3px solid ${c.primary}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px ${c.glow}, inset 0 0 30px rgba(0,0,0,0.5); animation: corePulse ${d} ease-in-out infinite; }
  .axiom-mark { font-family: serif; font-size: 48px; font-weight: 700; color: ${c.primary}; text-shadow: 0 0 20px ${c.glow}; animation: shimmer ${d} ease-in-out infinite; letter-spacing: 2px; }
  .rarity-label { position: absolute; bottom: 30px; font-family: monospace; font-size: 11px; color: ${c.accent}; letter-spacing: 4px; text-transform: uppercase; opacity: 0.9; }
  .token-id { position: absolute; top: 30px; font-family: monospace; font-size: 10px; color: ${c.primary}; opacity: 0.7; letter-spacing: 2px; }
  ${isLegendary ? `.particle { position: absolute; width: 3px; height: 3px; background: ${c.accent}; border-radius: 50%; animation: orbit ${d} linear infinite; }` : ''}
  ${isEpic ? `.trail { position: absolute; width: 2px; height: 2px; background: ${c.accent}; border-radius: 50%; animation: trail ${d} ease-in-out infinite; }` : ''}
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.04); opacity: 1; } }
  @keyframes corePulse { 0%, 100% { box-shadow: 0 0 40px ${c.glow}, inset 0 0 30px rgba(0,0,0,0.5); } 50% { box-shadow: 0 0 70px ${c.glow}, 0 0 100px ${c.glow}33, inset 0 0 20px rgba(0,0,0,0.3); } }
  @keyframes shimmer { 0%, 100% { text-shadow: 0 0 20px ${c.glow}; } 50% { text-shadow: 0 0 40px ${c.accent}, 0 0 60px ${c.glow}; } }
  ${isLegendary ? `@keyframes orbit { from { transform: rotate(0deg) translateX(210px) rotate(0deg); } to { transform: rotate(360deg) translateX(210px) rotate(-360deg); } }` : ''}
  ${isEpic || isRare ? `@keyframes trail { 0%, 100% { transform: scale(0.5); opacity: 0.3; } 50% { transform: scale(1.5); opacity: 1; } }` : ''}
</style>
</head>
<body>
  <div class="badge-container">
    <div class="ring ring-1"></div>
    <div class="ring ring-2"></div>
    <div class="ring ring-3"></div>
    ${isLegendary ? Array.from({length: 8}, (_,i) => `<div class="particle" style="animation-delay: ${i * (parseFloat(d)/8)}s; animation-duration: ${d};"></div>`).join('') : ''}
    ${isEpic ? Array.from({length: 6}, (_,i) => `<div class="trail" style="left: ${20 + i * 10}%; top: ${20 + i * 8}%; animation-delay: ${i * 0.5}s;"></div>`).join('') : ''}
    <div class="core">
      <div class="axiom-mark">AXM</div>
    </div>
    <div class="token-id">TOKEN #${tokenId}</div>
    <div class="rarity-label">${traits.rarityTier} · ${traits.genesisTier}</div>
  </div>
</body>
</html>`;
}
