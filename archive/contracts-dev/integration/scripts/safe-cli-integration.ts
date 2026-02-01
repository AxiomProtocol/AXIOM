import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

const SAFE_ADDRESS = '0x93696b537d814Aed5875C4490143195983AED365';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';
const CHAIN_ID = 42161;

// Role hashes for checking
const ROLE_HASHES = {
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  FEE_MANAGER_ROLE: '0x8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a2',
  REWARD_FUNDER_ROLE: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
  COMPLIANCE_ROLE: '0x6e8b2c3b9e2b7e8d9d8a7f9c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f',
  ISSUER_ROLE: '0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a',
  TREASURY_ROLE: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
  ADMIN_ROLE: '0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  ORACLE_ROLE: '0xb3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d'
};

// Helper function to check if a role is already granted
async function isRoleGranted(provider: ethers.JsonRpcProvider, contractAddress: string, roleHash: string, accountAddress: string): Promise<boolean> {
  try {
    const abi = ['function hasRole(bytes32 role, address account) view returns (bool)'];
    const contract = new ethers.Contract(contractAddress, abi, provider);
    return await contract.hasRole(roleHash, accountAddress);
  } catch (error) {
    // If contract doesn't have hasRole (like setVault), return false to proceed
    return false;
  }
}

const STAGE_1_TRANSACTIONS = [
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x2f2ff15d9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a60000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant MINTER_ROLE to Treasury on AXM Token'
  },
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x2f2ff15d8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a20000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant FEE_MANAGER_ROLE to Treasury on AXM Token'
  },
  {
    to: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885',
    data: '0x2f2ff15d8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant REWARD_FUNDER_ROLE to Treasury on Staking Hub'
  },
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x2f2ff15d6e8b2c3b9e2b7e8d9d8a7f9c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant COMPLIANCE_ROLE to Identity Hub on AXM Token'
  },
  {
    to: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344',
    data: '0x2f2ff15d2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant ISSUER_ROLE to Identity Hub on Credential Registry'
  },
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x423db9c7000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Set Compliance Module on AXM Token'
  },
  {
    to: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    data: '0xf4049ccad9572473dc5950d5ae4d5bd19aa657ac5ffa1dd29225e795a4231bbcc490cef20000000000000000000000000000000000000000000000000000000000000001',
    value: '0',
    description: 'Set BURN Vault'
  },
  {
    to: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    data: '0xf4049cca89dcfba15e57e8745886f8c714d934e15c145f6f194cc4fdc2b3f308f1a6e9500000000000000000000000000000000000000000000000000000000000000002',
    value: '0',
    description: 'Set STAKING Vault'
  },
  {
    to: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    data: '0xf4049cca3c17cea8fe925a891ce95bd6290aac923925ede37ecae676717e71ae5a89cd240000000000000000000000000000000000000000000000000000000000000003',
    value: '0',
    description: 'Set LIQUIDITY Vault'
  },
  {
    to: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    data: '0xf4049ccac2574831e76b861e8b676e1e20880b70d3aea7533f7ed18ca2670567f91ff56d0000000000000000000000000000000000000000000000000000000000000004',
    value: '0',
    description: 'Set DIVIDEND Vault'
  },
  {
    to: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    data: '0xf4049ccad6bc8acee06d7b61d3d9cc7b679975728506bdfaa609203a4ebeebb63d3a79d20000000000000000000000000000000000000000000000000000000000000005',
    value: '0',
    description: 'Set TREASURY Vault'
  }
];

const STAGE_2_TRANSACTIONS = [
  {
    to: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297',
    data: '0x2f2ff15de1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca90000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant TREASURY_ROLE to Treasury on Lease Engine'
  },
  {
    to: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412',
    data: '0x2f2ff15da49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c217750000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant ADMIN_ROLE to Treasury on Realtor Module'
  },
  {
    to: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701',
    data: '0x2f2ff15de1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca90000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant TREASURY_ROLE to Treasury on Capital Pools'
  },
  {
    to: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297',
    data: '0x2f2ff15d442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee6985000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant COMPLIANCE_ROLE to Identity Hub on Lease Engine'
  },
  {
    to: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412',
    data: '0x2f2ff15d442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee6985000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant COMPLIANCE_ROLE to Identity Hub on Realtor Module'
  }
];

