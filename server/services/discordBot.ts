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
  member: { name: 'Community Member', color: 0x4ade80, position: 1 },
  workbook: { name: 'Workbook Subscriber', color: 0xfbbf24, position: 2 },
  investor: { name: 'Land Fund Investor', color: 0xf59e0b, position: 3 },
  founder: { name: 'Founding Member', color: 0xeab308, position: 4 },
  level5: { name: 'Rising Steward', color: 0x60a5fa, position: 5 },
  level10: { name: 'Land Guardian', color: 0x8b5cf6, position: 6 },
  level25: { name: 'Heritage Keeper', color: 0xf472b6, position: 7 },
  vaultObserver: { name: 'Vault Observer', color: 0x3b82f6, position: 8 },
  landResearcher: { name: 'Land Researcher', color: 0x22c55e, position: 9 },
  communityBuilder: { name: 'Community Builder', color: 0xa855f7, position: 10 },
  institutional: { name: 'Institutional Observer', color: 0x14b8a6, position: 11 },
  auditor: { name: 'Verified Auditor', color: 0x0ea5e9, position: 12 }
};

const XP_LEVELS = [
  { level: 1, xp: 0, title: 'Newcomer' },
  { level: 2, xp: 100, title: 'Explorer' },
  { level: 3, xp: 250, title: 'Learner' },
  { level: 4, xp: 500, title: 'Contributor' },
  { level: 5, xp: 1000, title: 'Rising Steward' },
  { level: 10, xp: 3000, title: 'Land Guardian' },
  { level: 15, xp: 6000, title: 'Community Pillar' },
  { level: 25, xp: 15000, title: 'Heritage Keeper' }
];

const DAILY_TIPS = [
  { title: '🔍 Research Tip', tip: 'Start with what you know! Write down the oldest family member you can remember, their full name, and where they lived.' },
  { title: '📜 Heir Property Fact', tip: 'Heir property occurs when land passes without a will. Across America, this affects billions of dollars worth of family-owned land.' },
  { title: '🏛️ Document Source', tip: 'Historical archives contain valuable records including labor contracts, marriage records, and land patents from the 1800s onward.' },
  { title: '💡 Pro Tip', tip: 'County deed offices often have records going back to the 1800s. Many are now digitized and searchable online.' },
  { title: '📚 Did You Know?', tip: 'Millions of acres of family farmland have been lost over the past century due to unclear title. We help families protect and reclaim their heritage.' },
  { title: '🗂️ Organization Tip', tip: 'Create a family tree chart with dates and locations. This becomes your roadmap for property research.' },
  { title: '⚖️ Legal Insight', tip: 'The Uniform Partition of Heirs Property Act (UPHPA) provides protections against forced partition sales. Check if your state has adopted it.' },
  { title: '🌱 Wealth Building', tip: 'Land is the foundation of generational wealth. Building a legacy starts with ownership.' },
  { title: '📍 Location Matters', tip: 'Focus your research on counties where your family lived longest. Local historical societies can be gold mines of information.' },
  { title: '🤝 Community Power', tip: 'Collective ownership means collective strength. When we pool resources, we can acquire land that benefits everyone.' },
  { title: '🔷 DeFi Tip', tip: 'The AXUSD vault uses overcollateralization to protect lenders. Higher LTV means more capital efficiency, but also more liquidation risk.' },
  { title: '📊 Transparency', tip: 'All protocol transactions are on-chain and verifiable. Check Arbiscan for real-time activity.' }
];

const HEIR_PROPERTY_CHECKLIST = [
  '1. Gather family stories about land ownership',
  '2. Create a family tree going back 4+ generations',
  '3. Identify the county where family land was located',
  '4. Search county deed records for family surnames',
  '5. Check census records (1870-1950) for land ownership clues',
  '6. Look for death certificates and wills in probate court',
  '7. Search historical archives and land patent records',
  '8. Contact living relatives who might have documents',
  '9. Verify current property tax status and ownership',
  '10. Consult with an heir property attorney if needed'
];

