import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionFlagsBits, 
  TextChannel, 
  CategoryChannel,
  EmbedBuilder,
  Colors,
  REST,
  Routes,
  SlashCommandBuilder,
  GuildMember,
  Role,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser
} from 'discord.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1462325620322336852';

let client: Client | null = null;

export interface ChannelConfig {
  name: string;
  topic?: string;
  type: 'text' | 'voice';
}

export interface CategoryConfig {
  name: string;
  channels: ChannelConfig[];
}

const AXIOM_ROLES = {
  member: { name: 'Protocol Member', color: 0x1B3A4B, position: 1 },
  tokenHolder: { name: 'AXM Holder', color: 0x8B7355, position: 2 },
  lpProvider: { name: 'LP Provider', color: 0x2D5016, position: 3 },
  vaultObserver: { name: 'Vault Observer', color: 0x3B82F6, position: 4 },
  contributor: { name: 'Protocol Contributor', color: 0x6B21A8, position: 5 },
  institutional: { name: 'Institutional Observer', color: 0x14B8A6, position: 6 },
  auditor: { name: 'Verified Auditor', color: 0x0EA5E9, position: 7 },
  founder: { name: 'Founding Member', color: 0x8B7355, position: 8 },
  level5: { name: 'Active Participant', color: 0x60A5FA, position: 9 },
  level10: { name: 'Protocol Steward', color: 0x8B5CF6, position: 10 },
  level25: { name: 'Core Contributor', color: 0xF472B6, position: 11 }
};

const XP_LEVELS = [
  { level: 1, xp: 0, title: 'Observer' },
  { level: 2, xp: 100, title: 'Participant' },
  { level: 3, xp: 250, title: 'Contributor' },
  { level: 4, xp: 500, title: 'Analyst' },
  { level: 5, xp: 1000, title: 'Active Participant' },
  { level: 10, xp: 3000, title: 'Protocol Steward' },
  { level: 15, xp: 6000, title: 'Senior Contributor' },
  { level: 25, xp: 15000, title: 'Core Contributor' }
];

const DAILY_TIPS = [
  { title: 'Peg Stability', tip: 'The PSM (Peg Stability Module) maintains the AXUSD 1:1 peg to USDC through mint and redeem operations. Both carry a 10 bps fee.' },
  { title: 'On-Chain Verification', tip: 'All 72 Axiom smart contracts are verified on Arbiscan. You can read and verify every function call directly.' },
  { title: 'Self-Custody', tip: 'Axiom Protocol is non-custodial. Your assets remain in your wallet or in smart contracts you interact with directly. No intermediaries.' },
  { title: 'Solvency Transparency', tip: 'The solvency console at axiomprotocol.app/solvency shows real-time coverage ratios, reserve composition, and stress test results.' },
  { title: 'AME Engine', tip: 'The Adaptive Metrics Engine computes regime scores from 0.0-1.0 based on volatility, drawdown, and flow signals. Higher scores trigger defensive policy actions.' },
  { title: 'Hard Brake Triggers', tip: 'Four hard brake conditions protect the protocol: Crisis Lockdown (RS>0.85), Freeze Distributions (CR<0.5), Liquidity Defense (LD<0.1), Redirect Flows (RR<0.3).' },
  { title: 'DO NOT MIX', tip: 'PRIMARY AXUSD and EULER AXUSD are separate ecosystems. Never deposit Primary AXUSD into Euler vaults or report Euler metrics as public supply.' },
  { title: 'Revenue Routing', tip: 'Protocol revenue flows through the Revenue Router: 90% to LPs, 10% to protocol treasury. All on-chain and verifiable.' },
  { title: 'Arbitrum One', tip: 'Axiom Protocol operates on Arbitrum One (Chain ID 42161), an Ethereum L2 with low gas fees and high throughput.' },
  { title: 'Governance Token', tip: 'AXM is the governance and fee-routing token. It enables community voting on protocol parameters and receives a share of protocol revenue.' },
  { title: 'Observation Window', tip: 'The Euler V2 Vault observation window runs until March 26, 2026. This period validates vault behavior before broader external adoption.' },
  { title: 'Stress Testing', tip: 'The solvency system runs 5 predefined stress scenarios: Market Correction, Liquidity Crisis, Black Swan, Stablecoin Depeg, and Governance Attack.' }
];

