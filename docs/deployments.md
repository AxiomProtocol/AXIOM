<<<<<<< HEAD
# AXIOM Protocol - Deployments Registry

**Version:** 2.0  
**Network:** Arbitrum One (Chain ID: 42161)  
**Last Updated:** February 2, 2026  
**Source:** [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md), [DEPLOYMENT_SIZE_AUDIT.md](./DEPLOYMENT_SIZE_AUDIT.md)

---

## Network Information

| Attribute | Value |
|-----------|-------|
| **Network** | Arbitrum One |
| **Chain ID** | 42161 |
| **RPC URL** | https://arb1.arbitrum.io/rpc |
| **Block Explorer** | https://arbitrum.blockscout.com |
| **Current Deployer** | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| **Original Deployer** | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` |
| **Multi-Sig** | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` (Gnosis Safe) |

---

## Deployed Contracts Summary

*Source: [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md)*

| Category | Count | Verified | Notes |
|----------|-------|----------|-------|
| Token & Treasury | 5 | 5 | All verified |
| Identity & Compliance | 3 | 2 | 1 pending |
| Governance | 3 | 3 | All verified |
| Real Estate | 4 | 3 | 1 pending |
| Lending | 6 | 6 | All verified |
| DEX V2 | 10 | 10 | Proxy contracts |
| DePIN & Infrastructure | 6 | 3 | 3 pending |
| Node Economy | 4 | 4 | Step 2-4 - Feb 2026 |
| Community & Utility | 5 | 0 | All pending |
| Legacy | 1 | 0 | Deprecated |
| **TOTAL** | **47** | **36** | Updated Feb 2026 |

*Note: Counts derived from GENESIS_SNAPSHOT.md. Verification via eth_getCode RPC.*

---

## Token & Treasury Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| AxiomV2 (AXM Token) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | 16.88 KB | Yes | No |
| AXUSD Token | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | 6.30 KB | Yes | No |
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | 6.18 KB | Yes | No |
| AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | 6.06 KB | Yes | No |
| CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | 10.68 KB | Yes | No |

---

## Identity & Compliance Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | 2.87 KB | Yes | No |
| CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | 8.97 KB | Yes | No |
| CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | Pending | No | No |

---

## Governance Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | 8.92 KB | Yes | No |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | 7.00 KB | Yes | No |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | 4.33 KB | Yes | No |

### Governance Parameters

*Source: [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md)*

| Parameter | Value | Notes |
|-----------|-------|-------|
| Minimum Delay | 24 hours | Hardcoded floor: 1 hour |
| Default Delay | 24 hours | Configured at deployment |
| Maximum Delay | 30 days | Hardcoded cap |
| Grace Period | 14 days | Actions expire after ETA + grace |
| Lock Status | Configurable | Not yet locked forever |

*Note: Parameters documented in GENESIS_SNAPSHOT.md. Verify on-chain for current state.*

---

## Real Estate Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | 3.55 KB | Yes | No |
| LeaseAndRentEngine | `0x26a20dEa57F951571AD6e518DFb3dC60634D5297` | 11.75 KB | Yes | No |
| RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | 12.50 KB | Yes | No |
| MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | Pending | No | No |

---

## Lending Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | 4.08 KB | Yes | No |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | 11.11 KB | Yes | No |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | 15.81 KB | Yes | No |
| DSCRPoolVault V2 | `0x5a09cb67518e6E28d8307D75174430939C044A7d` | 8.78 KB | Yes | No |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | 4.76 KB | Yes | No |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | 5.10 KB | Yes | No |

### Registered Loan Products

*Source: [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md) - On-chain ProductRegistry*

| ID | Name | LTV | DSCR | APR | Range | Term |
|----|------|-----|------|-----|-------|------|
| 1 | Fix & Flip Bridge | 75% | N/A | 12% | $50K-$5M | 6-18 mo |
| 2 | DSCR 30-Year Rental | 75% | 1.25 | 8% | $75K-$3M | 360 mo |
| 3 | DSCR 15-Year Rental | 80% | 1.15 | 7.25% | $75K-$3M | 180 mo |
| 4 | BRRRR Refinance | 70% | 1.30 | 8.5% | $100K-$2M | 240 mo |

