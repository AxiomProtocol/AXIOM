import type { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import { pool } from '../../../../server/db';
import * as crypto from 'crypto';

const ARBITRUM_CHAIN_ID = 42161;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let step = 'init';

  try {
    step = 'parse-body';
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({ error: 'Message and signature required' });
    }

    step = 'parse-siwe-message';
    const siweMessage = new SiweMessage(message);
    const { nonce } = siweMessage;

    step = 'extract-headers';
    const rawForwardedHost = req.headers['x-forwarded-host'];
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;

    // Normalize x-forwarded-host: Replit proxy may send "host, host" (comma-separated)
    // Take only the first value and trim whitespace
    const normalizeHost = (h: string | string[] | undefined): string | undefined => {
      if (!h) return undefined;
      const raw = Array.isArray(h) ? h[0] : h;
      return raw.split(',')[0].trim() || undefined;
    };

    const forwardedHost = normalizeHost(rawForwardedHost);

    let originHost: string | undefined;
    let refererHost: string | undefined;

    if (originHeader) {
      try { originHost = new URL(originHeader as string).host; } catch {}
    }
    if (refererHeader) {
      try { refererHost = new URL(refererHeader as string).host; } catch {}
    }

    const messageDomain = siweMessage.domain;
    const publicDomain = process.env.PUBLIC_DOMAIN;

    // Build an inclusive set of valid hosts from all available headers
    const validHostsSet = new Set<string>(
      [
        forwardedHost,
        originHost,
        refererHost,
        req.headers.host as string | undefined,
        publicDomain,
        publicDomain ? `www.${publicDomain}` : undefined,
      ].filter((h): h is string => !!h && h.length > 0)
    );

    console.log('[SIWE Verify] Step=domain-check', {
      messageDomain,
      forwardedHost,
      originHost,
      refererHost,
      rawHost: req.headers.host,
      validHosts: [...validHostsSet],
    });

    step = 'domain-check';
    if (!validHostsSet.has(messageDomain)) {
      console.warn('[SIWE Verify] Domain mismatch:', {
        messageDomain,
        validHosts: [...validHostsSet],
        rawForwardedHost,
      });
      return res.status(401).json({
        error: 'Domain mismatch. The signature was created for a different site.',
        code: 'DOMAIN_MISMATCH',
        debug: { validHosts: [...validHostsSet], received: messageDomain },
      });
    }

    step = 'chain-check';
    const messageChainId = siweMessage.chainId;
    if (messageChainId !== ARBITRUM_CHAIN_ID) {
      return res.status(401).json({
        error: `Invalid network. Please connect to Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID}).`,
        code: 'CHAIN_MISMATCH',
      });
    }

    step = 'nonce-lookup';
    const nonceResult = await pool.query(
      `SELECT nonce FROM siwe_nonces WHERE nonce = $1 AND expires_at > NOW()`,
      [nonce]
    );

    if (nonceResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired nonce. Please request a new one.',
        code: 'NONCE_INVALID',
      });
    }

    // siwe v3: use suppressExceptions:true so verify() always resolves
    step = 'sig-verify';
    const fields = await siweMessage.verify(
      { signature, nonce, domain: messageDomain },
      { suppressExceptions: true }
    );

    if (!fields.success) {
      const errType: string = (fields as any).error?.type ?? 'SIGNATURE_INVALID';
      const errMsg: Record<string, string> = {
        'Signature does not match address of the message.': 'Signature is invalid. Please try signing again.',
        'Nonce does not match provided nonce for verification.': 'Nonce mismatch. Please request a new sign-in and try again.',
        'Domain does not match provided domain for verification.': 'Domain mismatch. The signature was created for a different site.',
        'Expired message.': 'Sign-in request expired. Please try again.',
        'Message is not yet valid.': 'Sign-in message is not yet valid. Check your device clock.',
      };
      console.warn('[SIWE Verify] Verification failed type:', errType);
      return res.status(401).json({
        error: errMsg[errType] ?? `Signature check failed: ${errType}`,
        code: 'SIGNATURE_INVALID',
      });
    }

    step = 'nonce-delete';
    await pool.query(`DELETE FROM siwe_nonces WHERE nonce = $1`, [nonce]);

    step = 'session-create';
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO wallet_sessions (session_token, wallet_address, chain_id, authenticated_at, expires_at, domain)
       VALUES ($1, $2, $3, NOW(), $4, $5)
       ON CONFLICT (wallet_address)
       DO UPDATE SET
         session_token = EXCLUDED.session_token,
         authenticated_at = NOW(),
         expires_at = EXCLUDED.expires_at,
         chain_id = EXCLUDED.chain_id,
         domain = EXCLUDED.domain`,
      [
        sessionToken,
        fields.data.address.toLowerCase(),
        fields.data.chainId || ARBITRUM_CHAIN_ID,
        expiresAt,
        fields.data.domain,
      ]
    );

    step = 'set-cookie';
    res.setHeader(
      'Set-Cookie',
      `siwe_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    );

    console.log('[SIWE Verify] Success for', fields.data.address);
    return res.json({
      success: true,
      address: fields.data.address,
      chainId: fields.data.chainId,
      message: 'Wallet successfully authenticated',
    });
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error(`[SIWE Verify] ERROR at step="${step}":`, msg, error);
    return res.status(500).json({
      error: `Sign-in failed at step: ${step} — ${msg}`,
      code: 'SERVER_ERROR',
      step,
    });
  }
}