const FAQ_RESPONSES: Record<string, { question: string; answer: string }> = {
  'what-is-axiom': {
    question: 'What is Axiom Protocol?',
    answer: 'Axiom Protocol is a DeFi infrastructure project on Arbitrum One with 72 verified smart contracts. It includes a governance token (AXM), stablecoin (AXUSD), Peg Stability Modules, lending markets via Euler V2, and a comprehensive solvency transparency system. The protocol is community-governed and non-custodial.'
  },
  'axusd': {
    question: 'What is AXUSD?',
    answer: 'AXUSD is the protocol stablecoin, pegged 1:1 to USDC via the Peg Stability Module (PSM). You can mint AXUSD by depositing USDC, and redeem USDC by burning AXUSD. Both operations carry a 10 basis point fee. There are two separate AXUSD ecosystems (Primary and Euler) that must never be mixed.'
  },
  'psm': {
    question: 'How does the PSM work?',
    answer: 'The Peg Stability Module accepts USDC deposits and mints AXUSD at a 1:1 ratio (minus 10 bps fee). To redeem, you burn AXUSD and receive USDC from the PSM reserves. The PSM only holds as much USDC as has been deposited through it — AXUSD minted outside the PSM is not backed by PSM reserves.'
  },
  'solvency': {
    question: 'How is solvency measured?',
    answer: 'The solvency console provides three views: Allocator (capital adequacy, asset composition), Clearinghouse (AXUSD stability, stress tests), and Regulatory (compliance, methodology). Coverage ratios and reserve ratios are computed from on-chain data and updated via the Adaptive Metrics Engine.'
  },
  'ame': {
    question: 'What is the AME?',
    answer: 'The Adaptive Metrics Engine is a deterministic financial computation engine. It calculates Regime Scores (0.0-1.0), Policy Multipliers (0.5-2.0), and adaptive targets for coverage and reserve ratios. It has 4 hard brake triggers that automatically activate defensive measures during extreme conditions.'
  },
  'euler-vault': {
    question: 'What is the Euler V2 Vault?',
    answer: 'A permissionless lending market on Arbitrum One where LPs deposit AXUSD to earn yield and borrowers use eUSDC (90% LTV) or eWETH (80% LTV) as collateral. Currently in observation mode until March 26, 2026. Fee split: 90% to LPs, 10% to protocol.'
  },
  'contracts': {
    question: 'How many smart contracts does Axiom have?',
    answer: 'Axiom Protocol has 72 verified smart contracts on Arbitrum One covering identity, treasury, staking, emissions, asset registries, PSM, governance, and lending infrastructure. All contracts are verified on Arbiscan and readable by anyone.'
  },
  'observation-window': {
    question: 'What is the observation window?',
    answer: 'A monitoring period ending March 26, 2026 where vault behavior is observed, metrics collected, and stability validated before broader adoption. This is not an invitation to invest — it is a transparency and validation exercise.'
  }
};

import { Pool } from 'pg';

