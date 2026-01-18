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
  founder: { name: 'Founding Member', color: 0xeab308, position: 4 }
};

const REACTION_ROLES: Record<string, string> = {
  '🏡': 'Community Member',
  '📚': 'Workbook Subscriber',
  '💰': 'Land Fund Investor'
};

const AXIOM_CHANNEL_STRUCTURE: CategoryConfig[] = [
  {
    name: '🌱 WELCOME & ONBOARDING',
    channels: [
      { name: 'welcome', topic: "You're now part of a movement to build generational wealth together", type: 'text' },
      { name: 'get-roles', topic: 'React to get your roles and access more channels', type: 'text' },
      { name: 'our-story', topic: 'Why Axiom exists - the mission and vision', type: 'text' },
      { name: 'how-it-works', topic: '$100/month → fractional land ownership → community wealth', type: 'text' }
    ]
  },
  {
    name: '📚 LEARN',
    channels: [
      { name: 'land-101', topic: 'What is collective land ownership? Why does it matter?', type: 'text' },
      { name: 'wealth-building-basics', topic: 'Financial literacy for our community', type: 'text' },
      { name: 'heir-property-explained', topic: 'The crisis we are solving together', type: 'text' },
      { name: 'ask-the-community', topic: 'No question is too basic - we all learn together', type: 'text' },
      { name: 'resource-library', topic: 'Guides, videos, articles pinned here', type: 'text' }
    ]
  },
  {
    name: '🤝 COMMUNITY',
    channels: [
      { name: 'introductions', topic: 'Tell us your story, where you are from, why you joined', type: 'text' },
      { name: 'wins-and-progress', topic: 'Celebrate each other milestones', type: 'text' },
      { name: 'mutual-support', topic: 'Help each other with questions and encouragement', type: 'text' },
      { name: 'local-chapters', topic: 'Connect with members in your region', type: 'text' }
    ]
  },
  {
    name: '🏡 THE LAND',
    channels: [
      { name: 'land-updates', topic: 'Progress on parcels - photos, videos, real updates', type: 'text' },
      { name: 'steward-spotlights', topic: 'Meet the people managing the land', type: 'text' },
      { name: 'from-the-field', topic: 'Raw, unfiltered content from properties', type: 'text' }
    ]
  },
  {
    name: '📢 ANNOUNCEMENTS',
    channels: [
      { name: 'news', topic: 'Official updates - funding milestones, new parcels', type: 'text' },
      { name: 'events', topic: 'Community calls, Q&As, workshops', type: 'text' }
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
    .setDescription('Learn about the Community Land Fund')
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
        value: '1. Introduce yourself in #introductions\n2. Learn the basics in #how-it-works\n3. Ask questions in #ask-the-community',
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
    .setDescription('Axiom is infrastructure for truth, record-keeping, and reclamation. We help Black families research heir property and build generational wealth through collective land ownership.')
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
      { name: '❓ Questions?', value: 'Ask in #ask-the-community - no question is too basic!', inline: false }
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