const FAQ_RESPONSES: Record<string, { question: string; answer: string }> = {
  'heir-property': {
    question: 'What is heir property?',
    answer: 'Heir property is land that passes from one generation to the next without a will or clear legal documentation. This often happens when someone dies "intestate" (without a will). All legal heirs inherit the property together as "tenants in common," which can include dozens of descendants over time.'
  },
  'workbook-cost': {
    question: 'How much does the Workbook cost?',
    answer: 'The Land Reclamation Workbook is $20/month. It includes AI-powered research assistance, document templates, state-specific guides, and direct support from our team.'
  },
  'land-fund': {
    question: 'How does the Land Fund work?',
    answer: 'The Community Land Fund allows members to pool $100/month toward collective land acquisition. You receive fractional ownership (via blockchain tokens) of real property. This is SEC Reg CF compliant crowdfunding.'
  },
  'get-started': {
    question: 'How do I get started?',
    answer: '1. Introduce yourself in #introductions\n2. Check out #heir-property-101 for the basics\n3. Get your free checklist in #resource-library\n4. Ask questions in #ask-questions\n5. Consider the Workbook ($20/mo) when you\'re ready to dig deeper'
  },
  'find-records': {
    question: 'Where can I find property records?',
    answer: 'Start with: County deed offices, FamilySearch.org (free), Ancestry.com, National Archives, state historical societies, and local libraries. Many counties have digitized records online.'
  },
  'axusd-vault': {
    question: 'What is the AXUSD Vault?',
    answer: 'The AXUSD Euler V2 Vault is a permissionless lending market on Arbitrum One. LPs can deposit AXUSD to earn yield, while borrowers can take loans using eUSDC or eWETH as collateral. It is currently in observation mode until March 26, 2026.'
  },
  'vault-collateral': {
    question: 'What collateral can I use?',
    answer: 'The AXUSD vault accepts two types of collateral:\n• eUSDC (90% Borrow LTV / 95% Liquidation LTV)\n• eWETH (80% Borrow LTV / 85% Liquidation LTV)\nYou must first deposit into Euler\'s USDC or WETH vaults to get the collateral tokens.'
  },
  'observation-window': {
    question: 'What is the observation window?',
    answer: 'The observation window (ending March 26, 2026) is a monitoring period where we observe vault behavior, collect feedback, and ensure everything works correctly before full external adoption. This is not a call to invest—we are building credibility through transparency.'
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
  '🏡': 'Community Member',
  '📚': 'Workbook Subscriber',
  '💰': 'Land Fund Investor'
};

const AXIOM_CHANNEL_STRUCTURE: CategoryConfig[] = [
  {
    name: '🌱 START HERE',
    channels: [
      { name: 'welcome', topic: "You're now part of a movement to build generational wealth together", type: 'text' },
      { name: 'get-roles', topic: 'React to get your roles and access more channels', type: 'text' },
      { name: 'our-story', topic: 'Why Axiom exists - the mission and vision', type: 'text' },
      { name: 'how-it-works', topic: 'From $100/month to fractional land ownership and DeFi tools', type: 'text' },
      { name: 'announcements', topic: 'Official updates, news, and milestones', type: 'text' }
    ]
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: 'introductions', topic: 'Tell us your story - where are you from, why did you join?', type: 'text' },
      { name: 'general-chat', topic: 'Casual conversation and community bonding', type: 'text' },
      { name: 'ask-questions', topic: 'No question is too basic - we all learn together', type: 'text' },
      { name: 'success-stories', topic: 'Share your wins - land found, documents discovered, progress made!', type: 'text' }
    ]
  },
  {
    name: '📚 LEARN',
    channels: [
      { name: 'heir-property-101', topic: 'The basics of heir property and why it matters', type: 'text' },
      { name: 'defi-basics', topic: 'Understanding DeFi, stablecoins, lending, and yield', type: 'text' },
      { name: 'resource-library', topic: 'Guides, videos, articles, and templates', type: 'text' }
    ]
  },
  {
    name: '🔷 AXUSD VAULT',
    channels: [
      { name: 'vault-overview', topic: 'Technical overview of the AXUSD Euler V2 Lending Vault on Arbitrum One', type: 'text' },
      { name: 'weekly-reports', topic: 'Weekly transparency reports on vault metrics: TVL, utilization, and protocol health', type: 'text' },
      { name: 'feedback', topic: 'Share observations, report issues, suggest improvements', type: 'text' }
    ]
  },
  {
    name: '⚖️ GOVERNANCE & TRANSPARENCY',
    channels: [
      { name: 'proposals', topic: 'Active governance proposals and voting discussions', type: 'text' },
      { name: 'treasury-transparency', topic: 'On-chain treasury data and protocol metrics', type: 'text' },
      { name: 'audit-log', topic: 'Real-time on-chain transaction notifications and security events', type: 'text' }
    ]
  },
  {
    name: '🏛️ INSTITUTIONAL',
    channels: [
      { name: 'data-room', topic: 'Due diligence documents, audits, legal disclosures for institutional observers', type: 'text' },
      { name: 'office-hours', topic: 'Scheduled Q&A sessions for allocators and auditors', type: 'text' },
      { name: 'compliance', topic: 'Regulatory disclosures and observation window status', type: 'text' }
    ]
  }
];

