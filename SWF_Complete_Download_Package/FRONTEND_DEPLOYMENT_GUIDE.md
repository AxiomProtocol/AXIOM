# Sovran Wealth Fund Frontend Deployment Guide

This guide provides step-by-step instructions for deploying the Sovran Wealth Fund frontend application.

## Development Phases

The frontend development is organized into several phases as outlined in the `DEPLOYMENT_PHASES.md` document:

1. **Phase 1**: Core Components & Wallet Integration (Completed)
2. **Phase 2**: Basic Transaction Functionality (Completed)
3. **Phase 3**: Enhanced UI Components (In Progress)
4. **Phase 4**: Advanced User Features (Planned)
5. **Phase 5**: Mainnet Deployment & Production Optimizations (Planned)
6. **Phase 6**: Extended Ecosystem Integration (Future Consideration)

Each phase builds upon the previous one and introduces new features and improvements.

## Development Environment Setup

1. **Install Dependencies**

```bash
cd frontend
npm install
```

2. **Configure Environment Variables**

Create a `.env` file in the frontend directory with the contract addresses:

```
REACT_APP_SWF_TOKEN_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
REACT_APP_SWF_BASKET_VAULT_ADDRESS=0x883FaE02D319a5B7E67269bB21276B3e73DB43C9
REACT_APP_SOLO_METHOD_ENGINE_ADDRESS=0x8b7fD126e94A086B066bb3166Bb17834a09Ac73d
REACT_APP_DYNAMIC_APR_CONTROLLER_ADDRESS=0xFC49C9e14F5C40f0d91A248C6c8B77Cf8F55a748
```

3. **Start the Development Server**

```bash
npm start
```

Or use the provided script:

```bash
./start-frontend.sh
```

The application will be available at http://localhost:3000.

## Testing Against Different Networks

### Local Development (Hardhat)

1. Start a local Hardhat node:

```bash
npx hardhat node
```

2. Deploy the contracts to the local node:

```bash
npx hardhat run scripts/deployDynamicSystem.js --network localhost
```

3. Update the contract addresses in the `.env` file with the local addresses.

### Polygon Mainnet Deployment

1. Ensure you have real POL in your wallet for transaction gas.
2. Deploy the contracts to Polygon Mainnet:

```bash
npx hardhat run scripts/deployDynamicSystem.js --network polygon
```

3. Update the contract addresses in the `.env` file with the verified deployed contract addresses:
   - SWF Token: 0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
   - Other contract addresses as needed

## Production Deployment

### Building for Production

Create an optimized production build:

```bash
cd frontend
npm run build
```

This creates a `build` directory with the production-ready files.

### Deployment Options

#### Option 1: Static Hosting (Netlify, Vercel, GitHub Pages)

1. Create a production build as described above.
2. Upload the contents of the `build` directory to your static hosting provider.
3. Configure environment variables in your hosting provider's dashboard.

#### Option 2: Traditional Web Server (Nginx, Apache)

1. Create a production build as described above.
2. Copy the contents of the `build` directory to your web server's public directory.
3. Configure your web server to serve the application and handle client-side routing.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment Steps

### Verification

1. Test wallet connection functionality
2. Verify contract interactions (deposit, withdraw, stake, claim)
3. Test on different browsers and devices
4. Check network switching behavior

### Monitoring

Consider setting up:
- Error tracking (e.g., Sentry)
- Analytics (e.g., Google Analytics)
- Uptime monitoring (e.g., UptimeRobot)

## Maintenance

### Updates

To update the application:

1. Make changes to the codebase
2. Test thoroughly in a development environment
3. Create a new production build
4. Deploy the new build following the steps above

### Contract Address Updates

If contract addresses change:
1. Update the addresses in the environment variables
2. Rebuild and redeploy the application

## New Components in Phase 3

Phase 3 introduces several enhanced UI components:

### Transaction History Component

The Transaction History component (`TransactionHistory.jsx`) provides:
- A chronological view of user transactions (newest first)
- Visual differentiation between transaction types with color-coded badges
- Transaction status indicators
- Links to block explorer for each transaction
- Amount and timestamp information
- Empty state display when no transactions exist

### APR Visualization Component

The APR Visualization component (`APRVisualization.jsx`) enables:
- Visual representation of how vault deposits affect APR
- Interactive simulation of APR changes based on deposit amounts
- Current APR indicator
- Deposit threshold markers
- Comparison between current and simulated APRs

### Transaction Modal Component

The Transaction Modal component (`TransactionModal.jsx`) provides:
- Contextual modal displays for transaction states (confirm, pending, success, error)
- Transaction hash display with block explorer link
- Appropriate action buttons based on transaction state
- Animated transitions between states

### Error Handler Component

The Error Handler component (`ErrorHandler.jsx`) offers:
- Standardized error categorization
- User-friendly error messages
- Suggested solutions for common issues
- Retry functionality where applicable

### Loading Indicator Component

The Loading Indicator component (`LoadingIndicator.jsx`) includes:
- Multiple loading indicator styles (spinner, dots, progress, pulse, skeleton)
- Various size options
- Optional text messages
- Full-screen or inline display options

## Enhanced Dashboard Integration

The Enhanced Dashboard (`EnhancedDashboard.jsx`) integrates all these components into a cohesive experience:
- Wallet connection and network management
- Contract interaction via the VaultDashboard and StakingDashboard
- Transaction tracking and history display
- APR visualization and simulation
- Enhanced error handling
- Improved loading states

## Troubleshooting

### Common Issues

1. **Wallet Connection Problems**
   - Ensure MetaMask or other wallet is installed and unlocked
   - Check console for connection errors
   - Verify the browser supports Web3 wallet connections
   - Try using the "Switch to Enhanced UI" option if basic UI is not connecting

2. **Contract Interaction Failures**
   - Verify the contract addresses in the environment variables
   - Check that the user has sufficient token balance and network currency (POL)
   - Verify ABI compatibility with deployed contracts
   - Examine the transaction modal for specific error messages
   - Check the ErrorHandler component for suggested solutions

3. **Network Issues**
   - Ensure the user is connected to a supported network
   - Check RPC endpoint availability
   - Try alternative RPC endpoints if Polygon nodes are congested
   - Verify the network switching functionality works as expected

4. **UI Rendering Problems**
   - Clear browser cache
   - Update to the latest version of the application
   - Check browser console for JavaScript errors
   - Try toggling between Basic and Enhanced UI modes