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
 * Hollywood Studio quality, ultra cinematic, ultra photorealistic image prompts.
 * Each rarity tier has a completely distinct visual world — not variations of the same badge.
 * Prompts use professional photography and cinematography language to extract peak quality
 * from gpt-image-1.
 */
const RARITY_VISUAL_CONCEPTS: Record<RarityTier, (traits: NFTTraits, tokenId: string | number, collection: string) => string> = {

  Legendary: (traits, tokenId) => `
Ultra cinematic aerial photography, shot from a helicopter at 3,000 feet during the golden hour
just before sunset. A vast sovereign land territory stretches below — ancient forests meeting
coastline, a winding river catching the last amber light. Laser-etched gold boundary lines glow
across the landscape like living circuits, defining the perimeter of a new autonomous territory.
At the center of the frame, impossibly large, a monolithic obsidian seal the size of a city block
rises from the earth — octagonal, carved with millimeter-precision geometric glyphs, its surface
inlaid with rivers of molten 24-karat gold. The Axiom "A" sigil blazes at its core like a second
sun. Atmospheric volumetric god-rays pierce through scattered clouds above. ${traits.aura} light
corona halos the seal. The sky transitions from deep cobalt at zenith to pure liquid gold at the
horizon. Shot on ARRI Alexa 65, Zeiss Master Prime 21mm, f/2.8, ISO 800. 8K resolution,
IMAX aspect ratio cropped to square. Photorealistic, physically-based rendering. Epic scale.
No text. No watermarks. Awe-inspiring sovereign majesty. Token ${tokenId}.
`.trim(),

  Epic: (traits, tokenId) => `
Extreme close-up macro photography of a masterwork institutional medallion, shot in a professional
product photography studio with a large-format Hasselblad H6D-400c and 120mm macro lens.
The medallion is hand-cast in solid 18-karat gold and patinated aged bronze, 6 inches in diameter,
resting on a surface of polished obsidian stone. Dramatic three-point studio lighting with a
large octabox key light raking across the surface at 15 degrees, creating deep shadows in every
engraved groove. The centerpiece: an upward-pointing equilateral triangle inset with genuine
emerald chip mosaic, surrounded by an interlocking hexagonal border of 24 individual faceted
sapphires. The outer ring carries micro-engraved chain-link hash symbols, each thinner than a
human hair, visible under the macro lens. ${traits.aura} practical light effect glows within
the stone insets. Background: ${traits.background.toLowerCase()} seamless backdrop, deep and velvety.
Depth of field: tack sharp on center, bokeh at edges. ISO 50, f/11, 1/60s. Photorealistic.
Hyper-detailed metalworking texture. No text. Token ${tokenId}.
`.trim(),

  Rare: (traits, tokenId) => `
Architectural interior photography of a grand 1920s Art Deco institutional vault, captured on a
Phase One IQ4 150MP technical camera with 40mm Rodenstock lens, perspective corrected, f/16.
The chamber walls are hand-laid black Belgian marble with gold inlay geometric patterns soaring
thirty feet to a coffered ceiling painted midnight navy. At the far end, mounted on a backlit
alabaster panel, a monumental crest carved from platinum-coated brass: a stylized "A" monogram
composed of architectural chevrons and ruled lines, flanked by symmetrical eagle-wing buttresses.
Fine sunburst lines radiate from the crest like a stock certificate engraving — hundreds of
hairline grooves catching the warm tungsten light from hidden coves. ${traits.frame.toLowerCase()}
framing elements border the composition. ${traits.aura} practical glow from the alabaster backlight.
Rich chiaroscuro lighting — deep blacks, brilliant specular highlights on every gold edge.
Photorealistic. Ultra-detailed architectural photography. Institutional grandeur. No people.
No text. Token ${tokenId}.
`.trim(),

  Uncommon: (traits, tokenId) => `
Professional product photography of a precision-engineered sovereign protocol badge, shot on
Sony Alpha 1 with 90mm G Master macro lens, f/8, studio strobe lighting with softbox and
silver reflector fill. The badge is CNC-machined from solid aerospace-grade titanium, 3.5 inches
across, surface-brushed with directional grain, resting on dark charcoal suede. The face of the
badge features a symmetrical geometric composition laser-etched at 0.01mm precision: a diamond
nested inside a hexagon, inside a circle, with fine measurement hairlines and corner registration
marks — the vocabulary of technical engineering drawings brought into metal. At center, an abstract
land-parcel emblem: a bold vertical axis crossed by horizontal strata lines suggesting geological
survey cross-sections. Every line catches the strobe light as a brilliant specular thread.
${traits.frame} machined border ring. ${traits.aura} subtle edge-lighting effect.
Background: ${traits.background.toLowerCase()} surface. ISO 100, tack-sharp focus, zero distortion.
Photorealistic. Cold, precise, confident. No text. No decorative elements. Token ${tokenId}.
`.trim(),

  Common: (traits, tokenId) => `
Clean editorial product photography of an institutional membership coin, captured on Canon EOS R5
with 100mm L macro lens, f/8, single large softbox from upper left, white reflector fill from
right. The coin is minted from .999 fine silver, 2.5 inches diameter, proof finish — mirror-bright
fields against frosted design elements. The obverse design: a bold hexagonal emblem on a mirrored
field. Inside the hexagon, a minimal geometric mark — upward equilateral triangle bisected by a
single horizontal rule — frosted silver against the polished background, crisp as a razorblade.
Fine tick marks at each vertex of the hexagon border. A thin orbit ring circles the hex at a
precise 3mm clearance. The coin rests on ${traits.background.toLowerCase()} luxury fabric, slightly
angled to catch the key light across the frosted geometry. ${traits.aura} catchlight reflected
in the mirror fields. ISO 100, f/8, 1/125s, studio strobe. Photorealistic. Mint-state proof
coin photography. No text engraving visible. No imperfections. Token ${tokenId}.
`.trim(),

};

export function buildImagePrompt(tokenId: string | number, traits: NFTTraits, collectionName: string): string {
  const conceptFn = RARITY_VISUAL_CONCEPTS[traits.rarityTier];
  const concept   = conceptFn(traits, tokenId, collectionName);

  return [
    concept,
    `NFT Collection: ${collectionName} — Axiom Protocol Sovereign Digital-Physical Economy.`,
    `Genesis Tier: ${traits.genesisTier}. Asset Class: ${traits.assetClass}.`,
    `Square 1:1 format, 1024x1024. Hollywood studio quality. Ultra photorealistic. Award-winning commercial photography.`,
    `No watermarks. No AI-looking artifacts. No cartoonish elements. Physically accurate lighting and materials.`,
  ].join('\n');
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
  html, body { width: 100%; height: 100%; }
  body { background: #0D1117; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .badge-container { position: relative; width: 500px; height: 500px; display: flex; align-items: center; justify-content: center; transform: scale(calc(min(100vw, 100vh) / 600px)); transform-origin: center center; flex-shrink: 0; }
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
