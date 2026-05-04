/**
 * Axiom Rail — Core Anchor Service
 *
 * Implements Stellar SEP-10 (auth), SEP-24 (interactive ramp),
 * SEP-31 (direct payments), and SEP-38 (quotes) for Axiom Protocol's
 * own Stellar anchor, settled via Increase ACH/wire rails.
 *
 * Home domain: axiomprotocol.app
 * TRANSFER_SERVER_SEP0024: https://axiomprotocol.app/api/axiom-rail/sep24
 * WEB_AUTH_ENDPOINT:       https://axiomprotocol.app/api/axiom-rail/auth
 * ANCHOR_QUOTE_SERVER:     https://axiomprotocol.app/api/axiom-rail/sep38
 * DIRECT_PAYMENT_SERVER:   https://axiomprotocol.app/api/axiom-rail/sep31
 */

import type { AxiomRailSep24Info, AxiomRailSep38Asset, AxiomRailQuote, AxiomRailQuoteRequest } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────────

export const AXIOM_RAIL_HOME_DOMAIN = 'axiomprotocol.app';
export const AXIOM_RAIL_SIGNING_KEY = 'GBLOO5JUZQDP6JMIX26X5AC26QUNYFYMNT2CLAMGAWDU4HA4VG2IAVIY';
export const AXIOM_RAIL_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
export const AXIOM_RAIL_NETWORK = 'Public Global Stellar Network ; September 2015';

// Axiom Protocol asset contract addresses (Arbitrum One)
export const AXUSD_CONTRACT_ADDRESS = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
export const AXAU_CONTRACT_ADDRESS  = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';

// Separate deposit-receiving account (should differ from signing key in production)
export const AXIOM_RAIL_DEPOSIT_ACCOUNT = process.env.AXIOM_RAIL_DEPOSIT_ACCOUNT ?? AXIOM_RAIL_SIGNING_KEY;

export const AXIOM_RAIL_BASE_URL = 'https://axiomprotocol.app/api/axiom-rail';
export const AXIOM_RAIL_SEP24_URL = `${AXIOM_RAIL_BASE_URL}/sep24`;
export const AXIOM_RAIL_SEP31_URL = `${AXIOM_RAIL_BASE_URL}/sep31`;
export const AXIOM_RAIL_SEP38_URL = `${AXIOM_RAIL_BASE_URL}/sep38`;
export const AXIOM_RAIL_AUTH_URL  = `${AXIOM_RAIL_BASE_URL}/auth`;

// Fee structure
export const AXIOM_RAIL_FEE_FIXED_USD   = 0.50;  // $0.50 flat
export const AXIOM_RAIL_FEE_PERCENT     = 0.001; // 0.1%
export const AXIOM_RAIL_MIN_AMOUNT_USD  = 10;
export const AXIOM_RAIL_MAX_AMOUNT_USD  = 25000;

// ─── SEP-24 Info ───────────────────────────────────────────────────────────────

export function getAxiomRailSep24Info(): AxiomRailSep24Info {
  const assetConfig = {
    enabled: true,
    min_amount: AXIOM_RAIL_MIN_AMOUNT_USD,
    max_amount: AXIOM_RAIL_MAX_AMOUNT_USD,
    fee_fixed: AXIOM_RAIL_FEE_FIXED_USD,
    fee_percent: AXIOM_RAIL_FEE_PERCENT * 100,
  };

  return {
    deposit: {
      USDC:  assetConfig,
      AXUSD: assetConfig,
      AXAU:  assetConfig,
    },
    withdraw: {
      USDC:  assetConfig,
      AXUSD: assetConfig,
      AXAU:  assetConfig,
    },
    fee_supported: true,
    id_supported: true,
    claimable_balances_supported: false,
  };
}

// ─── SEP-38 Assets & Quotes ────────────────────────────────────────────────────

