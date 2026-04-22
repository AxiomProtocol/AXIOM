import type { NextApiRequest, NextApiResponse } from 'next';
import { createVerify, createPublicKey } from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const CIRCLE_IP_ALLOWLIST = new Set([
  '54.243.112.156',
  '100.24.191.35',
  '54.165.52.248',
  '54.87.106.46',
]);

// Cache public keys by keyId — they are static per keyId per Circle docs
const publicKeyCache = new Map<string, { pem: string; expiresAt: number }>();
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const processedNotifications = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Fetch public key from Circle API by keyId, with in-memory cache
async function getPublicKeyPem(keyId: string): Promise<string> {
  const cached = publicKeyCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) return cached.pem;

  const apiKey = process.env.CIRCLE_API_KEY ?? process.env.CIRCLE_COMPLIANCE_API_KEY ?? '';
  if (!apiKey) throw new Error('No Circle API key configured (CIRCLE_API_KEY or CIRCLE_COMPLIANCE_API_KEY)');

  const res = await fetch(`https://api.circle.com/v2/notifications/publicKey/${keyId}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Circle publicKey fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const base64Key: string = json?.data?.publicKey;
  if (!base64Key) throw new Error('No publicKey in Circle response');

  // Convert DER/SPKI base64 → Node crypto KeyObject → PEM
  const derBytes = Buffer.from(base64Key, 'base64');
  const keyObject = createPublicKey({ key: derBytes, format: 'der', type: 'spki' });
  const pem = keyObject.export({ type: 'spki', format: 'pem' }) as string;

  publicKeyCache.set(keyId, { pem, expiresAt: Date.now() + KEY_CACHE_TTL_MS });
  return pem;
}

function verifySignature(pem: string, signature: string, body: Buffer): boolean {
  try {
    const verify = createVerify('sha256');
    verify.update(body);
    const sigBuffer = Buffer.from(signature, 'base64');
    return verify.verify({ key: pem, format: 'pem', dsaEncoding: 'der' }, sigBuffer);
  } catch {
    return false;
  }
}

function pruneIdempotencyStore(): void {
  const now = Date.now();
  for (const [id, ts] of processedNotifications.entries()) {
    if (now - ts > IDEMPOTENCY_TTL_MS) processedNotifications.delete(id);
  }
}

async function processCircleEvent(type: string, data: unknown): Promise<void> {
  console.log(`[webhook/circle] processing event type=${type}`);
  switch (type) {
    case 'webhooks.test':
      console.log('[webhook/circle] test notification received — subscription active');
      break;
    case 'wallet.created':
    case 'user.created':
    case 'transaction.confirmed':
    case 'compliance.screening.completed':
      break;
    default:
      console.log(`[webhook/circle] unhandled event type=${type}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Circle registration sends a HEAD request to verify the endpoint is reachable
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // IP allowlist — only enforced in production
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    (req.socket as any)?.remoteAddress ??
    '';

  if (!CIRCLE_IP_ALLOWLIST.has(clientIp) && process.env.NODE_ENV === 'production') {
    console.warn(`[webhook/circle] rejected IP=${clientIp}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rawBody = await getRawBody(req);

  const keyId = req.headers['x-circle-key-id'] as string | undefined;
  const signature = req.headers['x-circle-signature'] as string | undefined;

  if (!keyId || !signature) {
    console.warn('[webhook/circle] missing signature headers');
    return res.status(400).json({ error: 'Missing signature headers' });
  }

  try {
    const pem = await getPublicKeyPem(keyId);
    const valid = verifySignature(pem, signature, rawBody);
    if (!valid) {
      console.warn('[webhook/circle] invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err: any) {
    console.error('[webhook/circle] signature verification error:', err.message);
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const notificationId: string = payload?.notificationId ?? '';
  if (!notificationId) {
    return res.status(400).json({ error: 'Missing notificationId' });
  }

  pruneIdempotencyStore();
  if (processedNotifications.has(notificationId)) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  processedNotifications.set(notificationId, Date.now());

  // Respond immediately — Circle enforces a 5-second timeout
  res.status(200).json({ received: true });

  try {
    await logWebhookEvent(payload);
    await processCircleEvent(payload?.notificationType ?? payload?.type ?? '', payload?.notification ?? payload?.data);
  } catch (err: any) {
    console.error('[webhook/circle] async processing error:', err.message);
  }
}

async function logWebhookEvent(payload: any): Promise<void> {
  try {
    const { getPool } = await import('../../../server/db');
    const pool = getPool();
    await pool.query(
      `INSERT INTO circle_webhook_events (notification_id, notification_type, client_id, raw_payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (notification_id) DO NOTHING`,
      [
        payload?.notificationId ?? '',
        payload?.notificationType ?? payload?.type ?? 'unknown',
        payload?.clientId ?? null,
        JSON.stringify(payload),
      ]
    );
  } catch {
    // DB logging is non-critical — do not surface errors to caller
  }
}
