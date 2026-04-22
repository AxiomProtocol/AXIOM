/**
 * SEP-10 Web Authentication Endpoint
 * GET  /api/stellar/auth  → returns a challenge transaction for the wallet to sign
 * POST /api/stellar/auth  → verifies the signed challenge and returns a JWT
 *
 * Required by MoneyGram Ramps domain allowlisting and all SEP-10 compliant anchors.
 * Reference: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as StellarSdk from '@stellar/stellar-sdk';
import jwt from 'jsonwebtoken';

const HOME_DOMAIN = 'axiomprotocol.app';
const NETWORK_PASSPHRASE = StellarSdk.Networks.PUBLIC;
const CHALLENGE_WINDOW_SECONDS = 300;

function getSigningKeypair(): StellarSdk.Keypair {
  const secret = process.env.STELLAR_SIGNING_SECRET_KEY;
  if (!secret) throw new Error('STELLAR_SIGNING_SECRET_KEY not configured');
  return StellarSdk.Keypair.fromSecret(secret);
}

function getJwtSecret(): string {
  const secret = process.env.STELLAR_JWT_SECRET ?? process.env.STELLAR_SIGNING_SECRET_KEY ?? 'fallback-dev-secret';
  return secret;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return handleChallenge(req, res);
  if (req.method === 'POST') return handleVerify(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/stellar/auth?account=G...&home_domain=axiomprotocol.app
 * Returns a SEP-10 challenge transaction (XDR base64 encoded).
 */
async function handleChallenge(req: NextApiRequest, res: NextApiResponse) {
  const { account, home_domain, memo } = req.query;

  if (!account || typeof account !== 'string') {
    return res.status(400).json({ error: 'Missing required parameter: account' });
  }

  if (!account.startsWith('G') || account.length !== 56) {
    return res.status(400).json({ error: 'Invalid Stellar account address' });
  }

  if (memo && (typeof memo !== 'string' || !/^\d+$/.test(memo))) {
    return res.status(400).json({ error: 'Invalid memo — must be a non-negative integer string' });
  }

  let signingKp: StellarSdk.Keypair;
  try {
    signingKp = getSigningKeypair();
  } catch {
    return res.status(500).json({ error: 'SEP-10 signing key not configured' });
  }

  const now = Math.floor(Date.now() / 1000);
  const nonce = StellarSdk.hash(Buffer.from(Math.random().toString())).toString('base64').substring(0, 48);

  const serverAccount = new StellarSdk.Account(signingKp.publicKey(), '-1');

  const tb = new StellarSdk.TransactionBuilder(serverAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: {
      minTime: now,
      maxTime: now + CHALLENGE_WINDOW_SECONDS,
    },
  });

  tb.addOperation(
    StellarSdk.Operation.manageData({
      name: `${HOME_DOMAIN} auth`,
      value: Buffer.from(nonce),
      source: account,
    })
  );

  tb.addOperation(
    StellarSdk.Operation.manageData({
      name: 'web_auth_domain',
      value: HOME_DOMAIN,
      source: signingKp.publicKey(),
    })
  );

  if (home_domain && typeof home_domain === 'string' && home_domain !== HOME_DOMAIN) {
    tb.addOperation(
      StellarSdk.Operation.manageData({
        name: 'client_domain',
        value: home_domain,
        source: signingKp.publicKey(),
      })
    );
  }

  const tx = tb.build();
  tx.sign(signingKp);

  return res.status(200).json({
    transaction: tx.toEnvelope().toXDR('base64'),
    network_passphrase: NETWORK_PASSPHRASE,
  });
}

/**
 * POST /api/stellar/auth
 * Body: { transaction: "<base64 XDR>" }
 * Verifies the challenge is signed by the correct wallet account and returns a JWT.
 */
async function handleVerify(req: NextApiRequest, res: NextApiResponse) {
  const { transaction, network_passphrase } = req.body;

  if (!transaction || typeof transaction !== 'string') {
    return res.status(400).json({ error: 'Missing required field: transaction' });
  }

  if (network_passphrase && network_passphrase !== NETWORK_PASSPHRASE) {
    return res.status(400).json({ error: 'Invalid network_passphrase' });
  }

  let signingKp: StellarSdk.Keypair;
  try {
    signingKp = getSigningKeypair();
  } catch {
    return res.status(500).json({ error: 'SEP-10 signing key not configured' });
  }

  let tx: StellarSdk.Transaction;
  try {
    const envelope = StellarSdk.TransactionBuilder.fromXDR(transaction, NETWORK_PASSPHRASE);
    if (!(envelope instanceof StellarSdk.Transaction)) {
      return res.status(400).json({ error: 'Only Transaction envelopes are supported (not FeeBump)' });
    }
    tx = envelope;
  } catch {
    return res.status(400).json({ error: 'Failed to parse transaction XDR' });
  }

  const now = Math.floor(Date.now() / 1000);
  const { minTime, maxTime } = tx.timeBounds ?? {};
  if (!minTime || !maxTime) {
    return res.status(400).json({ error: 'Transaction missing timebounds' });
  }
  if (now < parseInt(minTime) || now > parseInt(maxTime)) {
    return res.status(400).json({ error: 'Challenge transaction has expired or is not yet valid' });
  }

  const ops = tx.operations;
  if (!ops.length || ops[0].type !== 'manageData') {
    return res.status(400).json({ error: 'First operation must be manageData' });
  }

  const firstOp = ops[0] as StellarSdk.Operation.ManageData;
  const clientAccount = firstOp.source;
  if (!clientAccount) {
    return res.status(400).json({ error: 'First manageData operation must have a source account' });
  }

  const txHash = tx.hash();
  const signers = tx.signatures;

  let serverSigned = false;
  let clientSigned = false;

  for (const sig of signers) {
    const hint = sig.hint();
    if (hint.equals(signingKp.signatureHint())) {
      serverSigned = signingKp.verify(txHash, sig.signature());
    }
    try {
      const clientKp = StellarSdk.Keypair.fromPublicKey(clientAccount);
      if (hint.equals(clientKp.signatureHint())) {
        clientSigned = clientKp.verify(txHash, sig.signature());
      }
    } catch {
      // skip invalid hints
    }
  }

  if (!serverSigned) {
    return res.status(400).json({ error: 'Challenge not signed by server' });
  }
  if (!clientSigned) {
    return res.status(400).json({ error: 'Challenge not signed by client account' });
  }

  const token = jwt.sign(
    {
      sub: clientAccount,
      iss: HOME_DOMAIN,
      iat: now,
      exp: now + 86400,
    },
    getJwtSecret(),
    { algorithm: 'HS256' }
  );

  return res.status(200).json({ token });
}
