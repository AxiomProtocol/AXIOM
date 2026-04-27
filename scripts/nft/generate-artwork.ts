/**
 * NFT Artwork Generation Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates AI artwork for Axiom Protocol NFT collections using Gemini, stores
 * base64 image data in nft_tokens.image_data, and optionally pins to IPFS via
 * Storacha w3up when W3UP_SPACE_DID + W3UP_EMAIL env vars are set.
 *
 * Usage:
 *   npx ts-node scripts/nft/generate-artwork.ts --contract founder --tokens 1-10
 *   npx ts-node scripts/nft/generate-artwork.ts --contract participation --tokens 1,2,3
 *   npx ts-node scripts/nft/generate-artwork.ts --contract land --tokens 1-5 --dry-run
 *
 * Environment (required):
 *   GEMINI_API_KEY        — Google AI Studio API key
 *   DATABASE_URL          — PostgreSQL connection string
 *
 * Environment (optional — IPFS pinning):
 *   W3UP_SPACE_DID        — Storacha space DID (did:key:z6Mk...)
 *   W3UP_EMAIL            — Email address registered with web3.storage
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

// ── Optional IPFS upload via Storacha w3up ────────────────────────────────────

async function tryUploadToIPFS(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string | null> {
  const spaceDid = process.env.W3UP_SPACE_DID;
  const email = process.env.W3UP_EMAIL;

  if (!spaceDid || !email) {
    return null;
  }

  try {
    // Dynamic import — @web3-storage/w3up-client is optional
    const { create } = await import('@web3-storage/w3up-client' as string);
    const client = await create();
    await client.login(email as `${string}@${string}`);
    await client.setCurrentSpace(spaceDid as `did:${string}:${string}`);
    const file = new File([new Uint8Array(imageBuffer)], filename, { type: mimeType });
    const cid = await client.uploadFile(file);
    return cid.toString();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    ⚠  IPFS upload skipped: ${msg}`);
    return null;
  }
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

  // Validate Gemini key before starting
  if (!process.env.GEMINI_API_KEY) {
    console.error(`${RED}❌  GEMINI_API_KEY is not set.${RESET}`);
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

      // Try IPFS upload (optional)
      const imageBuffer = Buffer.from(base64, 'base64');
      const filename    = `axiom-nft-${contractKey}-${tokenId}.png`;
      const ipfsCid     = await tryUploadToIPFS(imageBuffer, filename, mimeType);

      // Upsert into DB
      await upsertNFTToken({
        tokenId,
        contractAddress: cfg.address,
        contractType:    cfg.type,
        traitSeed:       seed,
        rarityTier:      traits.rarityTier,
        rarityScore:     traits.rarityByte,
        traitsJson:      traits as unknown as object,
        imageCid:        ipfsCid ?? undefined,
        imageData:       dataUrl,
      });

      const ipfsNote = ipfsCid
        ? `${GREEN}IPFS: ${ipfsCid.slice(0, 16)}…${RESET}`
        : `${DIM}base64 stored${RESET}`;

      console.log(`${GREEN}✓${RESET}  ${ipfsNote}`);

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
  console.log(` Processed : ${results.length}`);
  console.log(` ${GREEN}Succeeded${RESET} : ${succeeded}`);
  if (failed > 0) console.log(` ${RED}Failed${RESET}    : ${failed}`);
  console.log(` IPFS pinned : ${pinned} (${results.length - pinned} stored as base64)`);

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
