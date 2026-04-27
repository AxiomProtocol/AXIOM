/**
 * Check on-chain metadata URIs and mint anchor tokens for OpenSea listing.
 *
 * Steps:
 *   1. Read baseMetadataURI + contractMetadataURI for all 3 contracts.
 *   2. If any baseMetadataURI does not match the canonical production URL,
 *      call setBaseURI() to align it.
 *   3. Mint Founder Badge #1 to deployer (anchor — required for OpenSea
 *      collection page to render at least one item).
 *   4. Mint Participation tokenId=1 (Identity Registration) qty=1 to deployer.
 *   5. SKIP Land — no parcel onboarded yet, mint per-parcel later.
 *   6. Append "anchorMints" block to deployment-output.json.
 *
 * Idempotent: safe to re-run. Skips minting if anchor already minted.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... ALCHEMY_API_KEY=... \
 *     npx ts-node scripts/nft/check-and-mint-anchors.ts
 *   # Add --dry-run to read-only verify without sending transactions.
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const PROD_BASE_URI         = 'https://axiom-nexus.replit.app/api/nft/metadata/';
const PROD_CONTRACT_URI_PFX = 'https://axiom-nexus.replit.app/api/nft/contract-metadata/';

const OUTPUT_FILE = path.join(__dirname, 'deployment-output.json');
const DEPLOYMENT  = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));

const FOUNDER_ABI = [
  'function baseMetadataURI() view returns (string)',
  'function contractMetadataURI() view returns (string)',
  'function setBaseURI(string newURI) external',
  'function setContractURI(string newURI) external',
  'function totalMinted() view returns (uint256)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function mint(address to, uint256 tokenId) external',
  'function MINTER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const PARTICIPATION_ABI = [
  'function baseMetadataURI() view returns (string)',
  'function contractMetadataURI() view returns (string)',
  'function setBaseURI(string newURI) external',
  'function setContractURI(string newURI) external',
  'function totalSupply(uint256 tokenId) view returns (uint256)',
  'function maxSupply(uint256 tokenId) view returns (uint256)',
  'function tokenActive(uint256 tokenId) view returns (bool)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function mint(address to, uint256 tokenId, uint256 amount) external',
];

const LAND_ABI = [
  'function baseMetadataURI() view returns (string)',
  'function contractMetadataURI() view returns (string)',
  'function setBaseURI(string newURI) external',
  'function setContractURI(string newURI) external',
];

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const apiKey = process.env.ALCHEMY_API_KEY;
  const pk     = process.env.DEPLOYER_PRIVATE_KEY;
  if (!apiKey) throw new Error('ALCHEMY_API_KEY missing');
  if (!pk)     throw new Error('DEPLOYER_PRIVATE_KEY missing');

  const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer   = new ethers.Wallet(pk, provider);
  const deployer = await signer.getAddress();

  const founderAddr       = DEPLOYMENT.contracts.AxiomFounderBadge.address;
  const participationAddr = DEPLOYMENT.contracts.AxiomParticipation.address;
  const landAddr          = DEPLOYMENT.contracts.AxiomLandReceipt.address;

  console.log('='.repeat(60));
  console.log('AXIOM NFT — Anchor Mint & URI Check');
  console.log('='.repeat(60));
  console.log('Deployer:', deployer);
  console.log('Mode    :', DRY_RUN ? 'DRY RUN (read-only)' : 'LIVE (will broadcast)');
  console.log('Network : Arbitrum One');
  console.log('');

  const balance = await provider.getBalance(deployer);
  console.log('Deployer ETH balance:', ethers.formatEther(balance), 'ETH');
  if (balance < ethers.parseEther('0.0005')) {
    console.warn('WARNING: deployer balance is low; mint txs may fail');
  }

  const founder       = new ethers.Contract(founderAddr,       FOUNDER_ABI,       signer);
  const participation = new ethers.Contract(participationAddr, PARTICIPATION_ABI, signer);
  const land          = new ethers.Contract(landAddr,          LAND_ABI,          signer);

  // ── 1. Read on-chain URIs ──────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Reading on-chain metadata URIs...');
  const [
    fBase, fContract,
    pBase, pContract,
    lBase, lContract,
  ] = await Promise.all([
    founder.baseMetadataURI(),       founder.contractMetadataURI(),
    participation.baseMetadataURI(), participation.contractMetadataURI(),
    land.baseMetadataURI(),          land.contractMetadataURI(),
  ]);

  const uris = [
    { name: 'Founder',       contract: founder,       address: founderAddr,       base: fBase, contractURI: fContract },
    { name: 'Participation', contract: participation, address: participationAddr, base: pBase, contractURI: pContract },
    { name: 'Land',          contract: land,          address: landAddr,          base: lBase, contractURI: lContract },
  ];

  for (const u of uris) {
    console.log(`\n${u.name}:`);
    console.log(`  baseMetadataURI    : ${u.base}`);
    console.log(`  contractMetadataURI: ${u.contractURI}`);
  }

  // ── 2. Align URIs if needed ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Verifying URIs match canonical production URL...');
  const uriUpdates: Record<string, string> = {};

  for (const u of uris) {
    const expectedContractURI = `${PROD_CONTRACT_URI_PFX}${u.address}`;
    if (u.base !== PROD_BASE_URI) {
      console.log(`  ${u.name}: baseMetadataURI MISMATCH`);
      console.log(`    on-chain: ${u.base}`);
      console.log(`    expected: ${PROD_BASE_URI}`);
      if (!DRY_RUN) {
        const tx = await u.contract.setBaseURI(PROD_BASE_URI);
        const r = await tx.wait();
        console.log(`    setBaseURI tx: ${r.hash}`);
        uriUpdates[`${u.name}_setBaseURI`] = r.hash;
      }
    } else {
      console.log(`  ${u.name}: baseMetadataURI OK`);
    }
    if (u.contractURI !== expectedContractURI) {
      console.log(`  ${u.name}: contractMetadataURI MISMATCH`);
      console.log(`    on-chain: ${u.contractURI}`);
      console.log(`    expected: ${expectedContractURI}`);
      if (!DRY_RUN) {
        const tx = await u.contract.setContractURI(expectedContractURI);
        const r = await tx.wait();
        console.log(`    setContractURI tx: ${r.hash}`);
        uriUpdates[`${u.name}_setContractURI`] = r.hash;
      }
    } else {
      console.log(`  ${u.name}: contractMetadataURI OK`);
    }
  }

  // ── 3. Mint anchor: Founder #1 to deployer ────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Anchor mint: Founder Badge #1 → deployer...');
  const anchorMints: Record<string, string> = {};

  let founderAnchorMinted = false;
  let founderAnchorTx     = '';
  try {
    const owner = await founder.ownerOf(1);
    console.log(`  Founder #1 already minted, owner: ${owner}`);
    founderAnchorMinted = true;
  } catch {
    if (DRY_RUN) {
      console.log('  Founder #1 not minted (dry run — skipping)');
    } else {
      const minterRole = await founder.MINTER_ROLE();
      const ok = await founder.hasRole(minterRole, deployer);
      if (!ok) throw new Error('Deployer lacks MINTER_ROLE on Founder Badge');
      const tx = await founder.mint(deployer, 1, { gasLimit: 350_000 });
      const r  = await tx.wait();
      founderAnchorTx     = r.hash;
      founderAnchorMinted = true;
      anchorMints.AxiomFounderBadge_anchor = r.hash;
      console.log(`  Founder #1 minted to ${deployer}`);
      console.log(`  tx: ${r.hash}`);
    }
  }

  // ── 4. Mint anchor: Participation tokenId=1 qty=1 to deployer ─────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Anchor mint: Participation tokenId=1 (Identity) qty=1 → deployer...');
  const existingBal = await participation.balanceOf(deployer, 1);
  if (existingBal > 0n) {
    console.log(`  Already holds ${existingBal} of tokenId=1; skipping`);
  } else if (DRY_RUN) {
    console.log('  Would mint 1 unit of tokenId=1 (dry run — skipping)');
  } else {
    const isActive = await participation.tokenActive(1);
    if (!isActive) throw new Error('Participation tokenId=1 not active');
    const tx = await participation.mint(deployer, 1, 1, { gasLimit: 250_000 });
    const r  = await tx.wait();
    anchorMints.AxiomParticipation_anchor_tokenId_1 = r.hash;
    console.log(`  Minted 1× tokenId=1 to ${deployer}`);
    console.log(`  tx: ${r.hash}`);
  }

  // ── 5. Skip Land ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Land Receipt: SKIPPING anchor mint (no parcel onboarded yet)');
  console.log('  — listings will appear once first parcel is registered.');

  // ── 6. Persist results ─────────────────────────────────────────────────────
  if (!DRY_RUN && (Object.keys(anchorMints).length > 0 || Object.keys(uriUpdates).length > 0)) {
    DEPLOYMENT.anchorMints  = { ...(DEPLOYMENT.anchorMints  ?? {}), ...anchorMints };
    DEPLOYMENT.uriUpdates   = { ...(DEPLOYMENT.uriUpdates   ?? {}), ...uriUpdates };
    DEPLOYMENT.anchorMintAt = new Date().toISOString();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(DEPLOYMENT, null, 2));
    console.log(`\nUpdated ${OUTPUT_FILE}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
  if (founderAnchorMinted) {
    console.log('Founder Badge #1: minted (soulbound — deployer holds permanently)');
  }
  console.log('OpenSea Founder      :', `https://opensea.io/assets/arbitrum/${founderAddr.toLowerCase()}/1`);
  console.log('OpenSea Participation:', `https://opensea.io/assets/arbitrum/${participationAddr.toLowerCase()}/1`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