export function getAxiomRailSep38Assets(): AxiomRailSep38Asset[] {
  const rtpDeliveryMethods = [
    { name: 'RTP', description: 'Real-Time Payments (5-minute settlement)' },
    { name: 'ACH', description: 'ACH bank transfer (1-3 business days)' },
    { name: 'Wire', description: 'Domestic wire transfer (same day)' },
  ];

  return [
    {
      asset: `stellar:USDC:${AXIOM_RAIL_USDC_ISSUER}`,
      country_codes: ['US'],
      sell_delivery_methods: rtpDeliveryMethods,
      buy_delivery_methods: rtpDeliveryMethods,
    },
    {
      asset: `arbitrum:AXUSD:${AXUSD_CONTRACT_ADDRESS}`,
      country_codes: ['US'],
      sell_delivery_methods: rtpDeliveryMethods,
      buy_delivery_methods: rtpDeliveryMethods,
    },
    {
      asset: `arbitrum:AXAU:${AXAU_CONTRACT_ADDRESS}`,
      country_codes: ['US'],
      sell_delivery_methods: rtpDeliveryMethods,
      buy_delivery_methods: rtpDeliveryMethods,
    },
    {
      asset: 'iso4217:USD',
      country_codes: ['US'],
    },
  ];
}

export function buildAxiomRailQuote(req: AxiomRailQuoteRequest): AxiomRailQuote {
  const sellAmount = parseFloat(req.sell_amount);
  if (isNaN(sellAmount) || sellAmount <= 0) throw new Error('Invalid sell_amount');

  const feeFixed   = AXIOM_RAIL_FEE_FIXED_USD;
  const feePercent = sellAmount * AXIOM_RAIL_FEE_PERCENT;
  const totalFee   = feeFixed + feePercent;
  const buyAmount  = Math.max(0, sellAmount - totalFee);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  const id = `axr-quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    expires_at: expiresAt,
    price: '1.0000',
    total_price: (1 + AXIOM_RAIL_FEE_PERCENT).toFixed(4),
    sell_asset: req.sell_asset,
    sell_amount: sellAmount.toFixed(2),
    buy_asset: req.buy_asset,
    buy_amount: buyAmount.toFixed(2),
    fee: {
      total: totalFee.toFixed(2),
      asset: 'iso4217:USD',
      details: [
        { name: 'Service fee', amount: feeFixed.toFixed(2), description: 'Axiom Rail flat fee' },
        { name: 'Processing fee', amount: feePercent.toFixed(2), description: `${(AXIOM_RAIL_FEE_PERCENT * 100).toFixed(1)}% of transaction` },
      ],
    },
  };
}

// ─── SEP-31 Info ───────────────────────────────────────────────────────────────

export function getAxiomRailSep31Info() {
  return {
    receive: {
      USDC: {
        enabled: true,
        fee_fixed: AXIOM_RAIL_FEE_FIXED_USD,
        fee_percent: AXIOM_RAIL_FEE_PERCENT * 100,
        min_amount: AXIOM_RAIL_MIN_AMOUNT_USD,
        max_amount: AXIOM_RAIL_MAX_AMOUNT_USD,
        fields: {
          transaction: {
            receiver_account_number: {
              description: 'Recipient US bank account number',
              optional: false,
            },
            receiver_routing_number: {
              description: 'Recipient US routing number (ABA)',
              optional: false,
            },
            receiver_name: {
              description: 'Legal name of the account holder',
              optional: false,
            },
            transfer_type: {
              description: 'Transfer method (ACH or Wire)',
              optional: true,
              choices: ['ACH', 'Wire'],
            },
          },
          sender: {
            sender_legal_name: {
              description: 'Full legal name of the sender as it appears on government-issued ID',
              optional: false,
            },
            sender_dob: {
              description: 'Sender date of birth (YYYY-MM-DD)',
              optional: false,
            },
            sender_country: {
              description: 'Sender country of residence',
              optional: false,
            },
            sender_id_type: {
              description: 'Type of government ID provided',
              optional: false,
              choices: ['ssn', 'passport'],
            },
            sender_id_number: {
              description: 'Last 4 digits of SSN (US persons) or full passport number (non-US). Retained for BSA compliance only.',
              optional: false,
            },
          },
        },
      },
    },
  };
}

// ─── SEP-10 challenge builder ──────────────────────────────────────────────────

/**
 * Builds a SEP-10 challenge transaction XDR.
 * Requires @stellar/stellar-sdk — only called from the auth API route,
 * never from module-level code, keeping serverless bundles clean.
 */
export async function buildSep10Challenge(stellarAccount: string): Promise<string> {
  const { Keypair, TransactionBuilder, BASE_FEE, Networks, Operation, Account, Memo } =
    await import('@stellar/stellar-sdk');

  const signingSecret = process.env.STELLAR_SIGNING_SECRET_KEY;
  if (!signingSecret) throw new Error('STELLAR_SIGNING_SECRET_KEY not configured');

  const serverKeypair = Keypair.fromSecret(signingSecret);
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString('base64');

  const account = new Account(serverKeypair.publicKey(), '-1');
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.manageData({
        name: `${AXIOM_RAIL_HOME_DOMAIN} auth`,
        value: nonce,
        source: stellarAccount,
      })
    )
    .addOperation(
      Operation.manageData({
        name: 'web_auth_domain',
        value: AXIOM_RAIL_HOME_DOMAIN,
      })
    )
    .setTimeout(300)
    .addMemo(Memo.none())
    .build();

  tx.sign(serverKeypair);
  return tx.toXDR();
}

/**
 * Verifies a signed SEP-10 challenge and returns the client account.
 */
export async function verifySep10Challenge(
  signedXdr: string,
): Promise<{ account: string; valid: boolean; error?: string }> {
  try {
    const { Transaction, Networks, Keypair } = await import('@stellar/stellar-sdk');
    const signingSecret = process.env.STELLAR_SIGNING_SECRET_KEY;
    if (!signingSecret) throw new Error('STELLAR_SIGNING_SECRET_KEY not configured');

    const serverKeypair = Keypair.fromSecret(signingSecret);
    const tx = new Transaction(signedXdr, Networks.PUBLIC);

    // ── 1. Validate challenge structure ──────────────────────────────────────────
    const firstOp = tx.operations[0];
    if (!firstOp || firstOp.type !== 'manageData') {
      return { account: '', valid: false, error: 'Invalid challenge structure: first op must be manageData' };
    }

    const clientAccount = (firstOp as { source?: string }).source ?? '';
    if (!clientAccount) {
      return { account: '', valid: false, error: 'Challenge missing client account in first op source' };
    }

    // ── 2. Verify web_auth_domain second operation ────────────────────────────────
    const secondOp = tx.operations[1] as { type: string; name?: string; value?: Buffer } | undefined;
    if (!secondOp || secondOp.type !== 'manageData' || secondOp.name !== 'web_auth_domain') {
      return { account: clientAccount, valid: false, error: 'Challenge missing web_auth_domain operation' };
    }
    const domainValue = secondOp.value?.toString('utf8') ?? '';
    if (domainValue !== AXIOM_RAIL_HOME_DOMAIN) {
      return { account: clientAccount, valid: false, error: `web_auth_domain mismatch: expected ${AXIOM_RAIL_HOME_DOMAIN}, got ${domainValue}` };
    }

    // ── 3. Verify server signature ────────────────────────────────────────────────
    const serverSig = tx.signatures.find(sig => {
      try { return serverKeypair.verify(tx.hash(), sig.signature()); } catch { return false; }
    });
    if (!serverSig) {
      return { account: clientAccount, valid: false, error: 'Server signature missing or invalid' };
    }

    // ── 4. Verify client signature ────────────────────────────────────────────────
    // SEP-10 requires the client to sign the challenge before submitting.
    const clientKeypair = Keypair.fromPublicKey(clientAccount);
    const clientSig = tx.signatures.find(sig => {
      try { return clientKeypair.verify(tx.hash(), sig.signature()); } catch { return false; }
    });
    if (!clientSig) {
      return { account: clientAccount, valid: false, error: 'Client signature missing — wallet must sign the challenge before submitting' };
    }

    return { account: clientAccount, valid: true };
  } catch (err) {
    return { account: '', valid: false, error: (err as Error).message };
  }
}

// ─── Simple JWT for SEP-10 tokens ─────────────────────────────────────────────

export function signRailJwt(account: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: AXIOM_RAIL_HOME_DOMAIN,
    sub: account,
    iat: now,
    exp: now + 86400,
  })).toString('base64url');

  const secret = process.env.STELLAR_SIGNING_SECRET_KEY;
  if (!secret) throw new Error('STELLAR_SIGNING_SECRET_KEY is not configured — cannot sign Rail JWT');
  const { createHmac } = require('crypto');
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyRailJwt(token: string): { account: string; valid: boolean } {
  try {
    const [header, payload, sig] = token.split('.');
    const secret = process.env.STELLAR_SIGNING_SECRET_KEY;
    if (!secret) return { account: '', valid: false };
    const { createHmac } = require('crypto');
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (sig !== expected) return { account: '', valid: false };

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return { account: '', valid: false };
    return { account: decoded.sub, valid: true };
  } catch {
    return { account: '', valid: false };
  }
}