const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function ensureXPTableExists(): Promise<void> {
  if (!pool) {
    console.log('Database not configured - XP system disabled');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discord_member_xp (
        discord_user_id VARCHAR(50) PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        last_xp_gain TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Discord XP table verified');
  } catch (error) {
    console.error('Failed to create discord_member_xp table:', error);
  }
}

ensureXPTableExists();

async function getMemberXP(userId: string): Promise<{ xp: number; level: number }> {
  if (!pool) return { xp: 0, level: 1 };
  try {
    const result = await pool.query(
      'SELECT xp, level FROM discord_member_xp WHERE discord_user_id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      return { xp: result.rows[0].xp, level: result.rows[0].level };
    }
    return { xp: 0, level: 1 };
  } catch (error) {
    console.error('Failed to get member XP:', error);
    return { xp: 0, level: 1 };
  }
}

async function updateMemberXP(userId: string, xp: number, level: number): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO discord_member_xp (discord_user_id, xp, level, last_xp_gain, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (discord_user_id) 
       DO UPDATE SET xp = $2, level = $3, last_xp_gain = NOW(), updated_at = NOW()`,
      [userId, xp, level]
    );
  } catch (error) {
    console.error('Failed to update member XP:', error);
  }
}

async function getTopMembers(limit: number = 10): Promise<Array<{ discord_user_id: string; xp: number; level: number }>> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT discord_user_id, xp, level FROM discord_member_xp ORDER BY xp DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Failed to get top members:', error);
    return [];
  }
}

const REACTION_ROLES: Record<string, string> = {
  '🔷': 'Protocol Member',
  '💎': 'AXM Holder',
  '🏦': 'Vault Observer'
};

const AXIOM_CHANNEL_STRUCTURE: CategoryConfig[] = [
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

const slashCommands = [
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get Axiom Protocol overview'),
  new SlashCommandBuilder()
    .setName('resources')
    .setDescription('Get links to protocol resources and dashboards'),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('See protocol community statistics'),
  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Get a protocol tip'),
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Get answers to common questions')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('FAQ topic')
        .setRequired(true)
        .addChoices(
          { name: 'What is Axiom Protocol?', value: 'what-is-axiom' },
          { name: 'What is AXUSD?', value: 'axusd' },
          { name: 'How does the PSM work?', value: 'psm' },
          { name: 'How is solvency measured?', value: 'solvency' },
          { name: 'What is the AME?', value: 'ame' },
          { name: 'Euler V2 Vault explained', value: 'euler-vault' },
          { name: 'Smart contracts count', value: 'contracts' },
          { name: 'Observation window', value: 'observation-window' }
        )),
  new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Check your community XP and level'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See the top community contributors'),
  new SlashCommandBuilder()
    .setName('vault')
    .setDescription('Get AXUSD Euler V2 Vault information and status'),
  new SlashCommandBuilder()
    .setName('psm')
    .setDescription('Get PSM (Peg Stability Module) status and information'),
  new SlashCommandBuilder()
    .setName('solvency')
    .setDescription('Get current solvency and reserve transparency information'),
  new SlashCommandBuilder()
    .setName('protocol')
    .setDescription('Get Axiom Protocol overview and key metrics')
];

async function registerSlashCommands() {
  if (!DISCORD_BOT_TOKEN) return;
  
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(client?.user?.id || '', GUILD_ID),
      { body: slashCommands.map(cmd => cmd.toJSON()) }
    );
    console.log('Slash commands registered successfully');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
}

function createWelcomeEmbed(member: GuildMember): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1B3A4B)
    .setTitle('Welcome to Axiom Protocol')
    .setDescription(`**${member.user.username}** — you have joined the official community of Axiom Protocol, a DeFi infrastructure project on Arbitrum One.`)
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: 'Get Oriented', value: '1. Read #protocol-overview for what Axiom is\n2. Select your role in #get-roles\n3. Ask questions in #questions', inline: false },
      { name: 'Protocol Links', value: '[axiomprotocol.app](https://axiomprotocol.app) | [Solvency Console](https://axiomprotocol.app/solvency) | [Arbiscan Contracts](https://arbiscan.io)', inline: false }
    )
    .setFooter({ text: 'Axiom Protocol — Build Wealth Together, On-Chain' })
    .setTimestamp();
}

function createInfoEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1B3A4B)
    .setTitle('Axiom Protocol')
    .setDescription('DeFi infrastructure on Arbitrum One. 72 verified smart contracts. Non-custodial. Community-governed.')
    .addFields(
      { name: 'Core Infrastructure', value: 'AXM governance token, AXUSD stablecoin, Peg Stability Modules, Euler V2 lending markets, solvency transparency system', inline: false },
      { name: 'Current Phase', value: '52-week bootstrap playbook at $100/week. Validating all contracts through real capital flows. Euler Vault in observation mode until March 26, 2026.', inline: false },
      { name: 'Transparency', value: 'All operations are on-chain and verifiable. Solvency metrics, stress tests, and regime scoring are publicly accessible.', inline: false }
    )
    .setFooter({ text: 'axiomprotocol.app — This is not financial advice.' });
}

function createResourcesEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2D5016)
    .setTitle('Axiom Protocol Resources')
    .addFields(
      { name: 'Protocol Dashboard', value: '[axiomprotocol.app](https://axiomprotocol.app)', inline: true },
      { name: 'Solvency Console', value: '[Live Metrics](https://axiomprotocol.app/solvency)', inline: true },
      { name: 'DEX', value: '[Trading](https://axiomprotocol.app/dex)', inline: true },
      { name: 'Smart Contracts', value: '72 verified on [Arbiscan](https://arbiscan.io)', inline: true },
      { name: 'Euler Vault', value: '[Observation Dashboard](https://app.euler.finance)', inline: true },
      { name: 'Questions', value: 'Ask in #questions', inline: true }
    );
}

function createStatsEmbed(memberCount: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1B3A4B)
    .setTitle('Protocol Community')
    .addFields(
      { name: 'Members', value: `**${memberCount.toLocaleString()}**`, inline: true },
      { name: 'Network', value: 'Arbitrum One', inline: true },
      { name: 'Contracts', value: '72 verified', inline: true }
    )
    .setTimestamp();
}

async function ensureRolesExist(guild: any): Promise<Map<string, Role>> {
  const roleMap = new Map<string, Role>();
  
  for (const [key, config] of Object.entries(AXIOM_ROLES)) {
    let role = guild.roles.cache.find((r: Role) => r.name === config.name);
    
    if (!role) {
      try {
        role = await guild.roles.create({
          name: config.name,
          color: config.color,
          reason: 'Axiom Protocol role setup'
        });
        console.log(`Created role: ${config.name}`);
      } catch (error) {
        console.error(`Failed to create role ${config.name}:`, error);
        continue;
      }
    }
    
    roleMap.set(config.name, role);
  }
  
  return roleMap;
}

async function assignMemberRole(member: GuildMember): Promise<boolean> {
  try {
    const roleMap = await ensureRolesExist(member.guild);
    const memberRole = roleMap.get(AXIOM_ROLES.member.name);
    
    if (memberRole && !member.roles.cache.has(memberRole.id)) {
      await member.roles.add(memberRole);
      console.log(`Assigned ${AXIOM_ROLES.member.name} role to ${member.user.username}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to assign member role:', error);
    return false;
  }
}

