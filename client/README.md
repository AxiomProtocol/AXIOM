# Sovran Wealth Fund dApp

Modern frontend for the Sovran Wealth Fund platform that empowers Indigenous communities through cutting-edge blockchain technology.

## Features

### 1. Wallet Connection
- Seamless integration with MetaMask and other Web3 wallets
- Auto-reconnection on page reload
- Chain detection with BSC switch prompt
- Address display with copy/truncate functionality
- Wallet dropdown menu with disconnect option

### 2. Step Progress Banner
The Step Progress Banner guides users through the key actions of the Sovran Wealth Fund platform:
- **Step 1: Connect Wallet** - Connect your wallet to access the platform
- **Step 2: Stake** - Stake SWF tokens for a 25% APR
- **Step 3: Add Liquidity** - Provide liquidity to earn fees
- **Step 4: Swap** - Exchange tokens efficiently
- **Step 5: Govern** - Participate in community governance

Features:
- Interactive step navigation with animated transitions
- Visual progress tracking with completed/current/upcoming states
- Persistent progress tracking using localStorage
- Mobile-responsive design that adapts to all screen sizes

### 3. Address Verification Tool
- Verify any Ethereum/BSC address and understand its role in the SWF ecosystem
- Automatically detect special addresses like Treasury, Development, Marketing, etc.
- View token balances and staking information for any address
- Copy verified addresses with one click

### 4. Onboarding Wizard with Indigenous Storytelling
- Guided tour of the platform with Indigenous cultural context
- Step-by-step onboarding process with animated transitions
- Indigenous storytelling that connects modern finance with traditional wisdom
- Persistent state management to remember progress

## Technology Stack

- **React**: UI component library
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **ethers.js**: Ethereum/BSC blockchain interaction
- **localStorage**: Client-side persistence

## Getting Started

### Prerequisites
- Node.js 16+
- NPM or Yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Building for Production
```bash
# Create optimized production build
npm run build

# Serve production build
npm run serve
```

## Development Guidelines

### Component Structure
- Components should be in their own folder under `src/components`
- Each component should have its own `.tsx` file and `.test.tsx` file
- Use interfaces for props and state
- Follow the naming convention: `ComponentName.tsx`, `ComponentName.test.tsx`

### State Management
- Use React Hooks for state management
- Use `localStorage` for persistence where appropriate
- Share state between components using React Context where needed

### Styling
- Use TailwindCSS for styling
- Custom styles should be in `src/styles.css`
- Follow responsive design principles using TailwindCSS breakpoints
- Use the Indigenous-inspired design elements in styles.css

### Testing
- Write tests for all components using Jest and React Testing Library
- Test all user interactions and state changes
- Mock external dependencies like blockchain calls

## File Structure
```
client/
├── public/
│   ├── index.html
│   └── ...
├── src/
│   ├── components/
│   │   ├── AddressVerificationTool.tsx
│   │   ├── OnboardingWizard.tsx
│   │   ├── StepProgressBanner.tsx
│   │   └── WalletConnectModal.tsx
│   ├── styles.css
│   ├── types/
│   │   └── heroicons.d.ts
│   ├── App.tsx
│   └── index.tsx
└── README.md
```