const GUILD_ID = '1462325620322336852';

interface ChannelConfig {
  name: string;
  topic?: string;
  type: 'text' | 'voice';
}

interface CategoryConfig {
  name: string;
  channels: ChannelConfig[];
}

const CHANNEL_STRUCTURE: CategoryConfig[] = [
  {
    name: 'AXIOM PROTOCOL',
    channels: [
      { name: 'welcome', topic: 'The Official Discord of Axiom Protocol — DeFi infrastructure on Arbitrum One', type: 'text' },
      { name: 'get-roles', topic: 'React to select your protocol role', type: 'text' },
      { name: 'announcements', topic: 'Official protocol updates and milestones', type: 'text' },
      { name: 'protocol-overview', topic: 'What Axiom Protocol is, what it does, and where it stands', type: 'text' }
    ]
  },
  {
    name: 'COMMUNITY',
    channels: [
      { name: 'general-chat', topic: 'Open discussion for the Axiom community', type: 'text' },
      { name: 'introductions', topic: 'Introduce yourself to the community', type: 'text' },
      { name: 'questions', topic: 'Ask anything about Axiom Protocol, AXUSD, or DeFi', type: 'text' },
      { name: 'observations', topic: 'Share market observations and protocol feedback', type: 'text' }
    ]
  },
  {
    name: 'DEFI OPERATIONS',
    channels: [
      { name: 'axusd-peg-stability', topic: 'AXUSD peg tracking, PSM operations, and stability metrics', type: 'text' },
      { name: 'dex-liquidity', topic: 'Camelot DEX pools, LP positions, and trading activity', type: 'text' },
      { name: 'euler-vault', topic: 'Euler V2 AXUSD lending market status and observation window', type: 'text' },
      { name: 'treasury-ops', topic: 'Protocol treasury operations, revenue routing, and capital allocation', type: 'text' }
    ]
  },
  {
    name: 'SOLVENCY & RISK',
    channels: [
      { name: 'solvency-reports', topic: 'Coverage ratios, reserve transparency, and AME evaluations', type: 'text' },
      { name: 'risk-disclosure', topic: 'Protocol risk factors, stress scenarios, and hard brake triggers', type: 'text' },
      { name: 'sentinel-alerts', topic: 'Axiom Sentinel authorization events and circuit breaker status', type: 'text' }
    ]
  },
  {
    name: 'GOVERNANCE',
    channels: [
      { name: 'proposals', topic: 'Protocol governance proposals and voting', type: 'text' },
      { name: 'smart-contracts', topic: '72 verified contracts on Arbitrum One — registry and discussion', type: 'text' },
      { name: 'audit-log', topic: 'On-chain transaction notifications and protocol events', type: 'text' }
    ]
  },
  {
    name: 'INSTITUTIONAL',
    channels: [
      { name: 'data-room', topic: 'Due diligence documents, audits, and disclosures for institutional observers', type: 'text' },
      { name: 'office-hours', topic: 'Scheduled sessions for allocators and auditors', type: 'text' },
      { name: 'compliance', topic: 'Regulatory disclosures, observation window status, and legal framework', type: 'text' }
    ]
  }
];

const ROLES = [
  { name: 'Protocol Member', color: 0x1B3A4B },
  { name: 'AXM Holder', color: 0x8B7355 },
  { name: 'LP Provider', color: 0x2D5016 },
  { name: 'Vault Observer', color: 0x3B82F6 },
  { name: 'Protocol Contributor', color: 0x6B21A8 },
  { name: 'Institutional Observer', color: 0x14B8A6 },
  { name: 'Verified Auditor', color: 0x0EA5E9 },
  { name: 'Founding Member', color: 0x8B7355 },
  { name: 'Active Participant', color: 0x60A5FA },
  { name: 'Protocol Steward', color: 0x8B5CF6 },
  { name: 'Core Contributor', color: 0xF472B6 },
];

const API = 'https://discord.com/api/v10';
let TOKEN = '';

async function getToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  const res = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  );
  const data = await res.json();
  return data.items?.[0]?.settings?.access_token;
}

