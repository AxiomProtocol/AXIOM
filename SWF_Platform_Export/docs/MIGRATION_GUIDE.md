# Migration Guide from InviteMember to Custom Sovran Referral Bot

This guide will help you migrate from the InviteMember service to our custom Sovran Vault Network referral bot while preserving your existing referral data.

## Why Migrate?

1. **Cost Savings**: Eliminate subscription fees by using our custom solution
2. **Enhanced Features**: Gain access to referral journey visualization, custom branded links, and interactive tutorials
3. **Full Control**: Own your data and customize the system as needed
4. **Improved User Experience**: Provide a more engaging experience for your community

## Data Migration Options

### Option 1: Manual Export/Import (Recommended for Smaller Groups)

1. Export your referral data from InviteMember using their export feature
2. Format the data to match our database schema
3. Import the data into our MongoDB database

### Option 2: API-Based Migration (For Larger Groups)

1. Use the InviteMember API to download all referral data
2. Use our provided conversion script to transform the data
3. Import the converted data to our MongoDB database

### Option 3: Parallel Operation

1. Run both systems in parallel for a transition period
2. Notify users about the upcoming switch
3. Switch off the old system once most users have migrated

## Schema Migration

Our database schema uses the following format:

```javascript
{
  telegramId: String,
  username: String,
  referredBy: String,  // Telegram ID of referrer
  invites: [String],   // Array of Telegram IDs referred by this user
  rewardSent: Boolean,
  joinDate: Date,
  referralBranding: {
    customName: String,
    tagline: String,
    useCustomLink: Boolean
  },
  tutorial: {
    isCompleted: Boolean,
    currentStep: Number,
    lastInteractionTime: Date,
    stepHistory: [Number],
    preferDetailedTutorial: Boolean
  }
}
```

## Communication Plan

When migrating, we recommend the following communication plan:

1. **Announce the Upgrade**: Inform users about the upcoming switch to an improved referral system
2. **Highlight New Features**: Share information about new features like journey visualization
3. **Provide a Timeline**: Give users a clear timeline for the transition
4. **Offer Support**: Provide a support channel for questions during the transition

## Testing Phase

Before fully switching over:

1. Test the bot with a small group of admins
2. Verify that existing referral data is correctly migrated
3. Ensure all features are working as expected
4. Gather feedback and make necessary adjustments

## After Migration

Once migration is complete:

1. Cancel your InviteMember subscription
2. Remove any old bot commands or integrations
3. Update your onboarding materials to reflect the new system
4. Monitor the new system for any issues

## Support

If you need help with migration, please contact support@sovranwealth.org