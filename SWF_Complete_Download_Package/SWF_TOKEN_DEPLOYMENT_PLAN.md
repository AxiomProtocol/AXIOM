# Sovran Wealth Fund Token Deployment Plan

This document outlines the deployment strategy for the Sovran Wealth Fund (SWF) token across different environments.

## Token Features

The SWF token includes:

- **Role-Based Access Control**: Different roles for minting, pausing, managing pegs, etc.
- **Multi-Asset Pegging**: Pegged to 11 different cryptocurrencies with configurable weights
- **Dynamic APR Staking**: Built-in staking mechanism with adjustable APR
- **16-Wallet System**: Sophisticated distribution system for different user roles
- **Pausable & Burnable**: Enhanced security features

## Deployment Environments

### Development (Local Hardhat Network)

Use for initial development and testing:

```bash
npx hardhat run scripts/deploy-verified-token.js
```

### Testnet (Polygon Mumbai)

Deploy to testnet for integration testing:

```bash
npx hardhat run scripts/deploy-verified-token.js --network polygonMumbai
```

After deployment:
1. Verify the contract on Mumbai PolygonScan
2. Configure price feed oracles with Chainlink Mumbai addresses
3. Test all functionality before proceeding to mainnet

### Mainnet (Polygon)

Production deployment to Polygon mainnet:

```bash
npx hardhat run scripts/deploy-verified-token.js --network polygon
```

Post-deployment steps:
1. Verify the contract on PolygonScan
2. Set up price feed oracles with production Chainlink addresses
3. Configure the initial basket with proper asset weights
4. Configure the APR for staking (default is 25%)
5. Add the token to relevant DEXes for liquidity

## Asset Pegging Configuration

After deployment, configure the assets in the basket:

1. **Bitcoin (BTC)**: 25-30% weight
2. **XRP**: 15-20% weight
3. Other 9 assets: Distribute remaining weight

Use the following function to add each asset:

```javascript
await token.addPeggedAsset(
  "BTC",                    // Symbol
  "0x...",                  // Oracle address (Chainlink)
  2750,                     // Weight (27.5%)
  8000,                     // Reserve ratio (80%)
  "0x0000000000000000000000000000000000000000"  // Reserve token address
);
```

## Reserve Management

After setting up the pegs, configure initial reserves:

```javascript
await token.updateReserveBalance("BTC", ethers.utils.parseEther("100"));
```

## Role Assignment

Initially, all roles are assigned to the deployer. To distribute roles:

```javascript
// Grant roles to other administrators
await token.grantRole(MINTER_ROLE, "0x...");
await token.grantRole(PAUSER_ROLE, "0x...");
await token.grantRole(PEG_MANAGER_ROLE, "0x...");
```

## Reserve Wallets

Create dedicated wallets for:
1. Treasury
2. Development Fund
3. Staking Rewards
4. Liquidity Pool

Transfer initial token allocations to each wallet.

## Monitoring

After deployment, monitor:
1. Token price
2. Reserve ratios
3. Staking activity
4. Asset peg stability

Set up alerts for any significant deviations.

## Upgrades and Maintenance

The SWF token is not upgradeable. For future upgrades:
1. Deploy a new version
2. Implement a migration plan
3. Communicate changes to token holders

## Emergency Procedures

In case of emergencies:
1. Use the `pause()` function to halt transfers
2. Address the issue
3. Resume with `unpause()` when resolved

## Documentation

Maintain updated documentation for:
1. Smart contract architecture
2. Role management
3. Asset pegging system
4. Staking mechanics