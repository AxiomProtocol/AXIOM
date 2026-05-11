# AXIOM AVALANCHE FUJI ENV (OPTIONAL)
**Scope:** Staging/testnet only  
**Default behavior:** If unset, Avalanche stays disabled and existing deploy/build behavior is unchanged.

## Optional flags
```env
MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true
```

## Optional Fuji RPC/deployer values
```env
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_DEPLOYER_PRIVATE_KEY=<fuji_test_key_only>
```

## Optional scaffold controls
```env
AVALANCHE_PHASE1_NETWORK=fuji
AVALANCHE_PHASE1_DRY_RUN=true
```

## Notes
- `AVALANCHE_DEPLOYER_PRIVATE_KEY` must be separate from Arbitrum deployer keys.
- Do not set these in production for this phase.
- Arbitrum remains canonical for identity, reserve accounting, issuance, policy, and solvency/disclosure.
