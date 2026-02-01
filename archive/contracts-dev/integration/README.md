# Axiom Smart City - Contract Integration Suite

## Overview

This integration suite connects all 22 deployed Axiom Smart City contracts on Arbitrum One, enabling cross-contract functionality through role grants, address configurations, and comprehensive testing.

## Architecture

### 📋 Four-Stage Integration Plan

**Stage 1: Core Security & Token Plumbing** (Foundation)
- Connect Identity, Compliance, Treasury, and Staking systems
- Grant essential roles for token minting and fee management
- Configure compliance hooks and credential issuance

**Stage 2: Financial & Real Estate Mesh** (Economic Layer)
- Integrate Capital Pools, Lease Engine, Realtor, and Markets
- Link revenue streams to Treasury for fee distribution
- Enable compliance checks for real estate transactions

**Stage 3: City Services & Oracles** (Infrastructure)
- Connect Utility, Transport, and DePIN to IoT oracles
- Enable sustainability tracking and carbon credit awards
- Configure metrics relay for city-wide data

**Stage 4: Community & Cross-Chain** (Ecosystem)
- Integrate Social Hub, Academy, and Gamification
- Enable cross-chain governance and messaging
- Award incentives and achievements

## Setup

### Prerequisites

1. **Environment Variables** (in `.env` file):
```bash
DEPLOYER_PK=your_deployer_private_key
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key  # Optional, for verification
```

2. **Install Dependencies**:
```bash
npm install
```

### Configuration Files

- **`config/contracts.config.ts`**: Single source of truth for all 22 contract addresses and roles
- **`config/integration-stages.ts`**: Defines role grants and address configs for each stage

## Usage

### Running Integration Scripts

#### Stage 1: Core Security & Token Plumbing

**On Arbitrum One (Real Network)**:
```bash
npm run integrate:stage1
```

**On Hardhat Fork (Safe Testing)**:
```bash
npm run integrate:stage1:fork
```

This will:
- ✅ Grant MINTER_ROLE to Treasury on AXM
- ✅ Grant FEE_MANAGER_ROLE to Treasury on AXM  
- ✅ Grant REWARD_FUNDER_ROLE to Treasury on Staking
- ✅ Grant COMPLIANCE_ROLE to Identity Hub on AXM
- ✅ Grant ISSUER_ROLE to Identity Hub on Credential Registry
- ✅ Configure compliance module on AXM
- ✅ Set up Treasury vaults (BURN, STAKING, LIQUIDITY, DIVIDEND, TREASURY)

### Running Tests

#### Stage 1 Tests (Comprehensive Verification):
```bash
npm run integrate:test:stage1
```

This test suite verifies:
- All role grants are correctly configured
- Treasury can mint AXM tokens
- Compliance enforcement is active
- Staking rewards can be funded
- Credentials can be issued through Identity Hub
- End-to-end citizen journey (when contracts are ready)

## Integration Workflows

### Critical User Journeys

1. **Civic Onboarding**:
   ```
   Identity Hub → Credential Registry → AXM Transfer Enabled
   ```

2. **Staking Pipeline**:
   ```
   Stake AXM → Earn Rewards → Treasury Sweep → Distribution
   ```

3. **Property Sale**:
   ```
   Land Registry → Realtor Listing → Lease Engine → Treasury Fee Split
   ```

4. **Utility Billing**:
   ```
   IoT Sensor → Meter Reading → Bill → Payment → Carbon Credit → Sustainability Hub
   ```

5. **DePIN Leasing**:
   ```
   Node Lease → Service Usage → Revenue Distribution
   ```

6. **RWA Trading**:
   ```
   Market Order → Exchange Settlement → Treasury Fee
   ```

## Contract Registry

### Core Infrastructure (1-6)
- **AXM Token**: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- **Identity/Compliance Hub**: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`
- **Treasury**: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`
- **Staking**: `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885`
- **Credential Registry**: `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344`
- **Land Registry**: `0xaB15907b124620E165aB6E464eE45b178d8a6591`

