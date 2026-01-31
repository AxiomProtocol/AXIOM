# Capital Bridge Deployment Guide

## Overview

This guide covers the complete deployment process for the Capital Bridge infrastructure, including Layer 5E (Core), Layer 5G (Securitization), and Layer 7 (Node Economy).

## Prerequisites

1. **Environment Variables**
   ```bash
   ALCHEMY_API_KEY=your_alchemy_key
   ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/your_key
   DEPLOYER_PK=0x...  # Deployer wallet private key
   ADMIN_PRIVATE_KEY=0x...  # Admin wallet private key (for role grants)
   ```

2. **Wallet Funding**
   - Deployer wallet needs ~0.5 ETH on Arbitrum One for deployment gas
   - Admin wallet needs ~0.1 ETH for role configuration transactions

## Deployment Steps

### Step 1: Deploy Layer 5E (Core)

Deploys CapitalBridgeHub and CapitalReadinessGate.

```bash
npm run capital-bridge:deploy:5e
```

**Contracts Deployed:**
- `CapitalReadinessGate` - Observation window and readiness attestation
- `CapitalBridgeHub` - Property packets, SPVs, authorizations, settlements

### Step 2: Deploy Layer 5G (Securitization)

Deploys instrument registry, pool registry, and servicing log.

```bash
npm run capital-bridge:deploy:5g
```

**Contracts Deployed:**
- `InstrumentRegistry` - WholeLoan, Participation, Note, Certificate instruments
- `PoolRegistry` - Instrument pooling for securitization
- `ServicingEventLog` - Immutable audit trail for servicing events

### Step 3: Deploy Layer 7 (Node Economy)

Deploys node infrastructure for decentralized operations.

```bash
npm run capital-bridge:deploy:nodes
```

**Contracts Deployed:**
- `NodeRegistry` - Node registration and stake management
- `NodeRewards` - Epoch-based reward distribution
- `SlashingEngine` - Penalty enforcement with escrow

**Node Classes Configured:**
| Class | Min Stake | Lock Period | Slash Rate |
|-------|-----------|-------------|------------|
| Storage | 0.1 ETH | 30 days | 10% |
| Execution | 0.5 ETH | 60 days | 15% |
| Indexing | 0.25 ETH | 30 days | 10% |
| Research | 1.0 ETH | 90 days | 20% |

### Step 4: Configure Roles

Grants operational roles to designated addresses. **Requires ADMIN_PRIVATE_KEY**.

```bash
npm run capital-bridge:roles
```

**Roles Configured:**
- `RISK_COMMITTEE_ROLE` - Approve/reject property packets, propose authorizations
- `SETTLEMENT_AUTHORITY_ROLE` - Register SPVs, activate authorizations, record settlements
- `RESEARCH_ATTESTOR_A_ROLE` - First research attestation signer
- `RESEARCH_ATTESTOR_B_ROLE` - Second research attestation signer (must differ from A)
- `REPORTING_ORACLE_ROLE` - Post readiness attestations
- `ISSUER_ROLE`, `SERVICER_ROLE`, `POOL_MANAGER_ROLE` - Layer 5G operations
- `SLASHER_ROLE`, `REWARDS_MANAGER_ROLE`, `ARBITER_ROLE` - Node Economy operations

### Step 5: Start Observation Window

Initializes the observation period before capital deployment is enabled.

```bash
npm run capital-bridge:observation
```

**Default Configuration:**
- Observation period: 180 days (configurable)
- Initial attestation with 100% uptime, 0 incidents

### Step 6: Verify Deployment

Runs comprehensive verification of all deployed contracts and configurations.

```bash
npm run capital-bridge:verify
```

## Testing on Fork

Before mainnet deployment, test on a local Arbitrum fork:

```bash
npm run capital-bridge:deploy:fork
npm run test:capital-bridge
```

## Contract Addresses (Current Deployment)

| Contract | Address | Layer |
|----------|---------|-------|
| CapitalBridgeHub | 0x6a00455dC277C9430e5c45324B34F2425ba0408d | 5E |
| CapitalReadinessGate | 0xc3f798066e1401aa30Da8703A4c0588A1076ff39 | 5E |
| InstrumentRegistry | 0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5 | 5G |
| PoolRegistry | 0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9 | 5G |
| ServicingEventLog | 0x4A152350e3df79CbE895453ee1B7d486E7338093 | 5G |
| NodeRegistry | 0x31bc6268155219B627FC3B2d8434d010F33DCb03 | 7 |
| NodeRewards | 0x0c1c96F38566d056877cEf4791c701C4F5AEf362 | 7 |
| SlashingEngine | 0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87 | 7 |

## Wallet Addresses

| Role | Address | Key Variable |
|------|---------|--------------|
| Admin | 0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493 | ADMIN_PRIVATE_KEY |
| Operator | 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 | DEPLOYER_PK |

## Observer Dashboard

Read-only institutional transparency dashboards:

- **Main Observer**: `/observer`
- **Capital Bridge**: `/observer/capital-bridge`
- **Node Economy**: `/observer/node-economy`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/observer/capital-bridge | System overview |
| GET /api/observer/node-economy | Node network status |
| GET /api/observer/packets | Property packets list |
| GET /api/observer/spvs | SPV registry |
| GET /api/observer/authorizations | Authorization queue |
| GET /api/observer/instruments | Securitization instruments |
| GET /api/observer/nodes/[id] | Individual node details |

## Security Considerations

1. **Dual Attestation**: Property packets require signatures from two different attestors (A and B)
2. **24-Hour Timelock**: All capital authorizations have mandatory 24h delay before activation
3. **Observation Window**: System operates in read-only mode until observation period completes
4. **Stake Locking**: Node stakes are locked for class-specific periods before withdrawal
5. **Slashing Escrow**: Slashed funds held in escrow during appeal period before treasury transfer

## Troubleshooting

### "Contracts already configured"
The `setContracts` function can only be called once. If you need to reconfigure, deploy fresh contracts.

### "Lock period not expired"
Node operators must wait for the full lock period before withdrawing stake.

### "Timelock not elapsed"
Wait 24 hours after authorization proposal before activation.

### Role grant failures
Ensure you're using the `arbitrumAdmin` network with `ADMIN_PRIVATE_KEY`.