export async function initializeDiscordBot(): Promise<Client | null> {
  if (!DISCORD_BOT_TOKEN) {
    console.log('Discord bot token not configured');
    return null;
  }

  if (client) {
    return client;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions
    ]
  });

  client.once('ready', async () => {
    console.log(`Discord bot logged in as ${client?.user?.tag}`);
    await registerSlashCommands();
  });

  client.on('guildMemberAdd', async (member) => {
    await assignMemberRole(member);
    
    const welcomeChannel = member.guild.channels.cache.find(
      ch => ch.name === 'welcome' && ch.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (welcomeChannel) {
      const embed = createWelcomeEmbed(member);
      await welcomeChannel.send({ embeds: [embed] });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      switch (commandName) {
        case 'info':
          await interaction.reply({ embeds: [createInfoEmbed()], ephemeral: true });
          break;
        case 'resources':
          await interaction.reply({ embeds: [createResourcesEmbed()], ephemeral: true });
          break;
        case 'stats':
          const memberCount = interaction.guild?.memberCount || 0;
          await interaction.reply({ embeds: [createStatsEmbed(memberCount)] });
          break;
        case 'tip':
          const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
          const tipEmbed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle(randomTip.title)
            .setDescription(randomTip.tip)
            .setFooter({ text: 'Axiom Protocol' });
          await interaction.reply({ embeds: [tipEmbed] });
          break;
        case 'faq':
          const topic = interaction.options.getString('topic', true);
          const faqData = FAQ_RESPONSES[topic];
          if (faqData) {
            const faqEmbed = new EmbedBuilder()
              .setColor(0x1B3A4B)
              .setTitle(faqData.question)
              .setDescription(faqData.answer)
              .setFooter({ text: 'axiomprotocol.app' });
            await interaction.reply({ embeds: [faqEmbed], ephemeral: true });
          } else {
            await interaction.reply({ content: 'FAQ topic not found', ephemeral: true });
          }
          break;
        case 'progress':
          const progressUserId = interaction.user.id;
          const progressData = await getMemberXP(progressUserId);
          const currentLevel = XP_LEVELS.filter(l => progressData.xp >= l.xp).pop() || XP_LEVELS[0];
          const nextLevel = XP_LEVELS.find(l => l.xp > progressData.xp);
          const progressToNext = nextLevel ? Math.round((progressData.xp / nextLevel.xp) * 100) : 100;
          const progressBar = '█'.repeat(Math.floor(progressToNext / 10)) + '░'.repeat(10 - Math.floor(progressToNext / 10));
          
          const progressEmbed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle(`${interaction.user.username}'s Progress`)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
            .addFields(
              { name: 'Level', value: `**${currentLevel.level}** - ${currentLevel.title}`, inline: true },
              { name: 'XP', value: `**${progressData.xp.toLocaleString()}**`, inline: true },
              { name: 'Progress', value: nextLevel ? `${progressBar} ${progressToNext}%\n${progressData.xp}/${nextLevel.xp} XP to Level ${nextLevel.level}` : 'Max level reached!', inline: false }
            )
            .setFooter({ text: 'Axiom Protocol' });
          await interaction.reply({ embeds: [progressEmbed], ephemeral: true });
          break;
        case 'leaderboard':
          const topMembers = await getTopMembers(10);
          
          let leaderboardText = '';
          const medals = ['🥇', '🥈', '🥉'];
          
          for (let i = 0; i < topMembers.length; i++) {
            const memberData = topMembers[i];
            const medal = medals[i] || `${i + 1}.`;
            const level = XP_LEVELS.filter(l => memberData.xp >= l.xp).pop() || XP_LEVELS[0];
            try {
              const member = await interaction.guild?.members.fetch(memberData.discord_user_id);
              leaderboardText += `${medal} **${member?.user.username || 'Unknown'}** - Level ${level.level} (${memberData.xp} XP)\n`;
            } catch {
              leaderboardText += `${medal} **Member** - Level ${level.level} (${memberData.xp} XP)\n`;
            }
          }
          
          const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x1B3A4B)
            .setTitle('Community Leaderboard')
            .setDescription(leaderboardText || 'No members on the leaderboard yet.')
            .setFooter({ text: 'Axiom Protocol' });
          await interaction.reply({ embeds: [leaderboardEmbed] });
          break;
        case 'vault':
          const vaultEmbed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('AXUSD Euler V2 Lending Vault')
            .setDescription('Permissionless lending market on Arbitrum One. Currently in observation mode.')
            .addFields(
              { name: 'Status', value: 'Live - Observation Mode', inline: true },
              { name: 'Window Ends', value: 'March 26, 2026', inline: true },
              { name: 'Network', value: 'Arbitrum One', inline: true },
              { name: 'Collateral', value: 'eUSDC: 90% LTV / 95% Liq\neWETH: 80% LTV / 85% Liq', inline: false },
              { name: 'Fee Structure', value: '90% to LPs\n10% to Revenue Router', inline: false },
              { name: 'View on Euler', value: '[Open Vault](https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059?network=arbitrumone)', inline: false }
            )
            .setFooter({ text: 'axiomprotocol.app — This is not financial advice.' });
          await interaction.reply({ embeds: [vaultEmbed] });
          break;
        case 'psm':
          const psmEmbed = new EmbedBuilder()
            .setColor(0x1B3A4B)
            .setTitle('Peg Stability Module')
            .setDescription('The PSM maintains the AXUSD 1:1 peg to USDC through mint and redeem operations.')
            .addFields(
              { name: 'Primary PSM', value: 'Mint AXUSD with USDC deposits. Redeem USDC by burning AXUSD.', inline: false },
              { name: 'Euler PSM', value: 'Separate PSM for the Euler V2 ecosystem. Do not mix with Primary AXUSD.', inline: false },
              { name: 'Fee Rate', value: '10 basis points (0.10%) on both mint and redeem', inline: false },
              { name: 'Operations Console', value: '[axiomprotocol.app](https://axiomprotocol.app)', inline: false }
            )
            .setFooter({ text: 'axiomprotocol.app' });
          await interaction.reply({ embeds: [psmEmbed], ephemeral: true });
          break;
        case 'solvency':
          const solvencyEmbed = new EmbedBuilder()
            .setColor(0x3B82F6)
            .setTitle('Solvency and Reserve Transparency')
            .setDescription('Real-time solvency metrics computed from on-chain data via the Adaptive Metrics Engine.')
            .addFields(
              { name: 'Allocator View', value: 'Capital adequacy, asset composition, and coverage ratios', inline: false },
              { name: 'Clearinghouse View', value: 'AXUSD stability metrics, stress test results, and peg health', inline: false },
              { name: 'Regulatory View', value: 'Compliance methodology, reserve transparency, and disclosure framework', inline: false },
              { name: 'Solvency Console', value: '[Live Metrics](https://axiomprotocol.app/solvency)', inline: false }
            )
            .setFooter({ text: 'axiomprotocol.app' });
          await interaction.reply({ embeds: [solvencyEmbed], ephemeral: true });
          break;
        case 'protocol':
          const protocolEmbed = new EmbedBuilder()
            .setColor(0x1B3A4B)
            .setTitle('Axiom Protocol Overview')
            .setDescription('DeFi infrastructure on Arbitrum One. Non-custodial. Community-governed.')
            .addFields(
              { name: 'Network', value: 'Arbitrum One (Chain ID 42161)', inline: true },
              { name: 'Smart Contracts', value: '72 verified on Arbiscan', inline: true },
              { name: 'Governance Token', value: 'AXM', inline: true },
              { name: 'Stablecoin', value: 'AXUSD (pegged 1:1 to USDC via PSM)', inline: true },
              { name: 'Lending', value: 'Euler V2 Vault (observation mode)', inline: true },
              { name: 'Current Phase', value: '52-week bootstrap playbook', inline: true },
              { name: 'Protocol Dashboard', value: '[axiomprotocol.app](https://axiomprotocol.app)', inline: false }
            )
            .setFooter({ text: 'axiomprotocol.app — This is not financial advice.' });
          await interaction.reply({ embeds: [protocolEmbed], ephemeral: true });
          break;
        default:
          await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      console.error('Slash command error:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'An error occurred', ephemeral: true });
      }
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const userId = message.author.id;
    const currentData = await getMemberXP(userId);
    
    const xpGain = Math.floor(Math.random() * 5) + 5;
    const newXp = currentData.xp + xpGain;
    
    const oldLevel = XP_LEVELS.filter(l => currentData.xp >= l.xp).pop() || XP_LEVELS[0];
    const newLevel = XP_LEVELS.filter(l => newXp >= l.xp).pop() || XP_LEVELS[0];
    
    await updateMemberXP(userId, newXp, newLevel.level);
    
    if (newLevel.level > oldLevel.level) {
      const levelUpChannel = message.guild.channels.cache.find(
        ch => ch.name === 'announcements' && ch.type === ChannelType.GuildText
      ) as TextChannel | undefined;
      
      if (levelUpChannel) {
        const levelUpEmbed = new EmbedBuilder()
          .setColor(0x1B3A4B)
          .setTitle('Level Up')
          .setDescription(`**${message.author.username}** reached **Level ${newLevel.level}** - ${newLevel.title}`)
          .setThumbnail(message.author.displayAvatarURL({ size: 64 }))
          .setFooter({ text: 'Axiom Protocol' })
          .setTimestamp();
        await levelUpChannel.send({ embeds: [levelUpEmbed] });
      }
      
      if (newLevel.level === 5 || newLevel.level === 10 || newLevel.level === 25) {
        const roleKey = `level${newLevel.level}` as keyof typeof AXIOM_ROLES;
        const roleConfig = AXIOM_ROLES[roleKey];
        if (roleConfig) {
          try {
            const member = await message.guild.members.fetch(userId);
            const roleMap = await ensureRolesExist(message.guild);
            const role = roleMap.get(roleConfig.name);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              console.log(`Awarded ${roleConfig.name} role to ${message.author.username} for reaching level ${newLevel.level}`);
            }
          } catch (error) {
            console.error('Failed to assign level role:', error);
          }
        }
      }
    }
  });

  client.on('messageReactionAdd', async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    if (user.bot) return;
    
    try {
      if (reaction.partial) await reaction.fetch();
      
      const channel = reaction.message.channel as TextChannel;
      if (channel.name !== 'get-roles') return;
      
      const roleName = REACTION_ROLES[reaction.emoji.name || ''];
      if (!roleName) return;
      
      const guild = reaction.message.guild;
      if (!guild) return;
      
      const member = await guild.members.fetch(user.id);
      const roleMap = await ensureRolesExist(guild);
      const role = roleMap.get(roleName);
      
      if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        console.log(`Added ${roleName} role to ${user.username} via reaction`);
      }
    } catch (error) {
      console.error('Reaction role error:', error);
    }
  });

  client.on('messageReactionRemove', async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    if (user.bot) return;
    
    try {
      if (reaction.partial) await reaction.fetch();
      
      const channel = reaction.message.channel as TextChannel;
      if (channel.name !== 'get-roles') return;
      
      const roleName = REACTION_ROLES[reaction.emoji.name || ''];
      if (!roleName) return;
      
      const guild = reaction.message.guild;
      if (!guild) return;
      
      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.find(r => r.name === roleName);
      
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        console.log(`Removed ${roleName} role from ${user.username} via reaction`);
      }
    } catch (error) {
      console.error('Reaction role remove error:', error);
    }
  });

  try {
    await client.login(DISCORD_BOT_TOKEN);
    return client;
  } catch (error) {
    console.error('Failed to login Discord bot:', error);
    return null;
  }
}

