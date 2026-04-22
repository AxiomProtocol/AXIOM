/**
 * One-time admin tx: remove Topic 2 (ACCREDITED_INVESTOR) from the on-chain
 * ClaimTopicsRegistry required-topics list.
 *
 * Why: Vault access (PSM mint, FixedLoan origination, AXUSD transfers) gates on
 * IdentityRegistry.isVerified(), which iterates ClaimTopicsRegistry topics. With
 * Topic 2 in the required list, every user must complete a separate accreditation
 * step before they can transact, even for non-restricted Vault access. This
 * conflates KYC (universal) with accreditation (product-specific). Accreditation
 * remains enforced on a per-product basis (Reg D 506(c) products check Topic 2
 * directly), but it is removed from the universal required-topics list.
 *
 * Required topics after this tx: [1 = KYC_VERIFIED, 3 = SANCTIONS_CLEAR].
 *
 * Usage:
 *   ALCHEMY_API_KEY=<...> DEPLOYER_PRIVATE_KEY=<...> npx tsx scripts/remove-required-claim-topic-2.ts
 *
 * Idempotent: if Topic 2 is already absent, the script reports and exits 0.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS, CLAIM_TOPICS_REGISTRY_ABI } from '../shared/contracts-3643';

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY missing');

  const url = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.JsonRpcProvider(url);
  const signer = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
  const me = await signer.getAddress();

  const reg = new ethers.Contract(
    ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY,
    CLAIM_TOPICS_REGISTRY_ABI,
    signer,
  );

  const owner: string = await reg.owner();
  console.log(`ClaimTopicsRegistry  : ${ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY}`);
  console.log(`owner                : ${owner}`);
  console.log(`signer               : ${me}`);
  if (owner.toLowerCase() !== me.toLowerCase()) {
    throw new Error(`Signer is not the registry owner — cannot removeClaimTopic. owner=${owner}`);
  }

  const before: bigint[] = await reg.getClaimTopics();
  console.log(`required topics before: [${before.map(String).join(', ')}]`);

  if (!before.some((t) => t === 2n)) {
    console.log('Topic 2 not present — nothing to do (idempotent skip).');
    return;
  }

  const tx = await reg.removeClaimTopic(2);
  console.log(`tx submitted          : ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`tx confirmed in block : ${receipt?.blockNumber}`);

  const after: bigint[] = await reg.getClaimTopics();
  console.log(`required topics after : [${after.map(String).join(', ')}]`);

  if (after.some((t) => t === 2n)) {
    throw new Error('Post-state check FAILED — Topic 2 still present after removeClaimTopic tx');
  }
  console.log('OK — Topic 2 removed from required topics.');
}

main().catch((e) => {
  console.error('[remove-required-claim-topic-2] FATAL:', e);
  process.exit(1);
});
