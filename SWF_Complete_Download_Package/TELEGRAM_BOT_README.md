# Sovran Referral Bot - Deployment Guide

## Overview

The Sovran Referral Bot is a Telegram bot designed for the Sovran Vault Network that provides advanced referral tracking, user acquisition, and community engagement features. It includes custom referral link branding, an interactive onboarding tutorial, and referral journey visualization.

Bot Username: @SovranReferralBot

## Key Features

- **User Registration**: Seamless onboarding of new users
- **Referral Tracking**: Advanced tracking system with multi-level referrals
- **Custom Referral Link Branding**: Users can personalize their referral links
- **Interactive Onboarding Tutorial**: Step-by-step guidance for new users
- **Referral Journey Visualization**: Visual representation of referral progress
- **Reward Management**: Automated reward distribution and tracking

## Technical Requirements

- Node.js 16.x or higher
- MongoDB database (for production deployment)
- Telegram Bot Token (already configured)
- Internet-accessible hosting environment (Replit, VPS, etc.)

## Quick Start

1. **Test the bot connection**:
   ```
   node test-bot.js
   ```

2. **Start the bot in development mode**:
   ```
   npm run dev
   ```

3. **Start the bot in production mode**:
   ```
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
MONGODB_URI=mongodb://username:password@host:port/database
SESSION_SECRET=your-secure-session-secret
ADMIN_CHAT_ID=your-telegram-chat-id
```

### Data Storage

The bot can operate with two different storage methods:

1. **File-based storage** (Development only):
   - User data is stored in JSON files in the `data` directory
   - Not recommended for production use

2. **MongoDB storage** (Recommended for Production):
   - Requires a MongoDB connection string in the MONGODB_URI environment variable
   - Provides reliable data persistence and scalability
   - Supports complex queries for analytics

## Deployment Options

### Replit Deployment (Recommended)

1. Fork this Replit project
2. Set the required environment variables in the Replit Secrets panel
3. Deploy using the "Run" button

### VPS Deployment

1. Clone the repository to your VPS
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start with PM2: `pm2 start replit-bot-runner.js --name sovran-bot`

## Monitoring and Maintenance

### Health Checks

The bot includes built-in health checks that can be monitored:

- **Heartbeat**: Logs are generated every 15 minutes to confirm the bot is running
- **Error Tracking**: All errors are logged with timestamps for easy debugging

### Updates and Maintenance

To update the bot:

1. Pull the latest code changes
2. Install any new dependencies: `npm install`
3. Restart the bot: `npm start`

## User Commands

- `/start` - Begin registration or see main menu
- `/register` - Complete registration process
- `/myreferral` - Get your personalized referral link
- `/brand` - Customize your referral link
- `/tutorial` - Access the interactive tutorial
- `/rewards` - Check your current rewards
- `/journey` - View your referral journey visualization
- `/help` - Get help with bot commands

## Admin Commands

- `/admin` - Access admin panel (restricted to admin users)
- `/stats` - View user statistics
- `/broadcast` - Send message to all users
- `/exportdata` - Export user data in CSV format

## Troubleshooting

### Common Issues

1. **Bot Not Responding**:
   - Check if the bot process is running
   - Verify the bot token is correct
   - Ensure internet connectivity

2. **Database Connection Issues**:
   - Verify MongoDB URI is correct
   - Check MongoDB server is accessible
   - Ensure database credentials are valid

3. **Webhook vs. Polling**:
   - By default, the bot uses long polling
   - For production, consider setting up a webhook for better performance

## Contact and Support

For issues, questions, or suggestions, please contact:
- Sovran Wealth Fund Support
- Email: info@sovranwealth.org
- Phone: 404-914-3130

---

© 2025 Sovran Wealth Fund. All rights reserved.