import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

const SAFE_ADDRESS = '0x93696b537d814Aed5875C4490143195983AED365';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';
const CHAIN_ID = 42161;

const REMAINING_TRANSACTIONS = [
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x2f2ff15d6c0757dc3e6b28b2580c03fd9e96c274acf4f99d91fbec9b418fa1d70604ff1c0000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant FEE_MANAGER_ROLE to Treasury on AXM Token (CORRECTED)'
  },
  {
    to: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885',
    data: '0x2f2ff15d61b754da92d8d8d7300489a35a466b9ed19cf4a61860a290f89bec3a75de2bcf0000000000000000000000003fd63728288546ac41dae3bf25ca383061c3a929',
    value: '0',
    description: 'Grant REWARD_FUNDER_ROLE to Treasury on Staking Hub (CORRECTED)'
  },
  {
    to: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    data: '0x2f2ff15d442a94f1a1fac79af32856af2a64f63648cfa2ef3b98610a5bb7cbec4cee6985000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant COMPLIANCE_ROLE to Identity Hub on AXM Token (CORRECTED)'
  },
  {
    to: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344',
    data: '0x2f2ff15d114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122000000000000000000000000f88bb44511e5752ee69953166c5d5dc0cfc8b3ed',
    value: '0',
    description: 'Grant ISSUER_ROLE to Identity Hub on Credential Registry (CORRECTED)'
  },
  {
    to: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d',
    data: '0x2f2ff15d8907c1162ad7c3afcb91469e849a75f664bfbfe2fa5c37baa5e90e46a47098c2000000000000000000000000e38b3443e17a07953d10f7841d5568a27a73ec1a',
    value: '0',
    description: 'Grant METER_ORACLE_ROLE to IoT Oracle on Utility Hub (Stage 3A)'
  }
];

async function isRoleGranted(provider: ethers.JsonRpcProvider, contractAddress: string, roleHash: string, accountAddress: string): Promise<boolean> {
  try {
    const abi = ['function hasRole(bytes32 role, address account) view returns (bool)'];
    const contract = new ethers.Contract(contractAddress, abi, provider);
    return await contract.hasRole(roleHash, accountAddress);
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🔧 Fixing Remaining Role Grants\n');
  console.log('═══════════════════════════════════════════════════\n');

  const signerPrivateKey = process.env.PRIVATE_KEY;
  if (!signerPrivateKey) {
    throw new Error('❌ PRIVATE_KEY not set in environment. Please set it first.');
  }

  console.log('📋 Configuration:');
  console.log(`   Safe Address: ${SAFE_ADDRESS}`);
  console.log(`   Network: Arbitrum One (${CHAIN_ID})`);
  console.log(`   Transactions: ${REMAINING_TRANSACTIONS.length}\n`);

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
  console.log('═══════════════════════════════════════════════════\n');
  
  for (let i = 0; i < REMAINING_TRANSACTIONS.length; i++) {
    const tx = REMAINING_TRANSACTIONS[i];
    const txNum = i + 1;
    
    console.log(`[${txNum}/${REMAINING_TRANSACTIONS.length}] ${tx.description}`);
    console.log(`   To: ${tx.to}`);
    
    // Check if role is already granted
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
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const txResponse = executeTxResponse.transactionResponse as any;
      const receipt = txResponse ? await txResponse.wait() : null;
      
      if (receipt?.status === 1) {
        console.log(`   ✅ SUCCESS! Tx Hash: ${receipt.hash}`);
        console.log(`   🔗 View on Blockscout: https://arbitrum.blockscout.com/tx/${receipt.hash}\n`);
      } else {
        console.log(`   ❌ FAILED! Status: ${receipt?.status}\n`);
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════\n');
  console.log('✅ REMAINING ROLE GRANTS COMPLETE!\n');
  console.log('🎯 Re-run verification to confirm all 12/12 roles are granted.\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