### Real Estate (7-9)
- **Lease Engine**: `0x26a20dEa57F951571AD6e518DFb3dC60634D5297`
- **Realtor Module**: `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412`
- **Capital Pools**: `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701`

### Utilities & Services (10-12)
- **Utility/Metering**: `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d`
- **Transport/Logistics**: `0x959c5dd99B170e2b14B1F9b5a228f323946F514e`
- **DePIN Nodes**: `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1`

### Advanced DeFi (13-16)
- **Cross-Chain**: `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d`
- **DEX (Exchange Hub)**: `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`
- **Reputation Oracle**: `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643`
- **IoT Oracle**: `0xe38B3443E17A07953d10F7841D5568a27A73ec1a`

### Markets & Oracles (17-18)
- **Markets/Listings**: `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830`
- **Oracle Relay**: `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6`

### Community (19-21)
- **Social Hub**: `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49`
- **Academy Hub**: `0x30667931BEe54a58B76D387D086A975aB37206F4`
- **Gamification Hub**: `0x7F455b4614E05820AAD52067Ef223f30b1936f93`

### Sustainability (22)
- **Sustainability Hub**: `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046`

## Development Roadmap

### Stage 1 (Current) - Core Foundation ✅
- [x] Configuration registry created
- [x] Integration script developed
- [x] Test suite implemented
- [ ] Execute integration on mainnet
- [ ] Verify all role grants
- [ ] Run comprehensive tests

### Stage 2 - Financial & Real Estate 🔜
- [ ] Create Stage 2 integration script
- [ ] Link real estate contracts to Treasury
- [ ] Implement property sale workflow tests
- [ ] Configure compliance for real estate

### Stage 3 - City Services & Oracles 📋
- [ ] Create Stage 3 integration script
- [ ] Connect IoT oracles to city services
- [ ] Implement utility billing workflow
- [ ] Configure sustainability tracking

### Stage 4 - Community & Cross-Chain 📋
- [ ] Create Stage 4 integration script
- [ ] Integrate social and education features
- [ ] Configure gamification rewards
- [ ] Enable cross-chain capabilities

### Operations Dashboard 📋
- [ ] Backend: Event indexer + role auditor
- [ ] Frontend: React monitoring interface
- [ ] Real-time health metrics
- [ ] Alert system configuration

## Security Considerations

1. **Role Management**: All role grants are checked before execution
2. **Idempotency**: Scripts detect existing configurations and skip redundant operations
3. **Verification**: Comprehensive post-integration verification runs automatically
4. **Testing**: Hardhat fork testing before mainnet execution
5. **Monitoring**: Dashboard will track configuration drift

## Support

For issues or questions:
1. Check contract addresses in `config/contracts.config.ts`
2. Review integration stages in `config/integration-stages.ts`
3. Consult deployment manifest in `/COMPLETE_DEPLOYMENT_MANIFEST.md`
4. Review security analysis in contract documentation

## Estimated Timeline

- **Stage 1**: 1 week (integration + testing)
- **Stage 2**: 1.5 weeks (financial complexity)
- **Stage 3**: 1.5 weeks (oracle coordination)
- **Stage 4**: 1 week (community features)
- **Dashboard**: 3 weeks (parallelizable)

**Total**: 6-7 weeks with 2-person team (blockchain + full-stack engineer)

## Next Steps

1. ✅ Review configuration files
2. 🔄 Execute Stage 1 integration script (forked network)
3. 🔄 Run Stage 1 tests
4. ⏳ Execute on Arbitrum One mainnet
5. ⏳ Proceed to Stage 2

---

**Last Updated**: November 22, 2025  
**Network**: Arbitrum One (Chain ID: 42161)  
**Total Contracts**: 22/22 Deployed & Verified ✅
