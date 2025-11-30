/**
 * Universe Blockchain - Testnet Deployment Script
 * 
 * This script deploys Universe Blockchain to Arbitrum Sepolia testnet
 * using the Arbitrum Orbit SDK with AXM as the native gas token.
 * 
 * Prerequisites:
 * 1. 1.2 testnet ETH on Arbitrum Sepolia (deployer wallet)
 * 2. AXM test token deployed on Arbitrum Sepolia (18 decimals)
 * 3. .env file configured with all required addresses
 * 
 * Usage:
 *   npm run deploy:testnet
 */

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  prepareChainConfig,
  createRollupPrepareDeploymentParamsConfig,
  createRollup,
} from '@arbitrum/orbit-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  'DEPLOYER_PRIVATE_KEY',
  'UNIVERSE_OWNER_ADDRESS',
  'VALIDATOR_ADDRESS',
  'BATCH_POSTER_ADDRESS',
  'AXM_TOKEN_ADDRESS',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

async function deployUniverseTestnet() {
  console.log('🌌 Universe Blockchain - Testnet Deployment');
  console.log('='.repeat(60));
  console.log(`Chain ID: ${process.env.UNIVERSE_CHAIN_ID || 888777}`);
  console.log(`Parent Chain: Arbitrum Sepolia`);
  console.log(`Gas Token: AXM (${process.env.AXM_TOKEN_ADDRESS})`);
  console.log('='.repeat(60));

  // Setup deployer account
  const deployerAccount = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
  console.log(`\n✅ Deployer account: ${deployerAccount.address}`);

  // Create clients for Arbitrum Sepolia
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.PARENT_CHAIN_RPC || arbitrumSepolia.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: arbitrumSepolia,
    transport: http(process.env.PARENT_CHAIN_RPC || arbitrumSepolia.rpcUrls.default.http[0]),
  });

  // Check deployer balance
  const balance = await publicClient.getBalance({ address: deployerAccount.address });
  const balanceInEth = Number(balance) / 1e18;
  console.log(`💰 Deployer balance: ${balanceInEth.toFixed(4)} ETH`);

  if (balanceInEth < 1.2) {
    throw new Error(
      `Insufficient balance! Need at least 1.2 testnet ETH. Current: ${balanceInEth.toFixed(4)} ETH\n` +
      `Get testnet ETH: https://sepoliafaucet.com → Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io`
    );
  }

  console.log('\n📋 Step 1: Preparing chain configuration...');

  // Prepare chain config
  const chainConfig = prepareChainConfig({
    chainId: Number(process.env.UNIVERSE_CHAIN_ID || 888777),
    arbitrum: {
      InitialChainOwner: process.env.UNIVERSE_OWNER_ADDRESS as `0x${string}`,
      DataAvailabilityCommittee: false, // Rollup mode (not AnyTrust)
    },
  });

  console.log('✅ Chain config prepared');

  console.log('\n📋 Step 2: Creating deployment parameters...');

  // Create deployment params
  const config = createRollupPrepareDeploymentParamsConfig(publicClient, {
    chainId: BigInt(process.env.UNIVERSE_CHAIN_ID || 888777),
    owner: process.env.UNIVERSE_OWNER_ADDRESS as `0x${string}`,
    chainConfig,
  });

  console.log('✅ Deployment params created');

  console.log('\n🚀 Step 3: Deploying Universe Blockchain contracts...');
  console.log('⏳ This may take 2-5 minutes. Please wait...\n');

  try {
    // Deploy the Orbit chain
    const result = await createRollup({
      params: {
        config,
        batchPosters: [process.env.BATCH_POSTER_ADDRESS as `0x${string}`],
        validators: [process.env.VALIDATOR_ADDRESS as `0x${string}`],
        nativeToken: process.env.USE_CUSTOM_GAS_TOKEN === 'true'
          ? (process.env.AXM_TOKEN_ADDRESS as `0x${string}`)
          : undefined,
      },
      account: deployerAccount,
      parentChainPublicClient: publicClient,
    });

    console.log('\n✅ Universe Blockchain deployed successfully!');
    console.log('='.repeat(60));
    console.log('\n📝 Deployment Details:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(60));

    // Save deployment info
    const deploymentInfo = {
      chainId: process.env.UNIVERSE_CHAIN_ID || 888777,
      chainName: process.env.UNIVERSE_CHAIN_NAME || 'Universe Blockchain',
      network: 'testnet',
      parentChain: 'arbitrum-sepolia',
      deployedAt: new Date().toISOString(),
      deployer: deployerAccount.address,
      owner: process.env.UNIVERSE_OWNER_ADDRESS,
      validators: [process.env.VALIDATOR_ADDRESS],
      batchPosters: [process.env.BATCH_POSTER_ADDRESS],
      nativeToken: process.env.AXM_TOKEN_ADDRESS,
      coreContracts: result.coreContracts,
      transactionReceipt: result.transactionReceipt,
    };

    const outputPath = './deployments/testnet-deployment.json';
    fs.mkdirSync('./deployments', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n💾 Deployment info saved to: ${outputPath}`);

    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run generate-node-config');
    console.log('2. Setup Nitro node using generated config');
    console.log('3. Deploy token bridge contracts');
    console.log('4. Configure block explorer (Blockscout)');
    console.log('5. Test transactions with AXM gas token');

    console.log('\n🌐 Explorer (after setup):');
    console.log(`   https://sepolia.arbiscan.io/address/${result.coreContracts.rollup}`);

  } catch (error) {
    console.error('\n❌ Deployment failed!');
    console.error(error);
    throw error;
  }
}

// Run deployment
deployUniverseTestnet()
  .then(() => {
    console.log('\n✅ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment error:', error);
    process.exit(1);
  });