const slashCommands = [
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Learn about Axiom and how to get started'),
  new SlashCommandBuilder()
    .setName('resources')
    .setDescription('Get links to key resources and guides'),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('See community statistics'),
  new SlashCommandBuilder()
    .setName('workbook')
    .setDescription('Learn about the Land Reclamation Workbook'),
  new SlashCommandBuilder()
    .setName('landfund')
    .setDescription('Learn about the Community Land Fund'),
  new SlashCommandBuilder()
    .setName('checklist')
    .setDescription('Get the heir property research checklist'),
  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Get a random research tip'),
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Get answers to common questions')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('FAQ topic')
        .setRequired(true)
        .addChoices(
          { name: 'What is heir property?', value: 'heir-property' },
          { name: 'Workbook cost', value: 'workbook-cost' },
          { name: 'Land Fund explained', value: 'land-fund' },
          { name: 'Getting started', value: 'get-started' },
          { name: 'Finding records', value: 'find-records' },
          { name: 'AXUSD Vault explained', value: 'axusd-vault' },
          { name: 'Vault collateral types', value: 'vault-collateral' },
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
    .setDescription('Get AXUSD Euler V2 Vault information and stats')
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
    .setColor(0xfbbf24)
    .setTitle('Welcome to the Axiom Community!')
    .setDescription(`Hey **${member.user.username}**, you're now part of a movement building generational wealth through collective land ownership.`)
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { 
        name: '🌱 Get Started', 
        value: '1. Introduce yourself in #introductions\n2. Learn the basics in #heir-property-101\n3. Ask questions in #ask-questions',
        inline: false 
      },
      { 
        name: '📚 Free Resources', 
        value: 'Get your free Heir Property Checklist in #resource-library',
        inline: true 
      },
      { 
        name: '🏡 The Vision', 
        value: 'Building the first 1,000-acre community-owned land reserve',
        inline: true 
      }
    )
    .setFooter({ text: 'Axiom Protocol - Build Wealth Together, On-Chain' })
    .setTimestamp();
}

function createInfoEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xfbbf24)
    .setTitle('What is Axiom?')
    .setDescription('Axiom is infrastructure for truth, record-keeping, and reclamation. We help families research heir property and build generational wealth through collective land ownership and DeFi tools.')
    .addFields(
      { 
        name: '🌱 Our Mission', 
        value: 'Reclaim what was taken. Build what was denied. Own what is ours.',
        inline: false 
      },
      { 
        name: '📚 Land Reclamation Workbook ($20/mo)', 
        value: 'AI-powered tool to research your family\'s land history and heir property claims.',
        inline: false 
      },
      { 
        name: '🏡 Community Land Fund ($100/mo)', 
        value: 'Pool resources with the community to acquire and develop land together.',
        inline: false 
      }
    )
    .setFooter({ text: 'axiomprotocol.app' });
}

function createResourcesEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle('Axiom Resources')
    .addFields(
      { name: '🌐 Website', value: '[axiomprotocol.app](https://axiomprotocol.app)', inline: true },
      { name: '📖 Workbook', value: '[Start Research](https://axiomprotocol.app/workbook)', inline: true },
      { name: '🏡 Land Fund', value: '[Join Fund](https://axiomprotocol.app/land-funds)', inline: true },
      { name: '📚 Heir Property Guide', value: 'Check #resource-library for the free checklist', inline: false },
      { name: '❓ Questions?', value: 'Ask in #ask-questions - no question is too basic!', inline: false }
    );
}

