# AXIOM AVALANCHE PHASE 2 PRE-DEPLOY NOTE (FUJI ONLY)

**Status:** Pre-deploy validation for first controlled Fuji dry run  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

## 1) Exact Phase 2 contract set

Phase 2 uses only the reduced ERC-3643-related Fuji set approved by the Phase 1
contract plan:

1. `IdentityRegistryStorage`
2. `TrustedIssuersRegistry`
3. `ClaimTopicsRegistry`
4. `IdentityRegistry`
5. `ModularCompliance`
6. `CountryAllowModule`
7. `TransferLimitModule`
8. `AxiomStable3643` deployed as the Fuji test token and recorded as
   `AxiomStable3643Fuji`

Deployment mechanics for the upgradeable contracts require `AxiomProxy` proxy
instances in front of the implementation contracts for:

- `IdentityRegistryStorage`
- `TrustedIssuersRegistry`
- `ClaimTopicsRegistry`
- `IdentityRegistry`
- `ModularCompliance`
- `AxiomStable3643Fuji`

The standalone modules are deployed directly:

- `CountryAllowModule`
- `TransferLimitModule`

## 2) Deployment order

1. Deploy `IdentityRegistryStorage` implementation, then its `AxiomProxy`.
2. Deploy `TrustedIssuersRegistry` implementation, then its `AxiomProxy`.
3. Deploy `ClaimTopicsRegistry` implementation, then its `AxiomProxy`.
4. Deploy `IdentityRegistry` implementation, then its `AxiomProxy`.
5. Call `IdentityRegistryStorage.bindIdentityRegistry(identityRegistryProxy)`.
6. Deploy `ModularCompliance` implementation, then its `AxiomProxy`.
7. Deploy `CountryAllowModule`.
8. Deploy `TransferLimitModule`.
9. Call `ModularCompliance.addModule(countryAllowModule)`.
10. Call `ModularCompliance.addModule(transferLimitModule)`.
11. Deploy `AxiomStable3643` implementation, then its `AxiomProxy` as
    `AxiomStable3643Fuji`.
12. Call `ModularCompliance.bindToken(axiomStable3643FujiProxy)`.
13. Optional Fuji-only smoke configuration after deployment:
    - `IdentityRegistry.addAgent(deployer)`
    - `CountryAllowModule.addAllowedCountry(modularComplianceProxy, 840)`
    - `TransferLimitModule.setTierLimit(modularComplianceProxy, 1, 10000e18)`
    - `TransferLimitModule.setTierLimit(modularComplianceProxy, 2, 100000e18)`

## 3) Required constructor and initializer inputs

Most Phase 2 contracts use initializers through `AxiomProxy` rather than
constructors.

| Contract | Constructor inputs | Initializer inputs |
| --- | --- | --- |
| `IdentityRegistryStorage` implementation | none | none |
| `TrustedIssuersRegistry` implementation | none | none |
| `ClaimTopicsRegistry` implementation | none | none |
| `IdentityRegistry` implementation | none | `identityRegistryStorageProxy`, `claimTopicsRegistryProxy`, `trustedIssuersRegistryProxy` |
| `ModularCompliance` implementation | none | none |
| `CountryAllowModule` | none | none |
| `TransferLimitModule` | none | none |
| `AxiomStable3643` implementation | none | `identityRegistryProxy`, `modularComplianceProxy`, `"AxiomStable Fuji"`, `"AXUSDF"`, `18`, `address(0)` |
| `AxiomProxy` | `implementation`, `initializeCalldata` | not applicable |

## 4) Required environment variables

These variables are required only in the isolated Fuji deployment shell:

```env
MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_DEPLOYER_PRIVATE_KEY=<dedicated funded Fuji-only key>
```

Optional:

```env
SNOWTRACE_API_KEY=<snowtrace verification key if verification is enabled>
AVALANCHE_PHASE1_NETWORK=fuji
AVALANCHE_PHASE1_DRY_RUN=true
```

The runtime-facing `AVALANCHE_RPC_URL` is not required for this deployment note
and should remain unset in production unless a later, explicitly approved runtime
integration enables Avalanche.

## 5) Expected outputs

If the real Fuji deployment succeeds, the operator should capture:

- implementation and proxy addresses for each UUPS contract
- standalone module addresses
- transaction hashes for every deployment and configuration transaction
- Fuji explorer links for each transaction
- deployer address and starting/ending Fuji AVAX balance
- a manifest update in `deployments/avalanche/fuji-phase1.template.json`
- matching address constants in `shared/contracts-avalanche.ts`

`shared/contracts.ts` and Arbitrum deployment manifests must remain unchanged.

## 6) Explicitly out of scope

- Avalanche mainnet deployment
- enabling Avalanche in production
- wiring Avalanche into public app/runtime routes
- migrating canonical reserve, accounting, identity, issuance, policy, or
  solvency truth away from Arbitrum
- deploying MaxBalance, LendingPlatform, ClaimIssuer, IdentityFactory,
  AxiomIdentity, reserve controllers, bridge contracts, banking contracts, or
  payment routing contracts
- modifying Polygon or Sui files, flags, providers, or deployments
- changing `shared/contracts.ts` or any live Arbitrum behavior
