/**
 * NFT Artwork Generation Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates AI artwork for Axiom Protocol NFT collections using Gemini, pins
 * each image to IPFS via Pinata, and stores the CID in nft_tokens.image_cid.
 * The base64 dataUrl is also stored in nft_tokens.image_data as a local cache.
 * IPFS pinning is mandatory — a token is not marked successful without a CID.
 *
 * Usage:
 *   npx ts-node scripts/nft/generate-artwork.ts --contract founder --tokens 1-10
 *   npx ts-node scripts/nft/generate-artwork.ts --contract participation --tokens 1,2,3
 *   npx ts-node scripts/nft/generate-artwork.ts --contract land --tokens 1-5 --dry-run
 *
 * Environment (required):
 *   GEMINI_API_KEY        — Google AI Studio API key
 *   PINATA_JWT            — Pinata API JWT for IPFS pinning
 *   DATABASE_URL          — PostgreSQL connection string
 */

import * as path from 'path';
import * as fs from 'fs';
import { GoogleGenAI, Modality } from '@google/genai';
import {
  computeSeed,
  computeTraits,
  buildImagePrompt,
  NFTTraits,
  RarityTier,
} from '../../lib/nft/traitEngine';
import { ensureNFTTables, upsertNFTToken } from '../../lib/nft/db';

// ── Contract config ───────────────────────────────────────────────────────────

interface ContractConfig {
  name: string;
  displayName: string;
  address: string;
  deployBlock: number;
  type: 'ERC721' | 'ERC1155';
  maxTokens: number;
}

const DEPLOYMENT = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'deployment-output.json'), 'utf8')
);

const CONTRACTS: Record<string, ContractConfig> = {
  founder: {
    name: 'AxiomFounderBadge',
    displayName: 'Axiom Founder Badge',
    address: DEPLOYMENT.contracts.AxiomFounderBadge.address,
    deployBlock: DEPLOYMENT.contracts.AxiomFounderBadge.deployBlock,
    type: 'ERC721',
    maxTokens: 100,
  },
  participation: {
    name: 'AxiomParticipation',
    displayName: 'Axiom Participation',
    address: DEPLOYMENT.contracts.AxiomParticipation.address,
    deployBlock: DEPLOYMENT.contracts.AxiomParticipation.deployBlock,
    type: 'ERC1155',
    maxTokens: 6,
  },
  land: {
    name: 'AxiomLandReceipt',
    displayName: 'Axiom Land Receipt',
    address: DEPLOYMENT.contracts.AxiomLandReceipt.address,
    deployBlock: DEPLOYMENT.contracts.AxiomLandReceipt.deployBlock,
    type: 'ERC1155',
    maxTokens: 1000,
  },
};

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs(): { contract: string; tokens: number[]; dryRun: boolean } {
  const args = process.argv.slice(2);
  let contract = '';
  let tokensArg = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--contract' && args[i + 1]) contract = args[++i];
    else if (args[i] === '--tokens' && args[i + 1]) tokensArg = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
  }

  if (!contract || !CONTRACTS[contract]) {
    console.error(`\n❌  --contract must be one of: ${Object.keys(CONTRACTS).join(', ')}`);
    process.exit(1);
  }

  if (!tokensArg) {
    console.error('❌  --tokens is required (e.g. --tokens 1-10 or --tokens 1,3,5)');
    process.exit(1);
  }

  // Parse "1-10" or "1,3,5" or "7"
  let tokens: number[] = [];
  if (tokensArg.includes('-')) {
    const [start, end] = tokensArg.split('-').map(Number);
    for (let i = start; i <= end; i++) tokens.push(i);
  } else {
    tokens = tokensArg.split(',').map(Number);
  }

  const cfg = CONTRACTS[contract];
  tokens = tokens.filter((t) => t >= 1 && t <= cfg.maxTokens);
  if (tokens.length === 0) {
    console.error(`❌  No valid token IDs for ${contract} (max: ${cfg.maxTokens})`);
    process.exit(1);
  }

  return { contract, tokens, dryRun };
}

