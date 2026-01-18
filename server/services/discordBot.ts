import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, TextChannel, CategoryChannel } from 'discord.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

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

const AXIOM_CHANNEL_STRUCTURE: CategoryConfig[] = [
  {
    name: '🌱 WELCOME & ONBOARDING',
    channels: [
      { name: 'welcome', topic: "You're now part of a movement to build generational wealth together", type: 'text' },
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
      GatewayIntentBits.GuildMembers
    ]
  });

  client.once('ready', () => {
    console.log(`Discord bot logged in as ${client?.user?.tag}`);
  });

  client.on('guildMemberAdd', async (member) => {
    const welcomeChannel = member.guild.channels.cache.find(
      ch => ch.name === 'welcome' && ch.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (welcomeChannel) {
      await welcomeChannel.send(
        `🌱 Welcome to the Axiom Community, **${member.user.username}**!\n\n` +
        `You're now part of a movement building generational wealth through collective land ownership.\n\n` +
        `**Get started:**\n` +
        `• Introduce yourself in <#introductions>\n` +
        `• Learn the basics in <#how-it-works>\n` +
        `• Ask any questions in <#ask-the-community>\n\n` +
        `Together, we're building something that lasts. 🏡`
      );
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

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) return false;

  const channel = guild.channels.cache.find(
    ch => ch.name === channelName && ch.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (!channel) return false;

  try {
    await channel.send(message);
    return true;
  } catch (error) {
    console.error(`Failed to send message to #${channelName}:`, error);
    return false;
  }
}

export async function postFundingUpdate(guildId: string, parcelName: string, fundingPercent: number, totalRaised: number): Promise<boolean> {
  const message = fundingPercent >= 100
    ? `🎉 **MILESTONE REACHED!** 🎉\n\n**${parcelName}** is now fully funded!\n💰 Total raised: $${totalRaised.toLocaleString()}\n\nThank you to everyone who contributed to this historic moment!`
    : `📊 **Funding Update: ${parcelName}**\n\n` +
      `Progress: ${'█'.repeat(Math.floor(fundingPercent / 10))}${'░'.repeat(10 - Math.floor(fundingPercent / 10))} ${fundingPercent}%\n` +
      `Total raised: $${totalRaised.toLocaleString()}\n\n` +
      `Every contribution brings us closer to community ownership! 🌱`;

  return await sendMessage(guildId, 'land-updates', message);
}

export async function postNewMemberAnnouncement(guildId: string, memberCount: number, foundingSpotsRemaining: number): Promise<boolean> {
  const message = `🌱 **New member joined!**\n\n` +
    `Our community has grown to **${memberCount.toLocaleString()}** members.\n` +
    `⏳ Only **${foundingSpotsRemaining.toLocaleString()}** founding member spots remaining!\n\n` +
    `Join us: https://axiomprotocol.app/land-funds`;

  return await sendMessage(guildId, 'news', message);
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