*Note: Product parameters sourced from GENESIS_SNAPSHOT.md. Verify on-chain for current values.*

---

## DEX V2 Contracts (Proxies)

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | 0.17 KB | Yes | Yes |
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | 0.17 KB | Yes | Yes |
| LPStaking | `0x066623787044440015f7Ea2eC04cA58126cA00a5` | 0.17 KB | Yes | Yes |
| FeeDistributor | `0xD981748E2ed17681D8088be84480FE294d635ae8` | 0.17 KB | Yes | Yes |
| TradingRewards | `0xb75b6e3D02116421fbd7c830a0f24d9a42420984` | 0.17 KB | Yes | Yes |
| DEXRouter | `0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8` | 0.17 KB | Yes | Yes |
| DEXAnalytics | `0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9` | 0.17 KB | Yes | Yes |
| LimitOrders | `0xBdC968773915095b71156bf265b0b10B23B9F8E2` | 0.17 KB | Yes | Yes |
| DEXGovernor | `0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d` | 0.17 KB | Yes | Yes |
| InsuranceFund | `0x449769453e5bc43345092EeD31780bbbfc400F39` | 0.17 KB | Yes | Yes |

---

## DePIN & Infrastructure Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| DePINNodeSuite | `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` | 11.54 KB | Yes | No |
| DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | 13.60 KB | Yes | No |
| UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | 11.54 KB | Yes | No |
| TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | Pending | No | No |
| IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | Pending | No | No |
| OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | Pending | No | No |

---

## Community & Utility Contracts

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | Pending | No | No |
| AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | Pending | No | No |
| GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | Pending | No | No |
| SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | Pending | No | No |
| CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | Pending | No | No |

---

## Node Economy Contracts (Step 2-4)

*Deployed: February 2026 | Node Operator Program*
*Reference: [docs/node-operator/on-chain-spec.md](./node-operator/on-chain-spec.md)*

| Contract | Address | Size | Verified | Proxy |
|----------|---------|------|----------|-------|
| NodeRegistry | `0x31bc6268155219B627FC3B2d8434d010F33DCb03` | TBD | Yes | No |
| NodeRewards | `0x0c1c96F38566d056877cEf4791c701C4F5AEf362` | TBD | Yes | No |
| SlashingEngine | `0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87` | TBD | Yes | No |
| CapitalReadinessGate | `0xc3f798066e1401aa30Da8703A4c0588A1076ff39` | TBD | Yes | No |

### Node Economy Roles

| Role | Contract | Holder | Purpose |
|------|----------|--------|---------|
| DEFAULT_ADMIN_ROLE | NodeRegistry | Gnosis Safe | Full admin control |
| GUARDIAN_ROLE | NodeRegistry | Gnosis Safe | Emergency pause |
| NODE_MANAGER_ROLE | NodeRegistry | Deployer | Node management |
| SLASHER_ROLE | NodeRegistry | SlashingEngine | Execute slashing |

### Integration Points

| Service | API Endpoint | Description |
|---------|-------------|-------------|
| Node Economy Stats | `/api/observer/node-economy` | Live on-chain statistics |
| Operator Status | `/api/operator/status` | Off-chain operator status |
| Readiness Status | `/api/operator/readiness` | Capital readiness gate status |
| Node Economy Service | `lib/contracts/node-economy/` | TypeScript service layer |

---

## Legacy Contracts (Deprecated)

| Contract | Address | Size | Status | Notes |
|----------|---------|------|--------|-------|
| AxiomExchangeHub (V1) | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | Pending | Deprecated | Superseded by ExchangeHubV2 |

---

## Timelock Configuration
=======
# Axiom Protocol - Timelock Deployment Documentation

**Network:** Arbitrum One (42161)  
**Generated:** 2026-01-26  
**Status:** DEPLOYED (Lock Forever NOT activated)

---

## Timelock Contracts
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26

### AxiomTimelockController