async function api(method: string, path: string, body?: any): Promise<any> {
  const opts: any = {
    method,
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json',
    }
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(API + path, opts);
  
  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get('retry-after') || '2');
    console.log(`  Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000 + 500));
    return api(method, path, body);
  }
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  
  if (res.status === 204) return null;
  return res.json();
}

async function deploy() {
  console.log('=== AXIOM PROTOCOL DISCORD DEPLOYMENT ===');
  console.log('Using Discord REST API with OAuth2 token');
  console.log('');

  TOKEN = await getToken();
  if (!TOKEN) {
    console.error('Failed to get Discord token');
    process.exit(1);
  }

  const me = await api('GET', '/users/@me');
  console.log('Authenticated as:', me.username);
  console.log('');

  // Step 1: Get existing guild state
  console.log('[1/4] Reading current server state...');
  const existingChannels = await api('GET', `/guilds/${GUILD_ID}/channels`);
  const existingRoles = await api('GET', `/guilds/${GUILD_ID}/roles`);
  console.log(`  Found ${existingChannels.length} channels, ${existingRoles.length} roles`);
  console.log('');

  // Step 2: Create roles
  console.log('[2/4] Setting up protocol roles...');
  let rolesCreated = 0;
  for (const role of ROLES) {
    const exists = existingRoles.find((r: any) => r.name === role.name);
    if (exists) {
      console.log(`  Role "${role.name}" already exists`);
    } else {
      try {
        await api('POST', `/guilds/${GUILD_ID}/roles`, {
          name: role.name,
          color: role.color,
          mentionable: false,
          permissions: '0'
        });
        console.log(`  Created role: ${role.name}`);
        rolesCreated++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        console.log(`  Failed to create role "${role.name}": ${e.message.substring(0, 100)}`);
      }
    }
  }
  console.log(`  ${rolesCreated} new roles created`);
  console.log('');

  // Step 3: Create channel structure
  console.log('[3/4] Creating channel structure...');
  let channelsCreated = 0;
  
  for (const category of CHANNEL_STRUCTURE) {
    let categoryChannel = existingChannels.find(
      (ch: any) => ch.name === category.name && ch.type === 4
    );
    
    if (!categoryChannel) {
      try {
        categoryChannel = await api('POST', `/guilds/${GUILD_ID}/channels`, {
          name: category.name,
          type: 4
        });
        console.log(`  Created category: ${category.name}`);
        channelsCreated++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        console.log(`  Failed to create category "${category.name}": ${e.message.substring(0, 100)}`);
        continue;
      }
    } else {
      console.log(`  Category "${category.name}" exists`);
    }

    // Refresh channel list to include newly created category
    const currentChannels = await api('GET', `/guilds/${GUILD_ID}/channels`);
    
    for (const channel of category.channels) {
      const exists = currentChannels.find(
        (ch: any) => ch.name === channel.name && ch.parent_id === categoryChannel.id
      );
      
      if (exists) {
        // Update topic if different
        if (channel.topic && exists.topic !== channel.topic) {
          try {
            await api('PATCH', `/channels/${exists.id}`, { topic: channel.topic });
            console.log(`    Updated topic for #${channel.name}`);
            await new Promise(r => setTimeout(r, 500));
          } catch (e: any) {
            console.log(`    Failed to update #${channel.name}: ${e.message.substring(0, 80)}`);
          }
        } else {
          console.log(`    #${channel.name} exists`);
        }
      } else {
        try {
          await api('POST', `/guilds/${GUILD_ID}/channels`, {
            name: channel.name,
            type: channel.type === 'voice' ? 2 : 0,
            parent_id: categoryChannel.id,
            topic: channel.topic
          });
          console.log(`    Created #${channel.name}`);
          channelsCreated++;
          await new Promise(r => setTimeout(r, 500));
        } catch (e: any) {
          console.log(`    Failed to create #${channel.name}: ${e.message.substring(0, 80)}`);
        }
      }
    }
  }
  console.log(`  ${channelsCreated} new channels/categories created`);
  console.log('');

  // Step 4: Update server name/description
  console.log('[4/4] Updating server metadata...');
  try {
    // OAuth2 user tokens with MANAGE_GUILD can modify guild
    // But we need the bot scope for this, so let's just try
    const guild = await api('GET', `/guilds/${GUILD_ID}`);
    console.log(`  Current name: "${guild.name}"`);
    
    if (guild.name !== 'Axiom Protocol') {
      try {
        await api('PATCH', `/guilds/${GUILD_ID}`, {
          name: 'Axiom Protocol',
          description: 'The Official Discord of Axiom Protocol — DeFi infrastructure on Arbitrum One. 72 verified smart contracts. Non-custodial. Community-governed.'
        });
        console.log('  Updated server name to "Axiom Protocol"');
      } catch (e: any) {
        console.log(`  Could not update server name: ${e.message.substring(0, 100)}`);
        console.log('  (You may need to update the server name manually in Discord settings)');
      }
    }
  } catch (e: any) {
    console.log(`  Could not read guild: ${e.message.substring(0, 100)}`);
  }
  
  console.log('');
  console.log('=== DEPLOYMENT COMPLETE ===');
  console.log('The Official Discord of Axiom Protocol channel structure is live.');
}

deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