export async function getDiscordClient(): Promise<Client | null> {
  if (!client) {
    return await initializeDiscordBot();
  }
  return client;
}

export async function setupRoles(guildId: string): Promise<{ success: boolean; message: string; roles: string[] }> {
  const discordClient = await getDiscordClient();
  if (!discordClient) {
    return { success: false, message: 'Discord bot not initialized', roles: [] };
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const roleMap = await ensureRolesExist(guild);
    return {
      success: true,
      message: 'Roles setup complete',
      roles: Array.from(roleMap.keys())
    };
  } catch (error: any) {
    return { success: false, message: error.message, roles: [] };
  }
}

export async function postRoleSelectionMessage(guildId: string): Promise<boolean> {
  const discordClient = await getDiscordClient();
  if (!discordClient) return false;

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const rolesChannel = channels.find(
      ch => ch?.name === 'get-roles' && ch?.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!rolesChannel) {
      console.error('get-roles channel not found');
      return false;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1B3A4B)
      .setTitle('Select Your Role')
      .setDescription('React below to identify your relationship with Axiom Protocol:')
      .addFields(
        { name: '🔷 Protocol Member', value: 'General community access and protocol updates', inline: false },
        { name: '💎 AXM Holder', value: 'AXM token holder — governance and fee-routing', inline: false },
        { name: '🏦 Vault Observer', value: 'Monitoring Euler V2 vault during observation window', inline: false }
      )
      .setFooter({ text: 'React to this message to get your roles.' });

    const message = await rolesChannel.send({ embeds: [embed] });
    await message.react('🔷');
    await message.react('💎');
    await message.react('🏦');

    return true;
  } catch (error) {
    console.error('Failed to post role selection message:', error);
    return false;
  }
}