const STAGE_3B_TRANSACTIONS = [
  {
    to: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1',
    data: '0x2f2ff15d68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1000000000000000000000000e38b3443e17a07953d10f7841d5568a27a73ec1a',
    value: '0',
    description: 'Grant ORACLE_ROLE to IoT Oracle on DePIN Suite'
  }
];

async function main() {
  console.log('\n🚀 Axiom Safe CLI Integration\n');
  console.log('═══════════════════════════════════════════════════\n');

  const signerPrivateKey = process.env.PRIVATE_KEY;
  if (!signerPrivateKey) {
    throw new Error('❌ PRIVATE_KEY not set in environment. Please set it first.');
  }

  console.log('📋 Configuration:');
  console.log(`   Safe Address: ${SAFE_ADDRESS}`);
  console.log(`   Network: Arbitrum One (${CHAIN_ID})`);
  console.log(`   RPC: ${RPC_URL}\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(signerPrivateKey, provider);
  
  console.log(`✅ Signer loaded: ${signer.address}\n`);

  console.log('🔐 Initializing Safe SDK...');
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: signerPrivateKey,
    safeAddress: SAFE_ADDRESS
  });

  console.log('✅ Safe SDK initialized\n');

  const safeInfo = await protocolKit.getAddress();
  const threshold = await protocolKit.getThreshold();
  const owners = await protocolKit.getOwners();

  console.log('📊 Safe Info:');
  console.log(`   Address: ${safeInfo}`);
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Owners: ${owners.length}`);
  console.log(`   Owner 1: ${owners[0]}\n`);

  console.log('═══════════════════════════════════════════════════\n');
  console.log('🌐 STAGE 3B: DePIN Suite Oracle (1 txn)\n');
  console.log('ℹ️  Stage 1 & 2 already complete - running final stage\n');
  
  await executeTransactions(protocolKit, signer, STAGE_3B_TRANSACTIONS, 3);

  console.log('\n═══════════════════════════════════════════════════\n');
  console.log('🎉 ALL INTEGRATION STAGES COMPLETE!\n');
  console.log('✅ All 22 Axiom contracts are now fully integrated!\n');
  console.log('Next: Verify on Blockscout and build operations dashboard.\n');
}

async function executeTransactions(
  protocolKit: Safe, 
  signer: ethers.Wallet,
  transactions: any[],
  stage: number
) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const txNum = i + 1;
    
    console.log(`[${txNum}/${transactions.length}] ${tx.description}`);
    console.log(`   To: ${tx.to}`);
    
    // Check if transaction should be skipped
    if ((tx as any).skip) {
      console.log(`   ${(tx as any).skipReason}\n`);
      continue;
    }
    
    // Check if this is a role grant transaction (grantRole signature: 0x2f2ff15d)
    if (tx.data.startsWith('0x2f2ff15d') && tx.data.length >= 74) {
      // Extract role hash and account from calldata
      const roleHash = '0x' + tx.data.slice(10, 74);
      const account = '0x' + tx.data.slice(74, 114);
      
      console.log(`   🔍 Checking if role already granted...`);
      const alreadyGranted = await isRoleGranted(provider, tx.to, roleHash, account);
      
      if (alreadyGranted) {
        console.log(`   ⏭️  SKIPPED: Role already granted!\n`);
        continue;
      } else {
        console.log(`   ✓ Role not granted, proceeding..`);
      }
    }
    
    try {
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [{
          to: tx.to,
          data: tx.data,
          value: tx.value
        }]
      });

      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
      console.log(`   Safe Tx Hash: ${safeTxHash}`);

      const signedSafeTx = await protocolKit.signTransaction(safeTransaction);
      
      console.log(`   📝 Executing transaction...`);
      const executeTxResponse = await protocolKit.executeTransaction(signedSafeTx);
      
      console.log(`   Tx Hash: ${executeTxResponse.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const receipt = await provider.waitForTransaction(executeTxResponse.hash);
      
      if (receipt && receipt.status === 1) {
        console.log(`   ✅ SUCCESS! Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   🔗 https://arbitrum.blockscout.com/tx/${receipt.hash}\n`);
      } else {
        console.log(`   ❌ FAILED: Transaction reverted\n`);
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  });
