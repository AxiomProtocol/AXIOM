/**
 * POST /api/admin/issue-accred-claim
 * Issues the missing ACCREDITED_INVESTOR claim (topic 2) to the deployer's on-chain identity.
 *
 * The original ERC-3643 deploy script issued claims for topics 1 (KYC_VERIFIED) and
 * 3 (SANCTIONS_CLEAR) but skipped topic 2 (ACCREDITED_INVESTOR), causing isVerified()
 * to return false and blocking credit-market deposits with LpNotVerified(address).
 *
 * Gated by ADMIN_SOLVENCY_KEY. Signs with DEPLOYER_PRIVATE_KEY, which holds purpose-1
 * (MANAGEMENT) on the deployer identity and whose recovered address is a valid management
 * key on the ClaimIssuer, satisfying ClaimIssuer.isClaimValid().
 *
 * Claim encoding matches deploy-axusd-3643.ts exactly:
 *   data    = abi.encode(address wallet, uint256 countryCode, uint256 expiry)
 *   dataHash = keccak256(abi.encode(identityAddr, topic, data))
 *   sig     = deployer.signMessage(getBytes(dataHash))
 *   identity.addClaim(topic, scheme=1, issuer=claimIssuerAddr, sig, data, "")
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const RPC_URL = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

const DEPLOYER_IDENTITY = '0xD96E0Ee2EE3f1Ac06A79E4843d5b50e9DD122ca0';
const CLAIM_ISSUER      = '0x579A367eaDa7606edc58f43165B53D2526D1B313';
const DEPLOYER_ADDR     = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const US_COUNTRY_CODE   = 840n;
const TOPIC_ACCREDITED  = 2n;
const SCHEME_ECDSA      = 1n;
const ONE_YEAR_SECS     = BigInt(365 * 24 * 3600);

const IDENTITY_ABI = [
  'function addClaim(uint256 _topic, uint256 _scheme, address _issuer, bytes calldata _signature, bytes calldata _data, string calldata _uri) external returns (bytes32 claimRequestId)',
  'function getClaimIdsByTopic(uint256 _topic) view returns (bytes32[])',
];

function verifyAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'] ?? req.headers['x-admin-solvency-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY && !!process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer   = new ethers.Wallet(pk, provider);
    const identity = new ethers.Contract(DEPLOYER_IDENTITY, IDENTITY_ABI, signer);

    // Check if topic 2 claim already exists
    const existingIds = await identity.getClaimIdsByTopic(TOPIC_ACCREDITED);
    if (existingIds.length > 0) {
      return res.status(200).json({
        status:  'already_present',
        message: 'Topic 2 (ACCREDITED_INVESTOR) claim already exists on this identity.',
        claimIds: existingIds,
      });
    }

    // Build claim data (matches deploy-axusd-3643.ts pattern exactly)
    const expiry = BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR_SECS;
    const data   = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint256'],
      [DEPLOYER_ADDR, US_COUNTRY_CODE, expiry]
    );

    // dataHash = keccak256(abi.encode(identityAddr, topic, data))
    const dataHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes'],
        [DEPLOYER_IDENTITY, TOPIC_ACCREDITED, data]
      )
    );

    // Sign with deployer (whose recovered address is a MANAGEMENT key on ClaimIssuer)
    const signature = await signer.signMessage(ethers.getBytes(dataHash));

    // Submit addClaim on the deployer's identity
    const tx = await identity.addClaim(
      TOPIC_ACCREDITED,
      SCHEME_ECDSA,
      CLAIM_ISSUER,
      signature,
      data,
      ''
    );
    const receipt = await tx.wait(1);

    return res.status(200).json({
      status:  'issued',
      message: 'ACCREDITED_INVESTOR claim (topic 2) successfully issued to deployer identity.',
      txHash:  receipt.hash,
      identity: DEPLOYER_IDENTITY,
      issuer:   CLAIM_ISSUER,
      topic:    2,
      expiry:   expiry.toString(),
    });
  } catch (err: unknown) {
    const e = err as { message?: string; data?: string };
    console.error('[issue-accred-claim] Error:', e);
    return res.status(500).json({
      error:   'Failed to issue claim',
      message: e?.message ?? String(err),
      data:    e?.data,
    });
  }
}
