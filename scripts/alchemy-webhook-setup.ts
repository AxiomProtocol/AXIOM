import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ALCHEMY_KEY     = process.env.ALCHEMY_API_KEY ?? '';
const WEBHOOK_URL_BASE = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
const WEBHOOK_URL      = `${WEBHOOK_URL_BASE}/api/webhooks/alchemy`;

const NOTIFY_API = 'https://dashboard.alchemy.com/api';

const AXIOM_TREASURY_WALLET = process.env.AXIOM_TREASURY_WALLET ?? '';
const AXAU_CONTRACT   = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const AXUSD_CONTRACT  = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const PAXG_ADDRESS    = '0xfAfD4CB703B25CB22f43D017e7e0d75FEBc26743';

interface WebhookConfig {
  network: string;
  webhookType: string;
  webhookUrl: string;
  isActive: boolean;
  timeSpan?: number;
  appId?: string;
  graphqlQuery?: string;
  addresses?: string[];
}

async function createWebhook(config: WebhookConfig) {
  const res = await fetch(`${NOTIFY_API}/create-webhook`, {
    method: 'POST',
    headers: {
      'X-Alchemy-Token': ALCHEMY_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Failed to create webhook: ${JSON.stringify(json)}`);
  return json;
}

async function listWebhooks() {
  const res = await fetch(`${NOTIFY_API}/team-webhooks`, {
    headers: { 'X-Alchemy-Token': ALCHEMY_KEY },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Failed to list webhooks: ${JSON.stringify(json)}`);
  return json;
}

async function updateWebhookAddresses(webhookId: string, addAddresses: string[]) {
  const res = await fetch(`${NOTIFY_API}/update-webhook-addresses`, {
    method: 'PATCH',
    headers: {
      'X-Alchemy-Token': ALCHEMY_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhook_id: webhookId, addresses_to_add: addAddresses, addresses_to_remove: [] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Failed to update addresses: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  if (!ALCHEMY_KEY) {
    console.error('❌ ALCHEMY_API_KEY not set');
    process.exit(1);
  }

  console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
  console.log('');

  const existing = await listWebhooks();
  console.log(`📋 Existing webhooks: ${existing?.data?.length ?? 0}`);
  for (const wh of existing?.data ?? []) {
    console.log(`   - [${wh.type}] ${wh.id} → ${wh.webhook_url} (active: ${wh.is_active})`);
  }
  console.log('');

  const watchAddresses = [
    AXAU_CONTRACT,
    AXUSD_CONTRACT,
    PAXG_ADDRESS,
    ...(AXIOM_TREASURY_WALLET ? [AXIOM_TREASURY_WALLET] : []),
  ].filter(Boolean);

  console.log('📡 Creating ADDRESS_ACTIVITY webhook...');
  const addressActivity = await createWebhook({
    network: 'ARB_MAINNET',
    webhookType: 'ADDRESS_ACTIVITY',
    webhookUrl: WEBHOOK_URL,
    isActive: true,
    addresses: watchAddresses,
  });
  console.log(`   ✅ Created: ${addressActivity?.data?.id}`);

  console.log('');
  console.log('📡 Creating GRAPHQL webhook — large AXUSD movements (>10k)...');
  const largeAxusdWebhook = await createWebhook({
    network: 'ARB_MAINNET',
    webhookType: 'GRAPHQL',
    webhookUrl: WEBHOOK_URL,
    isActive: true,
    graphqlQuery: `{
      block {
        logs(filter: {
          addresses: ["${AXUSD_CONTRACT}"],
          topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
        }) {
          transaction { hash from { address } to { address } value }
          data
          topics
          account { address }
        }
      }
    }`,
  });
  console.log(`   ✅ Created: ${largeAxusdWebhook?.data?.id}`);

  console.log('');
  console.log('📡 Creating GRAPHQL webhook — PAXG deposits to treasury...');
  const paxgWebhook = await createWebhook({
    network: 'ARB_MAINNET',
    webhookType: 'GRAPHQL',
    webhookUrl: WEBHOOK_URL,
    isActive: true,
    graphqlQuery: `{
      block {
        logs(filter: {
          addresses: ["${PAXG_ADDRESS}"],
          topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
        }) {
          transaction { hash from { address } to { address } }
          data
          topics
        }
      }
    }`,
  });
  console.log(`   ✅ Created: ${paxgWebhook?.data?.id}`);

  console.log('');
  console.log('🎉 All webhooks configured.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Add ALCHEMY_WEBHOOK_SECRET to your environment secrets');
  console.log('  2. Copy the signing key from the Alchemy Dashboard → Webhooks');
  console.log('  3. Add DISCORD_OPERATOR_CHANNEL_ID to route treasury alerts to Discord');
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
