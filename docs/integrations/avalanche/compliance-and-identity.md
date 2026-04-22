# Avalanche — Compliance and Identity Architecture

---

## Compliance Enforcement via Subnet Architecture

Avalanche Subnets are the primary compliance mechanism. A subnet can enforce:

### 1. Validator Allowlist (Permissioned Validators)
Only whitelisted nodes can validate subnet transactions. This means only approved institutions can participate in block production on Axiom's capital subnet.

**Implementation:** `AddSubnetValidator` transaction with explicit validator ID whitelist on P-Chain.

### 2. AllowList Precompile (Transaction Sender Whitelist)
Subnet-EVM ships with an `AllowList` precompile that restricts which wallet addresses can send transactions to the subnet.

**Contract address (Subnet-EVM precompile):** `0x0200000000000000000000000000000000000000` (TxAllowList)

**Axiom use:** Gate all subnet transactions to ERC-3643 verified wallets only. Only Axiom-approved addresses can submit transactions to the capital subnet.

**Integration point:** After Arbitrum ERC-3643 identity issuance, add wallet to Avalanche subnet AllowList.

### 3. NativeMinter Precompile (Custom Token)
Subnet can have a custom native token minted by authorized addresses.

**Axiom use:** Optionally issue a wrapped AXUSD representation on the subnet for internal capital accounting. Not required for Phase 1.

### 4. FeeManager Precompile (Fee Control)
Control gas fee model at subnet level — enable fee-free or fixed-fee operations for whitelisted participants.

**Axiom use:** Institutional participants should not face unpredictable gas costs. FeeManager can fix this.

---

## Identity Bridge to Avalanche

Avalanche does not have a native identity framework (unlike Polygon ID). Identity on Avalanche is managed at the application layer.

### Axiom approach:

**Option A — AllowList sync (recommended for Phase 1):**
- Maintain AllowList precompile state synchronized with Arbitrum ERC-3643 registry
- When identity is approved on Arbitrum → add to Avalanche subnet AllowList
- When identity is revoked on Arbitrum → remove from Avalanche subnet AllowList

**Option B — Deploy ERC-3643 to C-Chain / Subnet:**
- Deploy same ONCHAINID + ERC-3643 contracts to Avalanche
- Requires cross-chain state sync (same complexity as Polygon Option B)
- Heavier implementation; not recommended for Phase 1

---

## Existing Axiom Identity Infrastructure (Arbitrum)

All identity is currently Arbitrum-only. Avalanche identity gate must reference Arbitrum state.

The `CrossChainIdentityService` in `lib/multichain/CrossChainIdentityService.ts` is the correct abstraction layer to extend for Avalanche AllowList sync.

---

## Reg D 506(c) Compliance Requirements

Avalanche capital deployment zones must enforce:
1. Accredited investor status (`ACCREDITED_INVESTOR` claim on Arbitrum)
2. Verified KYC (`KYC_VERIFIED` claim on Arbitrum)
3. Sanctions clearance (`SANCTIONS_CLEAR` claim on Arbitrum)
4. All of the above must be verified on Arbitrum BEFORE adding to Avalanche AllowList
5. AllowList must be updated within defined SLA when credential status changes

---

## Gas and Token Model

- **C-Chain:** Uses AVAX for gas — must fund a gas wallet
- **Custom Subnet:** Can use AVAX or custom token for gas — FeeManager precompile can set to zero
- **Recommendation:** Custom subnet with zero-gas model for capital program participants (operational clarity)