// ── Gemini image generation ───────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash-image';

function makeGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateImageBase64(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    const textPart = candidate?.content?.parts?.find(
      (p: { text?: string }) => p.text
    );
    throw new Error(
      `Gemini returned no image. Response text: ${textPart?.text ?? 'none'}`
    );
  }

  const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
  const base64 = imagePart.inlineData.data;
  return { base64, mimeType, dataUrl: `data:${mimeType};base64,${base64}` };
}

// ── Mandatory IPFS upload via Pinata ─────────────────────────────────────────

const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Upload an image buffer to IPFS via Pinata.
 * Throws if PINATA_JWT is missing or the upload fails — IPFS pinning is
 * mandatory for this pipeline; a token is not considered complete without a CID.
 */
async function uploadToIPFS(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT environment variable is not set');
  }

  // Build multipart/form-data body using Node's built-in FormData (Node 18+)
  // or the undici FormData available in the Next.js runtime.
  const form = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
  form.append('file', blob, filename);
  form.append(
    'pinataMetadata',
    JSON.stringify({ name: filename })
  );
  form.append(
    'pinataOptions',
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await fetch(PINATA_PIN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  if (!data.IpfsHash) {
    throw new Error(`Pinata response missing IpfsHash: ${JSON.stringify(data)}`);
  }
  return data.IpfsHash;
}

// ── Rarity colour codes for terminal output ───────────────────────────────────

const RARITY_COLOUR: Record<RarityTier, string> = {
  Legendary: '\x1b[33m', // gold
  Epic:      '\x1b[35m', // magenta
  Rare:      '\x1b[36m', // cyan
  Uncommon:  '\x1b[34m', // blue
  Common:    '\x1b[37m', // white
};
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';

function colourTier(tier: RarityTier): string {
  return `${RARITY_COLOUR[tier]}${tier}${RESET}`;
}

// ── Sleep helper ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { contract: contractKey, tokens, dryRun } = parseArgs();
  const cfg = CONTRACTS[contractKey];

  console.log('\n' + '═'.repeat(60));
  console.log(` Axiom NFT Artwork Generator`);
  console.log('═'.repeat(60));
  console.log(` Collection : ${cfg.displayName}`);
  console.log(` Contract   : ${cfg.address}`);
  console.log(` Tokens     : ${tokens[0]}–${tokens[tokens.length - 1]} (${tokens.length} total)`);
  console.log(` Model      : ${GEMINI_MODEL}`);
  console.log(` Mode       : ${dryRun ? '🔍 DRY RUN (no API calls, no DB writes)' : '🚀 LIVE'}`);
  console.log('═'.repeat(60) + '\n');

  if (dryRun) {
    // Preview prompts only
    for (const tokenId of tokens) {
      const seed = computeSeed(tokenId, cfg.address, cfg.deployBlock);
      const traits = computeTraits(seed);
      const prompt = buildImagePrompt(tokenId, traits, cfg.displayName);
      console.log(`Token #${tokenId} — ${colourTier(traits.rarityTier)}`);
      console.log(`${DIM}Seed: ${seed}${RESET}`);
      console.log(`Prompt: ${prompt}\n`);
    }
    console.log(`${DIM}Dry run complete — no images generated.${RESET}\n`);
    return;
  }

  // Validate required keys before starting
  if (!process.env.GEMINI_API_KEY) {
    console.error(`${RED}❌  GEMINI_API_KEY is not set.${RESET}`);
    process.exit(1);
  }
  if (!process.env.PINATA_JWT) {
    console.error(`${RED}❌  PINATA_JWT is not set. IPFS pinning is mandatory.${RESET}`);
    process.exit(1);
  }

  // Ensure DB tables exist
  await ensureNFTTables();

  const ai = makeGeminiClient();

  const results: {
    tokenId: number;
    rarityTier: RarityTier;
    status: 'ok' | 'error';
    imageCid: string | null;
    imageStored: boolean;
    error?: string;
  }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tokenId = tokens[i];
    process.stdout.write(`[${i + 1}/${tokens.length}] Token #${tokenId} — `);

    const seed   = computeSeed(tokenId, cfg.address, cfg.deployBlock);
    const traits = computeTraits(seed);
    const prompt = buildImagePrompt(tokenId, traits, cfg.displayName);

    process.stdout.write(`${colourTier(traits.rarityTier)} … `);

    try {
      // Generate image
      const { base64, mimeType, dataUrl } = await generateImageBase64(ai, prompt);

      // Upload to IPFS via Pinata (mandatory — throws on failure)
      const imageBuffer = Buffer.from(base64, 'base64');
      const filename    = `axiom-nft-${contractKey}-${tokenId}.png`;
      const ipfsCid     = await uploadToIPFS(imageBuffer, filename, mimeType);

      // Upsert into DB with the real IPFS CID
      await upsertNFTToken({
        tokenId,
        contractAddress: cfg.address,
        contractType:    cfg.type,
        traitSeed:       seed,
        rarityTier:      traits.rarityTier,
        rarityScore:     traits.rarityByte,
        traitsJson:      traits as unknown as object,
        imageCid:        ipfsCid,
        imageData:       dataUrl,
      });

      console.log(`${GREEN}✓${RESET}  IPFS: ${ipfsCid}`);

      results.push({
        tokenId,
        rarityTier:  traits.rarityTier,
        status:      'ok',
        imageCid:    ipfsCid,
        imageStored: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${RED}✗ FAILED${RESET}  ${msg}`);
      results.push({
        tokenId,
        rarityTier:  computeTraits(computeSeed(tokenId, cfg.address, cfg.deployBlock)).rarityTier,
        status:      'error',
        imageCid:    null,
        imageStored: false,
        error:       msg,
      });
    }

    // Rate-limit: 2 s between calls (avoid Gemini quota)
    if (i < tokens.length - 1) await sleep(2000);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const succeeded = results.filter((r) => r.status === 'ok').length;
  const failed    = results.filter((r) => r.status === 'error').length;
  const pinned    = results.filter((r) => r.imageCid !== null).length;

  console.log('\n' + '─'.repeat(60));
  console.log(` Summary`);
  console.log('─'.repeat(60));
  console.log(` Processed    : ${results.length}`);
  console.log(` ${GREEN}Succeeded${RESET}    : ${succeeded}`);
  if (failed > 0) console.log(` ${RED}Failed${RESET}       : ${failed}`);
  console.log(` IPFS pinned  : ${pinned}/${results.length}`);

  // Rarity breakdown
  const tierCounts: Partial<Record<RarityTier, number>> = {};
  for (const r of results.filter((r) => r.status === 'ok')) {
    tierCounts[r.rarityTier] = (tierCounts[r.rarityTier] ?? 0) + 1;
  }
  if (Object.keys(tierCounts).length > 0) {
    console.log('\n Rarity distribution (generated):');
    for (const [tier, count] of Object.entries(tierCounts)) {
      console.log(`   ${colourTier(tier as RarityTier).padEnd(24)} ${count}`);
    }
  }

  if (failed > 0) {
    console.log(`\n${RED}Failures:${RESET}`);
    for (const r of results.filter((r) => r.status === 'error')) {
      console.log(`  Token #${r.tokenId}: ${r.error}`);
    }
  }

  // Save results JSON
  const outFile = path.join(
    __dirname,
    `artwork-results-${contractKey}-${Date.now()}.json`
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify({ collection: cfg.displayName, contract: cfg.address, results }, null, 2)
  );
  console.log(`\n${DIM}Results saved to ${path.basename(outFile)}${RESET}`);
  console.log('─'.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err instanceof Error ? err.message : err);
  process.exit(1);
});
