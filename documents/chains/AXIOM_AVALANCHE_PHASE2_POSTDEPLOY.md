# AXIOM AVALANCHE PHASE 2 POST-DEPLOY VERIFICATION (FUJI ONLY)

**Status:** No real Fuji deployment executed  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

## 1) Deployment outcome

The first real Fuji deployment was not executed because the controlled dry run
was not clean and the environment does not contain a dedicated Fuji deployer key.

No contract addresses were generated, and no deployment transaction hashes exist
for this Phase 2 run.

## 2) Deployed contracts

| Contract | Fuji address | Transaction hash | Explorer |
| --- | --- | --- | --- |
| `IdentityRegistryStorage` | not deployed | not available | not available |
| `TrustedIssuersRegistry` | not deployed | not available | not available |
| `ClaimTopicsRegistry` | not deployed | not available | not available |
| `IdentityRegistry` | not deployed | not available | not available |
| `ModularCompliance` | not deployed | not available | not available |
| `CountryAllowModule` | not deployed | not available | not available |
| `TransferLimitModule` | not deployed | not available | not available |
| `AxiomStable3643Fuji` | not deployed | not available | not available |

## 3) What was verified on Fuji

- The public Fuji RPC endpoint responded to `eth_chainId`.
- The returned chain ID was `0xa869`, which is decimal `43113`.
- No write transaction was sent to Fuji.

## 4) Permissioned issuance verification

The permissioned issuance pattern is not yet proven on Avalanche Fuji.

Reason:

- No contracts were deployed.
- No identity registry was configured.
- No compliance modules were bound on-chain.
- No Fuji test token was deployed or minted.

## 5) Files intentionally left unchanged

Because there was no successful real deployment, these address registries remain
placeholders:

- `shared/contracts-avalanche.ts`
- `deployments/avalanche/fuji-phase1.template.json`

No fake addresses or transaction hashes were added.

## 6) What remains before runtime integration

Before any public runtime integration, Axiom must complete all of the following:

1. Add or enable a guarded Phase 2 real-deploy path for the approved Fuji-only
   contract set.
2. Provide a dedicated funded Fuji-only deployer key.
3. Re-run compile and dry-run successfully with
   `contracts-axusd-3643/hardhat.config.ts`.
4. Execute the minimal Fuji deployment.
5. Capture addresses, transaction hashes, and explorer links.
6. Update only Avalanche-specific registries with actual deployed addresses.
7. Verify that Avalanche remains feature-flagged and disabled by default.
8. Keep Arbitrum as canonical for reserve, accounting, identity, issuance,
   policy, solvency, and disclosure until a later explicit migration decision.

## 7) Safety result

No production routes, public runtime surfaces, Arbitrum paths, banking/payment
surfaces, Polygon code, or Sui code were changed.