export async function createChannelStructure(guildId: string): Promise<{ success: boolean; message: string; created: string[] }> {
  const discordClient = await getDiscordClient();
  if (!discordClient) {
    return { success: false, message: 'Discord bot not initialized', created: [] };
  }

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    return { success: false, message: `Guild ${guildId} not found. Make sure the bot is added to the server.`, created: [] };
  }

  const created: string[] = [];

  try {
    for (const category of AXIOM_CHANNEL_STRUCTURE) {
      const existingCategory = guild.channels.cache.find(
        ch => ch.name === category.name && ch.type === ChannelType.GuildCategory
      );

      let categoryChannel: CategoryChannel;

      if (existingCategory) {
        categoryChannel = existingCategory as CategoryChannel;
        console.log(`Category "${category.name}" already exists`);
      } else {
        categoryChannel = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory
        });
        created.push(`Category: ${category.name}`);
      }

      for (const channel of category.channels) {
        const existingChannel = guild.channels.cache.find(
          ch => ch.name === channel.name && ch.parentId === categoryChannel.id
        );

        if (existingChannel) {
          console.log(`Channel "#${channel.name}" already exists in ${category.name}`);
          continue;
        }

        await guild.channels.create({
          name: channel.name,
          type: channel.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: categoryChannel.id,
          topic: channel.topic
        });
        created.push(`#${channel.name}`);
      }
    }

    return {
      success: true,
      message: `Successfully set up Axiom Protocol channels`,
      created
    };
  } catch (error: any) {
    console.error('Error creating channels:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      created
    };
  }
}

