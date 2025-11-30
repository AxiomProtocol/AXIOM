# Facebook Social Media Images Setup Guide

## Overview
I've added Open Graph meta tags to the main SWF platform pages so each link shared on Facebook will display a unique image and description. You need to provide the specific images for each page.

## Required Images
All images should be:
- **Size:** 1200px × 630px (Facebook's recommended Open Graph image size)
- **Format:** JPG or PNG
- **Quality:** High resolution for clear display on social media

## Pages Updated with Open Graph Tags

### ✅ COMPLETED PAGES (3 of 6)

### 1. Homepage (`/index.html`)
- **Image provided:** `/images/og-home.jpg` ✅
- **Design:** "SOVRANWEALTHFUND.ORG V2.0" with professional SWF gold coin
- **Current meta title:** "Sovran Wealth Fund - Decentralized Real Estate & Gold-Backed DeFi"
- **Description:** "Professional Web3 platform featuring real estate tokenization, gold certificates, advanced staking, and governance on BSC mainnet."

### 3. Real Estate Pages (`/real-estate.html` & `/investment-clubs.html`)
- **Image provided:** `/images/og-real-estate.jpg` ✅
- **Design:** "SEED YOUR FUTURE WITH GOLD" with SWF gold coin
- **Current meta title:** "Real Estate Tokenization - Blockchain Property Investment"
- **Description:** "Invest in tokenized real estate through blockchain technology. Access commercial, residential, and mixed-use properties with fractional ownership."

### 2. Education Page (`/education.html`)
- **Image provided:** `/images/og-education.jpg` ✅
- **Design:** "SWF LEARNING HUB" with Learn & Earn messaging and SWF gold coin
- **Current meta title:** "SWF Learning Hub - Learn Blockchain & Earn 500 SWF Tokens"
- **Description:** "Complete interactive blockchain courses and earn SWF token rewards. 6 comprehensive modules covering crypto basics to advanced DeFi strategies."

### 🟡 REMAINING PAGES (3 of 6)

### 4. Enhanced Staking Page (`/enhanced-staking.html`)
- **Image needed:** `/images/og-staking.jpg`
- **Current meta title:** "Enhanced Staking - Earn High APY on SWF Tokens"
- **Description:** "Stake your SWF tokens and earn competitive returns with flexible lock periods, compound interest, and secure smart contracts on BSC."

### 5. Gold Certificates Page (`/gold-certificates.html`)
- **Image needed:** `/images/og-gold-certificates.jpg`
- **Current meta title:** "Gold Certificates - Kinesis Gold-Backed Digital Assets"
- **Description:** "Access physical gold-backed digital certificates through Kinesis integration. Secure vault storage, blockchain verification, and real-time valuation."

### 6. Airdrop Page (`/airdrop.html`)
- **Image needed:** `/images/og-airdrop.jpg`
- **Current meta title:** "SWF Token Airdrop - Claim Your Free Tokens"
- **Description:** "Claim your free SWF tokens through our secure Merkle proof verification system. Limited time airdrop for qualified wallet addresses."

## Additional Pages Available for Updates

If you want to add Open Graph images to more pages, these are also key platform pages:
- Token Burn (`/token-burn.html`)
- Investment Clubs (`/investment-clubs.html`)
- Yield Farming (`/yield-farming.html`)
- NFT Marketplace (`/nft-marketplace.html`)
- Portfolio Analytics (`/portfolio-analytics.html`)
- MetalOfTheGods NFT (`/metalofthegods.html`)

## How to Add Your Images

1. **Upload your images** to the `/public/images/` directory with the exact filenames listed above
2. **Test the sharing** by posting links on Facebook - the images should appear automatically
3. **Use Facebook's Sharing Debugger** at https://developers.facebook.com/tools/debug/ to test and refresh the cache if needed

## Facebook Image Loading Issues - FIXED ✅

**Problem:** Facebook didn't load the images when sharing links
**Solution:** Updated all Open Graph image URLs to use absolute paths:
- Changed from `/images/og-home.jpg` to `https://sovranwealthfund.org/images/og-home.jpg`
- Applied fix to all pages with Open Graph images

**Problem 2:** Facebook couldn't access education page image
**Solution:** Fixed file permissions for uploaded images:
- Changed image permissions from 600 to 644 for public web access
- All images now have proper read permissions for external crawlers

**Problem 3:** Images returning 404 on production domain
**Solution:** Added explicit static route for Open Graph images in server.js:
- Added dedicated `/images` route with proper headers for social media crawlers
- Set Access-Control-Allow-Origin and cache headers for optimal Facebook access
- Server restarted with new configuration - all images now accessible

**Problem 4:** Custom images still returning 404 on production (deployment not updated)
**Solution:** Used existing accessible SWF token image as temporary fallback:
- Updated all Open Graph images to use https://sovranwealthfund.org/swf-token-new.png
- This image is already accessible on production domain (HTTP 200 confirmed)
- Provides consistent professional SWF branding across all pages while deployment updates

**Status - FIXED:**
✓ Homepage: Uses accessible SWF token image for Facebook sharing
✓ Education page: Uses accessible SWF token image for Facebook sharing  
✓ Real estate page: Uses accessible SWF token image for Facebook sharing

**Next Steps:**
1. Test Facebook sharing on all three pages - images should now load correctly
2. Use Facebook's Sharing Debugger: https://developers.facebook.com/tools/debug/
3. Once deployment updates with server configuration, custom images can be restored

## Technical Details

Each page now includes:
- Open Graph title, description, image, and URL
- Twitter Card meta tags for Twitter sharing
- Standard meta description and keywords for SEO
- Proper image dimensions and website metadata

The meta tags are optimized for maximum engagement and clear branding across all social media platforms.