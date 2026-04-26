import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const ALCHEMY_WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET ?? '';
const DISCORD_BOT_TOKEN      = process.env.DISCORD_BOT_TOKEN ?? '';
const DISCORD_ALERT_CHANNEL  = process.env.DISCORD_OPERATOR_CHANNEL_ID ?? '';

const AXAU_ADDRESS  = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb'.toLowerCase();
const PAXG_ADDRESS  = '0xfAfD4CB703B25CB22f43D017e7e0d75FEBc26743'.toLowerCase();
const PAXG_ALERT_THRESHOLD = 0.05;
const AXUSD_LARGE_THRESHOLD = 10000;

function validateAlchemySignature(req: NextApiRequest, rawBody: string): boolean {
  if (!ALCHEMY_WEBHOOK_SECRET) return true;
  const signature = req.headers['x-alchemy-signature'];
  if (!signature || typeof signature !== 'string') return false;
  const expected = crypto
    .createHmac('sha256', ALCHEMY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

async function sendDiscordAlert(message: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_ALERT_CHANNEL) return;
  await fetch(`https://discord.com/api/v10/channels/${DISCORD_ALERT_CHANNEL}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: message }),
  }).catch(err => console.error('[alchemy-webhook] Discord alert failed:', err.message));
}

async function processAddressActivity(event: Record<string, unknown>) {
  const activities = (event.activity as unknown[]) ?? [];
  for (const act of activities) {
    const a = act as {
      asset?: string;
      value?: number;
      fromAddress?: string;
      toAddress?: string;
      rawContract?: { address?: string };
      category?: string;
    };

    const contractAddr = (a.rawContract?.address ?? '').toLowerCase();
    const toAddr   = (a.toAddress   ?? '').toLowerCase();
    const fromAddr = (a.fromAddress ?? '').toLowerCase();
    const value    = a.value ?? 0;

    if (contractAddr === PAXG_ADDRESS && value >= PAXG_ALERT_THRESHOLD) {
      console.log(`[alchemy-webhook] PAXG inflow: ${value} PAXG from ${fromAddr} to ${toAddr}`);
      await sendDiscordAlert(
        `🏅 **PAXG Treasury Inflow** — ${value} PAXG received\nFrom: \`${fromAddr}\`\nTo: \`${toAddr}\``
      );
    }

    if (contractAddr === AXAU_ADDRESS && fromAddr.includes('000000000000000000000000000000000000000')) {
      console.log(`[alchemy-webhook] AXAU mint detected: ${value} AXAU to ${toAddr}`);
    }

    if (contractAddr === AXAU_ADDRESS && toAddr.includes('000000000000000000000000000000000000000')) {
      console.log(`[alchemy-webhook] AXAU redeem detected: ${value} AXAU from ${fromAddr}`);
    }

    if (a.asset === 'AXUSD' && value >= AXUSD_LARGE_THRESHOLD) {
      await sendDiscordAlert(
        `💵 **Large AXUSD Movement** — ${value.toLocaleString()} AXUSD\nFrom: \`${fromAddr}\`\nTo: \`${toAddr}\``
      );
    }
  }
}

async function processMinedTransaction(event: Record<string, unknown>) {
  const tx = event.transaction as Record<string, unknown> | undefined;
  if (!tx) return;
  console.log(`[alchemy-webhook] Mined tx: ${tx.hash}`);
}

async function processDroppedTransaction(event: Record<string, unknown>) {
  const tx = event.transaction as Record<string, unknown> | undefined;
  if (!tx) return;
  console.log(`[alchemy-webhook] Dropped tx: ${tx.hash} from ${tx.from}`);
  await sendDiscordAlert(
    `⚠️ **Transaction Dropped** — \`${tx.hash}\`\nFrom: \`${tx.from}\`\nPlease resubmit.`
  );
}

async function processNftActivity(event: Record<string, unknown>) {
  const activity = (event.activity as unknown[]) ?? [];
  for (const act of activity) {
    const a = act as { fromAddress?: string; toAddress?: string; contract?: string; tokenId?: string };
    console.log(`[alchemy-webhook] NFT transfer: token ${a.tokenId} of ${a.contract} from ${a.fromAddress} to ${a.toAddress}`);
  }
}

async function processGraphqlEvent(event: Record<string, unknown>) {
  console.log(`[alchemy-webhook] GraphQL event:`, JSON.stringify(event).slice(0, 500));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let rawBody = '';
  try {
    rawBody = JSON.stringify(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (ALCHEMY_WEBHOOK_SECRET && !validateAlchemySignature(req, rawBody)) {
    console.warn('[alchemy-webhook] Invalid signature — request rejected');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { webhookId, type, event } = req.body as {
    webhookId?: string;
    type?: string;
    event?: Record<string, unknown>;
  };

  console.log(`[alchemy-webhook] Received: type=${type} webhookId=${webhookId}`);

  try {
    switch (type) {
      case 'ADDRESS_ACTIVITY':
        await processAddressActivity(event ?? {});
        break;
      case 'MINED_TRANSACTION':
        await processMinedTransaction(event ?? {});
        break;
      case 'DROPPED_TRANSACTION':
        await processDroppedTransaction(event ?? {});
        break;
      case 'NFT_ACTIVITY':
        await processNftActivity(event ?? {});
        break;
      case 'GRAPHQL':
        await processGraphqlEvent(event ?? {});
        break;
      default:
        console.log(`[alchemy-webhook] Unhandled type: ${type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    console.error('[alchemy-webhook] Processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
