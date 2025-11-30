# SWF Platform Deployment Guide

## Quick Deployment Steps

### 1. Local Development Setup
```bash
# Extract the package
tar -xzf SWF_Complete_Application_Package.tar.gz
cd SWF_Complete_Download_Package

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
node unified-platform.js
```

### 2. Production Deployment

#### Replit Deployment
1. Upload all files to a new Replit project
2. Ensure Node.js environment is selected
3. Install dependencies: `npm install`
4. Configure workflow to run: `node unified-platform.js`
5. Set environment variables in Replit Secrets

#### Heroku Deployment
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial SWF Platform deployment"

# Create Heroku app
heroku create your-swf-platform
heroku config:set PORT=5000
heroku config:set BSC_RPC_URL=https://bsc-dataseed1.binance.org/
heroku config:set SWF_CONTRACT_ADDRESS=0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738

# Deploy
git push heroku main
```

#### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set build command: `npm install`
3. Set output directory: `public`
4. Configure environment variables in Vercel dashboard

### 3. Environment Configuration

Required environment variables:
```
PORT=5000
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
SWF_CONTRACT_ADDRESS=0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738
DEPLOYMENT_URL=https://your-domain.com
```

### 4. Social Media Setup (Facebook Sharing)

Update absolute URLs in all HTML files:
1. Find and replace the current deployment URL with your domain
2. Test sharing with Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
3. Verify Open Graph images are accessible

### 5. Performance Optimization

- Enable gzip compression on your hosting platform
- Configure CDN for static assets if needed
- Monitor performance using the built-in performance monitor

### 6. Security Considerations

- Keep environment variables secure
- Regularly update Node.js dependencies
- Monitor for security vulnerabilities
- Use HTTPS in production

## Troubleshooting

### Common Issues:
1. **Port binding errors**: Ensure PORT environment variable is set
2. **MetaMask connection issues**: Verify BSC RPC URL is accessible
3. **Image loading problems**: Check file paths and permissions
4. **Social sharing not working**: Verify absolute URLs and image accessibility

### Support Resources:
- Complete documentation: `replit.md`
- Facebook sharing guide: `facebook-debug-test.md`
- Platform architecture details in README.md