function createStatsEmbed(memberCount: number): EmbedBuilder {
  const foundingSpots = 5000;
  const spotsRemaining = Math.max(0, foundingSpots - memberCount);
  const progress = Math.min(100, Math.round((memberCount / foundingSpots) * 100));
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
  
  return new EmbedBuilder()
    .setColor(0xfbbf24)
    .setTitle('Community Statistics')
    .addFields(
      { name: '👥 Members', value: `**${memberCount.toLocaleString()}**`, inline: true },
      { name: '🎯 Goal', value: `**${foundingSpots.toLocaleString()}** founding members`, inline: true },
      { name: '⏳ Spots Left', value: `**${spotsRemaining.toLocaleString()}**`, inline: true },
      { name: '📊 Progress', value: `${progressBar} ${progress}%`, inline: false }
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
          reason: 'Axiom community role setup'
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
        case 'workbook':
          const workbookEmbed = new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle('Land Reclamation Workbook')
            .setDescription('AI-powered research tool to help you discover your family\'s land history and potential heir property claims.')
            .addFields(
              { name: '💰 Price', value: '$20/month', inline: true },
              { name: '🔗 Get Started', value: '[axiomprotocol.app/workbook](https://axiomprotocol.app/workbook)', inline: true }
            );
          await interaction.reply({ embeds: [workbookEmbed], ephemeral: true });
          break;
        case 'landfund':
          const landfundEmbed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('Community Land Fund')
            .setDescription('Pool resources with the community to acquire and develop land together. Own fractional shares of real property.')
            .addFields(
              { name: '💰 Contribution', value: '$100/month', inline: true },
              { name: '🔗 Learn More', value: '[axiomprotocol.app/land-funds](https://axiomprotocol.app/land-funds)', inline: true }
            );
          await interaction.reply({ embeds: [landfundEmbed], ephemeral: true });
          break;
        case 'checklist':
          const checklistEmbed = new EmbedBuilder()
            .setColor(0x4ade80)
            .setTitle('📋 Heir Property Research Checklist')
            .setDescription('Follow these steps to research your family\'s land history:')
            .addFields(
              { name: 'Steps', value: HEIR_PROPERTY_CHECKLIST.join('\n'), inline: false },
              { name: '📚 Need Help?', value: 'Get the full Workbook with AI assistance at [axiomprotocol.app/workbook](https://axiomprotocol.app/workbook)', inline: false }
            )
            .setFooter({ text: 'Save this checklist and check off each step as you complete it!' });
          await interaction.reply({ embeds: [checklistEmbed], ephemeral: true });
          break;
        case 'tip':
          const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
          const tipEmbed = new EmbedBuilder()
            .setColor(0x60a5fa)
            .setTitle(randomTip.title)
            .setDescription(randomTip.tip)
            .setFooter({ text: 'Use /tip anytime for more research tips!' });
          await interaction.reply({ embeds: [tipEmbed] });
          break;
        case 'faq':
          const topic = interaction.options.getString('topic', true);
          const faqData = FAQ_RESPONSES[topic];
          if (faqData) {
            const faqEmbed = new EmbedBuilder()
              .setColor(0xfbbf24)
              .setTitle(`❓ ${faqData.question}`)
              .setDescription(faqData.answer)
              .setFooter({ text: 'More questions? Ask in #ask-questions!' });
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
            .setColor(0x8b5cf6)
            .setTitle(`${interaction.user.username}'s Progress`)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
            .addFields(
              { name: '🏆 Level', value: `**${currentLevel.level}** - ${currentLevel.title}`, inline: true },
              { name: '⭐ XP', value: `**${progressData.xp.toLocaleString()}**`, inline: true },
              { name: '📊 Progress', value: nextLevel ? `${progressBar} ${progressToNext}%\n${progressData.xp}/${nextLevel.xp} XP to Level ${nextLevel.level}` : 'Max level reached!', inline: false }
            )
            .setFooter({ text: 'Earn XP by participating in the community!' });
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
            .setColor(0xfbbf24)
            .setTitle('🏆 Community Leaderboard')
            .setDescription(leaderboardText || 'No members on the leaderboard yet. Start participating to earn XP!')
            .setFooter({ text: 'Earn XP by being active in the community!' });
          await interaction.reply({ embeds: [leaderboardEmbed] });
          break;
        case 'vault':
          const vaultEmbed = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle('🔷 AXUSD Euler V2 Lending Vault')
            .setDescription('Permissionless lending market on Arbitrum One. Currently in observation mode.')
            .addFields(
              { name: '📍 Status', value: 'Live - Observation Mode', inline: true },
              { name: '⏳ Window Ends', value: 'March 26, 2026', inline: true },
              { name: '🔗 Network', value: 'Arbitrum One', inline: true },
              { name: '💰 Collateral', value: '• eUSDC: 90% LTV / 95% Liq\n• eWETH: 80% LTV / 85% Liq', inline: false },
              { name: '📊 Fee Structure', value: '• 90% to LPs\n• 10% to Revenue Router', inline: false },
              { name: '🔗 View on Euler', value: '[Open Vault](https://app.euler.finance/vault/0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059?network=arbitrumone)', inline: false }
            )
            .setFooter({ text: 'This is educational information, not financial advice.' });
          await interaction.reply({ embeds: [vaultEmbed] });
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
        ch => ch.name === 'milestones' && ch.type === ChannelType.GuildText
      ) as TextChannel | undefined;
      
      if (levelUpChannel) {
        const levelUpEmbed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🎉 Level Up!')
          .setDescription(`**${message.author.username}** just reached **Level ${newLevel.level}** - ${newLevel.title}!`)
          .setThumbnail(message.author.displayAvatarURL({ size: 64 }))
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
      .setColor(0xfbbf24)
      .setTitle('Choose Your Role')
      .setDescription('React below to get roles that match your journey:')
      .addFields(
        { name: '🏡 Community Member', value: 'General community access', inline: false },
        { name: '📚 Workbook Subscriber', value: 'Access to workbook discussions', inline: false },
        { name: '💰 Land Fund Investor', value: 'Access to investor channels', inline: false }
      )
      .setFooter({ text: 'React to this message to get your roles!' });

    const message = await rolesChannel.send({ embeds: [embed] });
    
    await message.react('🏡');
    await message.react('📚');
    await message.react('💰');

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
      message: `Successfully set up Axiom community channels`,
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

export async function postFundingUpdate(guildId: string, parcelName: string, fundingPercent: number, totalRaised: number): Promise<boolean> {
  const embed = new EmbedBuilder()
    .setColor(fundingPercent >= 100 ? 0x4ade80 : 0xfbbf24)
    .setTitle(fundingPercent >= 100 ? 'MILESTONE REACHED!' : `Funding Update: ${parcelName}`)
    .addFields(
      { name: 'Progress', value: `${'█'.repeat(Math.floor(fundingPercent / 10))}${'░'.repeat(10 - Math.floor(fundingPercent / 10))} ${fundingPercent}%`, inline: false },
      { name: 'Total Raised', value: `$${totalRaised.toLocaleString()}`, inline: true }
    )
    .setTimestamp();

  if (fundingPercent >= 100) {
    embed.setDescription(`**${parcelName}** is now fully funded! Thank you to everyone who contributed to this historic moment!`);
  }

  return await sendEmbed(guildId, 'land-updates', embed);
}

export async function postNewMemberAnnouncement(guildId: string, memberCount: number, foundingSpotsRemaining: number): Promise<boolean> {
  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle('New Member Joined!')
    .setDescription(`Our community has grown to **${memberCount.toLocaleString()}** members.`)
    .addFields(
      { name: 'Founding Spots Remaining', value: `**${foundingSpotsRemaining.toLocaleString()}**`, inline: true }
    )
    .setFooter({ text: 'Join us: axiomprotocol.app/joincommunity' })
    .setTimestamp();

  return await sendEmbed(guildId, 'news', embed);
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
    .setColor(0x60a5fa)
    .setTitle(`📅 Daily Tip: ${tip.title}`)
    .setDescription(tip.tip)
    .addFields(
      { name: '💡 Take Action', value: 'Use `/checklist` to see the full research checklist, or ask questions in #ask-questions!', inline: false }
    )
    .setFooter({ text: 'Axiom Community - Building Generational Wealth Together' })
    .setTimestamp();

  return await sendEmbed(guildId, 'daily-tips', embed);
}

export async function postWeeklyChallenge(guildId: string, challenge: { title: string; description: string; reward: string }): Promise<boolean> {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`🎯 Weekly Challenge: ${challenge.title}`)
    .setDescription(challenge.description)
    .addFields(
      { name: '🏆 Reward', value: challenge.reward, inline: true },
      { name: '⏰ Deadline', value: 'Sunday 11:59 PM EST', inline: true },
      { name: '📝 How to Participate', value: 'Complete the challenge and share your progress in this channel. React with ✅ when done!', inline: false }
    )
    .setFooter({ text: 'Complete challenges to earn XP and climb the leaderboard!' })
    .setTimestamp();

  return await sendEmbed(guildId, 'weekly-challenge', embed);
}

export async function postWorkbookPreview(guildId: string, preview: { title: string; content: string; feature: string }): Promise<boolean> {
  const embed = new EmbedBuilder()
    .setColor(0xfbbf24)
    .setTitle(`📚 Workbook Preview: ${preview.title}`)
    .setDescription(preview.content)
    .addFields(
      { name: '✨ Premium Feature', value: preview.feature, inline: false },
      { name: '🔗 Get the Full Workbook', value: '[Start your subscription](https://axiomprotocol.app/workbook) - Only $20/month', inline: false }
    )
    .setFooter({ text: 'AI-powered research to help you reclaim your family\'s land history' })
    .setTimestamp();

  return await sendEmbed(guildId, 'workbook-previews', embed);
}

export async function postMemberSpotlight(guildId: string, member: { username: string; story: string; achievement: string; avatarUrl?: string }): Promise<boolean> {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('⭐ Member Spotlight')
    .setDescription(`**${member.username}**\n\n${member.story}`)
    .addFields(
      { name: '🏆 Achievement', value: member.achievement, inline: false }
    )
    .setFooter({ text: 'Want to be featured? Share your story in #success-stories!' })
    .setTimestamp();

  if (member.avatarUrl) {
    embed.setThumbnail(member.avatarUrl);
  }

  return await sendEmbed(guildId, 'member-spotlight', embed);
}

export const WEEKLY_CHALLENGES = [
  { title: 'Family Tree Starter', description: 'Create or update your family tree with at least 3 generations. Include names, approximate dates, and locations.', reward: '100 XP + Researcher Badge' },
  { title: 'Document Hunter', description: 'Find and share one historical document related to your family (census, deed, marriage record, etc).', reward: '150 XP + Archivist Badge' },
  { title: 'County Research', description: 'Identify the county where your ancestors lived and research its deed office or historical society.', reward: '100 XP + Explorer Badge' },
  { title: 'Story Collector', description: 'Interview a family elder about land your family owned or worked. Share what you learned.', reward: '200 XP + Storyteller Badge' },
  { title: 'Community Helper', description: 'Help 3 other members with their research questions in #ask-questions.', reward: '150 XP + Mentor Badge' }
];

export const WORKBOOK_PREVIEWS = [
  { title: 'AI Research Assistant', content: 'Our AI helps you search historical databases, interpret old documents, and connect the dots in your family history.', feature: 'Ask questions in plain English and get research guidance tailored to your family\'s unique story.' },
  { title: 'Document Templates', content: 'Professional templates for heir property research, including family tree charts, property timelines, and heir identification worksheets.', feature: 'Download ready-to-use templates that organize your research systematically.' },
  { title: 'State-Specific Guides', content: 'Each Southern state has different laws around heir property. Our guides break down what you need to know for your state.', feature: 'Get step-by-step instructions customized for your state\'s legal requirements.' },
  { title: 'Record Request Letters', content: 'Need to request records from courthouses or historical societies? We have letter templates ready for you.', feature: 'Professionally worded letters that get results - just fill in your details and send.' }
];
