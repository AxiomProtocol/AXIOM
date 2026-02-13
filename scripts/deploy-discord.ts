import { initializeDiscordBot, createChannelStructure, setupRoles, cleanupDuplicateCategories, reorderCategories, postRoleSelectionMessage, getBotStatus } from '../server/services/discordBot';

const GUILD_ID = '1462325620322336852';

async function deploy() {
  console.log('=== AXIOM PROTOCOL DISCORD DEPLOYMENT ===');
  console.log('');
  
  console.log('[1/6] Initializing Discord bot...');
  const client = await initializeDiscordBot();
  if (!client) {
    console.error('FAILED: Could not initialize Discord bot. Check DISCORD_BOT_TOKEN.');
    process.exit(1);
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const status = await getBotStatus();
  console.log('Bot status:', status.online ? 'ONLINE' : 'OFFLINE', status.username || '');
  console.log('');
  
  console.log('[2/6] Setting up protocol roles...');
  const rolesResult = await setupRoles(GUILD_ID);
  console.log('Roles:', rolesResult.success ? 'OK' : 'FAILED', rolesResult.message);
  if (rolesResult.roles.length > 0) {
    rolesResult.roles.forEach(r => console.log('  -', r));
  }
  console.log('');
  
  console.log('[3/6] Cleaning up old/duplicate categories...');
  const cleanupResult = await cleanupDuplicateCategories(GUILD_ID);
  console.log('Cleanup:', cleanupResult.success ? 'OK' : 'FAILED', cleanupResult.message);
  if (cleanupResult.deleted.length > 0) {
    cleanupResult.deleted.forEach(d => console.log('  Deleted:', d));
  }
  console.log('');
  
  console.log('[4/6] Creating Axiom Protocol channel structure...');
  const channelResult = await createChannelStructure(GUILD_ID);
  console.log('Channels:', channelResult.success ? 'OK' : 'FAILED', channelResult.message);
  if (channelResult.created.length > 0) {
    channelResult.created.forEach(c => console.log('  Created:', c));
  } else {
    console.log('  All channels already exist');
  }
  console.log('');
  
  console.log('[5/6] Reordering categories...');
  const reorderResult = await reorderCategories(GUILD_ID);
  console.log('Reorder:', reorderResult.success ? 'OK' : 'FAILED', reorderResult.message);
  console.log('');
  
  console.log('[6/6] Posting role selection message...');
  const rolePostResult = await postRoleSelectionMessage(GUILD_ID);
  console.log('Role selection message:', rolePostResult ? 'POSTED' : 'FAILED');
  console.log('');
  
  console.log('=== DEPLOYMENT COMPLETE ===');
  
  setTimeout(() => process.exit(0), 2000);
}

deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
