import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS ?? '0x3fD63728288546AC41dAe3bf25ca383061c3A929';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiom-nexus.replit.app';

const BASE_METADATA_URI_FOUNDER      = `${SITE_URL}/api/nft/metadata/`;
const BASE_METADATA_URI_PARTICIPATION = `${SITE_URL}/api/nft/metadata/`;
const BASE_METADATA_URI_LAND         = `${SITE_URL}/api/nft/metadata/`;

const CONTRACT_URI_FOUNDER      = `${SITE_URL}/api/nft/contract-metadata/`;
const CONTRACT_URI_PARTICIPATION = `${SITE_URL}/api/nft/contract-metadata/`;
const CONTRACT_URI_LAND         = `${SITE_URL}/api/nft/contract-metadata/`;

const OUTPUT_FILE = path.join(__dirname, 'deployment-output.json');

async function main() {
  console.log('='.repeat(60));
  console.log('AXIOM NFT SYSTEM — FULL DEPLOYMENT');
  console.log('='.repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log('\nDeployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');
  console.log('Treasury:', TREASURY_ADDRESS);
  console.log('Site URL:', SITE_URL);

  // ── AxiomFounderBadge ──────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Deploying AxiomFounderBadge (ERC-721, soulbound, 100 cap)...');
  const FounderBadge = await ethers.getContractFactory('AxiomFounderBadge');
  const founderBadge = await FounderBadge.deploy(
    deployer.address,
    deployer.address,
    TREASURY_ADDRESS,
    BASE_METADATA_URI_FOUNDER,
    CONTRACT_URI_FOUNDER + deployer.address,
  );
  await founderBadge.waitForDeployment();
  const founderAddress = await founderBadge.getAddress();
  console.log('AxiomFounderBadge:', founderAddress);
  const founderDeployBlock = await ethers.provider.getBlockNumber();

  // ── AxiomParticipation ─────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Deploying AxiomParticipation (ERC-1155, 6 token types)...');
  const Participation = await ethers.getContractFactory('AxiomParticipation');
  const participation = await Participation.deploy(
    deployer.address,
    deployer.address,
    TREASURY_ADDRESS,
    BASE_METADATA_URI_PARTICIPATION,
    CONTRACT_URI_PARTICIPATION + deployer.address,
  );
  await participation.waitForDeployment();
  const participationAddress = await participation.getAddress();
  console.log('AxiomParticipation:', participationAddress);
  const participationDeployBlock = await ethers.provider.getBlockNumber();

  // ── AxiomLandReceipt ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Deploying AxiomLandReceipt (ERC-1155, per-property)...');
  const LandReceipt = await ethers.getContractFactory('AxiomLandReceipt');
  const landReceipt = await LandReceipt.deploy(
    deployer.address,
    deployer.address,
    TREASURY_ADDRESS,
    BASE_METADATA_URI_LAND,
    CONTRACT_URI_LAND + deployer.address,
  );
  await landReceipt.waitForDeployment();
  const landAddress = await landReceipt.getAddress();
  console.log('AxiomLandReceipt:', landAddress);
  const landDeployBlock = await ethers.provider.getBlockNumber();

  // ── Update contract URIs with actual addresses ─────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Updating contractURIs with deployed addresses...');

  await (await founderBadge.setContractURI(`${CONTRACT_URI_FOUNDER}${founderAddress}`)).wait();
  await (await participation.setContractURI(`${CONTRACT_URI_PARTICIPATION}${participationAddress}`)).wait();
  await (await landReceipt.setContractURI(`${CONTRACT_URI_LAND}${landAddress}`)).wait();
  console.log('contractURIs updated');

  // ── Output ─────────────────────────────────────────────────────────────────
  const output = {
    network:        'arbitrum-one',
    deployedAt:     new Date().toISOString(),
    deployer:       deployer.address,
    treasury:       TREASURY_ADDRESS,
    contracts: {
      AxiomFounderBadge: {
        address:     founderAddress,
        deployBlock: founderDeployBlock,
        type:        'ERC-721 Soulbound',
        maxSupply:   100,
      },
      AxiomParticipation: {
        address:     participationAddress,
        deployBlock: participationDeployBlock,
        type:        'ERC-1155',
        tokenTypes:  6,
      },
      AxiomLandReceipt: {
        address:     landAddress,
        deployBlock: landDeployBlock,
        type:        'ERC-1155 Per-Parcel',
        defaultCap:  1000,
      },
    },
    envVarsNeeded: {
      NFT_CONTRACT_FOUNDER:       founderAddress,
      NFT_CONTRACT_PARTICIPATION: participationAddress,
      NFT_CONTRACT_LAND:          landAddress,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('\nOutput written to:', OUTPUT_FILE);
  console.log('\nSet these environment variables:');
  console.log(`  NFT_CONTRACT_FOUNDER=${founderAddress}`);
  console.log(`  NFT_CONTRACT_PARTICIPATION=${participationAddress}`);
  console.log(`  NFT_CONTRACT_LAND=${landAddress}`);
  console.log('\n' + JSON.stringify(output.contracts, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