export async function sendMessage(guildId: string, channelName: string, message: string): Promise<boolean> {
  const discordClient = await getDiscordClient();
  if (!discordClient) return false;

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    if (!guild) return false;

    const channels = await guild.channels.fetch();
    const channel = channels.find(
      ch => ch?.name === channelName && ch?.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!channel) {
      console.error(`Channel #${channelName} not found in guild`);
      return false;
    }

    await channel.send(message);
    return true;
  } catch (error) {
    console.error(`Failed to send message to #${channelName}:`, error);
    return false;
  }
}

export async function sendEmbed(guildId: string, channelName: string, embed: EmbedBuilder): Promise<boolean> {
  const discordClient = await getDiscordClient();
  if (!discordClient) return false;

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const channel = channels.find(
      ch => ch?.name === channelName && ch?.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!channel) return false;

    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Failed to send embed to #${channelName}:`, error);
    return false;
  }
}

export async function getGuildList(): Promise<{ id: string; name: string; memberCount: number }[]> {
  const discordClient = await getDiscordClient();
  if (!discordClient) return [];

  return discordClient.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount
  }));
}

export async function getBotStatus(): Promise<{ online: boolean; username?: string; guilds: number }> {
  const discordClient = await getDiscordClient();
  if (!discordClient || !discordClient.user) {
    return { online: false, guilds: 0 };
  }

  return {
    online: true,
    username: discordClient.user.tag,
    guilds: discordClient.guilds.cache.size
  };
}

