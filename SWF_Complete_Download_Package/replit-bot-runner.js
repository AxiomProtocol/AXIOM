/**
 * Replit Bot Runner for Sovran Referral Bot
 * 
 * This script is specifically designed to run the Sovran Referral Bot
 * in the Replit environment. It handles environment setup, persistent 
 * storage, and proper error handling.
 */

// Load environment variables
require('dotenv').config();

// Import required modules
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ASCII Art Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███████╗ ██████╗ ██╗   ██╗██████╗  █████╗ ███╗   ██╗       ║
║   ██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗████╗  ██║       ║
║   ███████╗██║   ██║██║   ██║██████╔╝███████║██╔██╗ ██║       ║
║   ╚════██║██║   ██║╚██╗ ██╔╝██╔══██╗██╔══██║██║╚██╗██║       ║
║   ███████║╚██████╔╝ ╚████╔╝ ██║  ██║██║  ██║██║ ╚████║       ║
║   ╚══════╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝       ║
║                                                               ║
║   █████╗  ██████╗ ██████╗███████╗███████╗███████╗            ║
║  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝            ║
║  ███████║██║     ██║     █████╗  ███████╗███████╗            ║
║  ██╔══██║██║     ██║     ██╔══╝  ╚════██║╚════██║            ║
║  ██║  ██║╚██████╗╚██████╗███████╗███████║███████║            ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝            ║
║                                                               ║
║              🤖  TELEGRAM BOT - REPLIT RUNNER  🤖             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Configuration
const BOT_SCRIPT = './sovran-referral-bot.js';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DATA_DIR = path.join(__dirname, 'data');

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log(`📁 Creating data directory at ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check if MongoDB URI is set
if (!process.env.MONGODB_URI) {
  console.log('⚠️ No MongoDB URI found. Using file-based storage in data/ directory.');
  console.log('💡 This will persist data between sessions, but for production use, set the MONGODB_URI environment variable.');
} else {
  console.log('✅ MongoDB URI found. Using persistent database storage.');
}

// Set environment variables
process.env.TELEGRAM_BOT_TOKEN = TELEGRAM_BOT_TOKEN;
process.env.DATA_DIR = DATA_DIR;

console.log('🚀 Starting Sovran Referral Bot...');

// Function to start the bot
function startBot() {
  const bot = spawn('node', [BOT_SCRIPT], {
    env: process.env,
    stdio: 'inherit'
  });

  bot.on('error', (error) => {
    console.error('❌ Failed to start bot:', error);
  });

  bot.on('close', (code) => {
    if (code !== 0) {
      console.log(`❌ Bot exited with code ${code}. Restarting in 5 seconds...`);
      setTimeout(startBot, 5000);
    }
  });

  return bot;
}

// Start the bot
const botProcess = startBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping bot...');
  botProcess.kill();
  process.exit(0);
});

// Keep the process alive
setInterval(() => {
  // Heartbeat to keep the process alive
}, 60000);