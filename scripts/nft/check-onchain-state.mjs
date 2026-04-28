import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';

const ALCHEMY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? process.env.ALCHEMY_API_KEY;
const CONTRACT = '0x4A651D30097E2b7326A83CbB32c02913dB8b3572';
const ANCHOR_TX = '0x5a8b0fb44bec5f459f309af27524d531b00a9b9020dae195f958e2189ed3fa44';

const client = createPublicClient({
  chain: arbitrum,
  transport: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY}`),
});

const abi = [
  { type: 'function', name: 'ownerOf',     stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI',    stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'contractURI', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf',   stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

console.log('=== Token #001-#010 ownership probe ===');
for (let id = 1; id <= 10; id++) {
  try {
    const owner = await client.readContract({ address: CONTRACT, abi, functionName: 'ownerOf', args: [BigInt(id)] });
    console.log(`  #${String(id).padStart(3, '0')}  owner = ${owner}`);
  } catch (e) {
    console.log(`  #${String(id).padStart(3, '0')}  NOT MINTED (${e.shortMessage ?? e.message?.slice(0, 60)})`);
  }
}

console.log('\n=== Anchor mint tx receipt ===');
try {
  const receipt = await client.getTransactionReceipt({ hash: ANCHOR_TX });
  console.log('status:       ', receipt.status);
  console.log('block number: ', receipt.blockNumber.toString());
  console.log('gas used:     ', receipt.gasUsed.toString());
  console.log('logs count:   ', receipt.logs.length);
  if (receipt.logs.length > 0) {
    receipt.logs.forEach((l, i) => {
      console.log(`  log[${i}] address=${l.address} topics=${l.topics.length}`);
    });
  } else {
    console.log('  → ZERO logs means no Transfer event = mint never executed (likely revert before emit)');
  }
} catch (e) {
  console.log('tx not found →', e.shortMessage ?? e.message);
}

console.log('\n=== Deployer wallet ===');
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const balance = await client.getBalance({ address: DEPLOYER });
console.log('deployer:     ', DEPLOYER);
console.log('ETH balance:  ', (Number(balance) / 1e18).toFixed(6), 'ETH');
const deployerBadges = await client.readContract({ address: CONTRACT, abi, functionName: 'balanceOf', args: [DEPLOYER] });
console.log('badges held:  ', deployerBadges.toString());

console.log('\n=== Current contractURI (collection-level metadata) ===');
console.log(await client.readContract({ address: CONTRACT, abi, functionName: 'contractURI' }));

console.log('\n=== What OpenSea actually fetches ===');
const tokenUri = await client.readContract({ address: CONTRACT, abi, functionName: 'tokenURI', args: [1n] });
console.log('tokenURI(1):', tokenUri);