export async function postDailyTip(guildId: string): Promise<boolean> {
  const tip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
  
  const embed = new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle(`Daily Tip: ${tip.title}`)
    .setDescription(tip.tip)
    .addFields(
      { name: 'Learn More', value: 'Use /protocol for protocol overview, or ask in #questions.', inline: false }
    )
    .setFooter({ text: 'Axiom Protocol' })
    .setTimestamp();

  return await sendEmbed(guildId, 'general-chat', embed);
}

export async function deleteCategory(guildId: string, categoryName: string): Promise<{ success: boolean; message: string; deleted: string[] }> {
  const discordClient = await getDiscordClient();
  if (!discordClient) {
    return { success: false, message: 'Discord bot not initialized', deleted: [] };
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const deleted: string[] = [];

    const category = channels.find(
      ch => ch?.name === categoryName && ch?.type === ChannelType.GuildCategory
    );

    if (!category) {
      return { success: false, message: `Category "${categoryName}" not found`, deleted: [] };
    }

    const childChannels = channels.filter(ch => ch?.parentId === category.id);
    
    for (const [, channel] of childChannels) {
      if (channel) {
        await channel.delete('Cleanup duplicate channels');
        deleted.push(`#${channel.name}`);
      }
    }

    await category.delete('Cleanup duplicate category');
    deleted.push(`Category: ${categoryName}`);

    return { success: true, message: `Deleted category and ${deleted.length - 1} channels`, deleted };
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return { success: false, message: error.message, deleted: [] };
  }
}

export async function cleanupDuplicateCategories(guildId: string): Promise<{ success: boolean; message: string; deleted: string[] }> {
  const validCategoryNames = AXIOM_CHANNEL_STRUCTURE.map(c => c.name);
  const discordClient = await getDiscordClient();
  if (!discordClient) {
    return { success: false, message: 'Discord bot not initialized', deleted: [] };
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const deleted: string[] = [];

    const categories = channels.filter(ch => ch?.type === ChannelType.GuildCategory);
    const categoryCount: Map<string, number> = new Map();

    for (const [, category] of categories) {
      if (category) {
        const count = categoryCount.get(category.name) || 0;
        categoryCount.set(category.name, count + 1);
      }
    }

    for (const [, category] of categories) {
      if (!category) continue;
      
      const isValidName = validCategoryNames.includes(category.name);
      const count = categoryCount.get(category.name) || 0;
      
      if (!isValidName || count > 1) {
        const childChannels = channels.filter(ch => ch?.parentId === category.id);
        
        for (const [, channel] of childChannels) {
          if (channel) {
            await channel.delete('Cleanup old/duplicate channels');
            deleted.push(`#${channel.name}`);
          }
        }

        await category.delete('Cleanup old/duplicate category');
        deleted.push(`Category: ${category.name}`);
        
        if (count > 1) {
          categoryCount.set(category.name, count - 1);
        }
      }
    }

    return { success: true, message: `Cleaned up ${deleted.length} items`, deleted };
  } catch (error: any) {
    console.error('Error cleaning up categories:', error);
    return { success: false, message: error.message, deleted: [] };
  }
}

export async function reorderCategories(guildId: string): Promise<{ success: boolean; message: string; order: string[] }> {
  const discordClient = await getDiscordClient();
  if (!discordClient) {
    return { success: false, message: 'Discord bot not initialized', order: [] };
  }

  const categoryOrder = AXIOM_CHANNEL_STRUCTURE.map(c => c.name);

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const categories = channels.filter(ch => ch?.type === ChannelType.GuildCategory);
    
    const positionUpdates: { channel: string; position: number }[] = [];
    
    for (const [, category] of categories) {
      if (!category) continue;
      
      const orderIndex = categoryOrder.indexOf(category.name);
      if (orderIndex !== -1) {
        positionUpdates.push({ channel: category.id, position: orderIndex });
      }
    }

    positionUpdates.sort((a, b) => a.position - b.position);
    
    for (let i = 0; i < positionUpdates.length; i++) {
      const category = channels.get(positionUpdates[i].channel);
      if (category) {
        await category.setPosition(i);
      }
    }

    return { 
      success: true, 
      message: `Reordered ${positionUpdates.length} categories`, 
      order: categoryOrder.filter(name => positionUpdates.some(p => channels.get(p.channel)?.name === name))
    };
  } catch (error: any) {
    console.error('Error reordering categories:', error);
    return { success: false, message: error.message, order: [] };
  }
}