| Property | Value |
|----------|-------|
| **Address** | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` |
| **Minimum Delay** | 24 hours (86400 seconds) |
| **Max Delay Cap** | 30 days (2592000 seconds) |
| **Lock Status** | Configurable (not yet locked) |

<<<<<<< HEAD
### Lock Forever Guarantees

After `lockForever()` is called:
=======
#### Roles

| Role | Address | Description |
|------|---------|-------------|
| DEFAULT_ADMIN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe - Full admin |
| PROPOSER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Can queue operations |
| EXECUTOR_ROLE | `0x0000000000000000000000000000000000000000` | Anyone can execute after delay |
| CANCELLER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Can cancel queued ops |
| GUARDIAN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Emergency pause (immediate) |
| CIRCUIT_BREAKER_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Automated emergency |

#### Key Functions

| Function | Access | Timelocked |
|----------|--------|------------|
| `schedule()` | PROPOSER | No (queues) |
| `execute()` | EXECUTOR (anyone) | Yes (after delay) |
| `cancel()` | CANCELLER | No |
| `updateDelay()` | ADMIN | Yes |
| `lockForever()` | ADMIN | No (one-way) |
| `emergencyPause()` | GUARDIAN | No (immediate) |
| `triggerCircuitBreaker()` | CIRCUIT_BREAKER | No (immediate) |

---

### AxiomGovernanceConfig

| Property | Value |
|----------|-------|
| **Address** | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` |
| **Timelock Controller** | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` |
| **Registry Locked** | false |

---

## Existing GovernanceHub (V1)

| Property | Value |
|----------|-------|
| **Address** | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` |
| **Network** | Arbitrum One |
| **Minimum Delay** | 24 hours |
| **Grace Period** | 14 days |

---

## Deployment Steps

### Phase 1: Deploy Timelock Infrastructure

```bash
npx hardhat run scripts/deploy-timelock.ts --network arbitrum
```

### Phase 2: Configure Function Routing

Register all core contracts and configure timelocked vs emergency functions.

### Phase 3: Transfer Admin Roles

Grant ADMIN to Timelock, then revoke from Safe (after testing).

### Phase 4: Verify & Test

```bash
npm run test:invariants
npm run test:scenarios
```

### Phase 5: Lock Forever (Optional)

```typescript
await timelock.lockForever();
```

---

## Lock Forever Guarantees

After `lockForever()` is called:

>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
1. **Delay cannot decrease**: Reverts if `newDelay < currentDelay`
2. **Minimum floor enforced**: `newDelay >= 24 hours` always
3. **Irreversible**: `configurationLocked` cannot be set back to `false`
4. **Provable**: On-chain `lockTimestamp` and `lockedBy` for audit trail

<<<<<<< HEAD
---

## Verification Status

**Verified:** 34 of 43 contracts have on-chain size verification via `eth_getCode` RPC call.

**Pending:** 9 contracts confirmed deployed on Blockscout, awaiting size measurement:
- TransportAndLogisticsHub
- CitizenReputationOracle
- IoTOracleNetwork
- MarketsAndListingsHub
- OracleAndMetricsRelay
- CommunitySocialHub
- AxiomAcademyHub
- GamificationHub
- SustainabilityHub

All verified contracts are safe (under 24KB Ethereum contract size limit).

---

## Related Documentation

- [GENESIS_SNAPSHOT.md](./GENESIS_SNAPSHOT.md) - Original genesis documentation
- [DEPLOYMENT_SIZE_AUDIT.md](./DEPLOYMENT_SIZE_AUDIT.md) - Size verification details
- [CONTRACT_CLASSIFICATION.md](./CONTRACT_CLASSIFICATION.md) - Tier classification
- [contract-registry.md](./contract-registry.md) - Categories and module mapping
- [current-roles-and-permissions.md](./current-roles-and-permissions.md) - Role assignments

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-26 | Initial timelock deployment documentation |
| 2.0 | 2026-02-02 | Consolidated from Genesis Snapshot, full contract registry |
=======
### Emergency Path Remains Open

Even after lock:
- `emergencyPause()` works immediately (GUARDIAN)
- `triggerCircuitBreaker()` works immediately (CIRCUIT_BREAKER)
- `liftEmergencyPause()` works immediately (ADMIN)
- `resetCircuitBreaker()` works immediately (ADMIN)
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
