# Sovran Referral Bot - Deployment Guide

This guide explains how to deploy the Sovran Referral Bot to various environments, including Replit and a dedicated VPS.

## Overview

The Sovran Referral Bot is a Telegram bot designed to support the referral program for the Sovran Vault Network. It features:

- Custom referral link branding
- Interactive onboarding tutorial
- Referral journey visualization
- User and referral tracking

## Prerequisites

Before deployment, ensure you have:

- A Telegram Bot Token (obtain from @BotFather on Telegram)
- Node.js 16.x or higher
- (Optional) MongoDB database for production deployment

## Deployment Options

### 1. Replit Deployment (Recommended)

Replit provides the easiest deployment option with automatic monitoring and restart capabilities.

#### Steps for Replit Deployment:

1. Make sure the following files are present in your project:
   - `sovran-referral-bot.js`: Main bot implementation
   - `tutorial-module.js`: Interactive tutorial functionality
   - `referral-journey-viz.js`: Referral journey visualization
   - `replit-bot-runner.js`: Process manager for Replit environment

2. Set up environment variables in Replit's Secrets tab:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ADMIN_CHAT_IDS=your_telegram_id,another_admin_id
   ```

3. (Optional) For production, set up MongoDB:
   ```
   MONGODB_URI=mongodb://username:password@host:port/database
   ```

4. Configure the Workflow to run the bot:
   - Select "Workflow" in Replit's sidebar
   - Click "+ Add Run Workflow"
   - In "Command", enter: `node replit-bot-runner.js`
   - Name it "Telegram Bot"
   - Click "Add"

5. Click "Run" to start the bot

### 2. VPS Deployment

For more control over the environment, deploy to a VPS:

#### Steps for VPS Deployment:

1. Clone the repository to your server:
   ```bash
   git clone https://github.com/yourusername/sovran-access-bot.git
   cd sovran-access-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with required environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ADMIN_CHAT_IDS=your_telegram_id,another_admin_id
   MONGODB_URI=mongodb://username:password@host:port/database
   ```

4. Install PM2 for process management:
   ```bash
   npm install -g pm2
   ```

5. Start the bot with PM2:
   ```bash
   pm2 start replit-bot-runner.js --name sovran-access-bot
   ```

6. Set up PM2 to start on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

## Monitoring and Maintenance

### Checking Bot Status

1. Run the test script to verify the bot's connection to Telegram:
   ```bash
   node test-bot.js
   ```

2. Check registered users:
   ```bash
   node check-bot-users.js
   ```

### Common Tasks

#### Adding Admin Users

1. Add the Telegram user ID to the ADMIN_CHAT_IDS environment variable (comma-separated)
2. Restart the bot

#### Backing Up User Data

If using file-based storage, back up the data directory:
```bash
cp -r data data_backup_$(date +%Y%m%d)
```

#### Upgrading the Bot

1. Stop the bot (`ctrl+c` in Replit or `pm2 stop sovran-access-bot` on VPS)
2. Pull latest changes or update code
3. Install any new dependencies: `npm install`
4. Start the bot again

## Troubleshooting

### Bot Not Responding

1. Check if the bot process is running
2. Verify the bot token is correct
3. Check if the bot is properly registered with BotFather

### Data Issues

1. Check if data directory exists and has proper permissions
2. Verify JSON files aren't corrupted
3. If using MongoDB, check connection string and database status

## Contact and Support

For issues, questions, or suggestions, please contact:
- Sovran Wealth Fund Support
- Email: info@sovranwealth.org
- Phone: 404-914-3130

---

© 2025 Sovran Wealth Fund. All rights reserved.