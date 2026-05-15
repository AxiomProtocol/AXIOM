# AXIOM SUI PHASE 8 — MULTISIG & KEY MANAGEMENT DESIGN

**Status: DESIGN COMPLETE — Key Ceremony NOT Conducted**

This document defines the key management architecture for the Axiom Protocol Sui testnet distribution layer. The key ceremony (key generation, multi-party verification, and escrow setup) must be conducted before Phase 9 promotion.

---

## Scope

Applies to: Sui Testnet ONLY (Phase 8 staging)
Chain: Sui Testnet → Sui Mainnet (upon Phase 9 authorization)
Assets: AXIOM_TEST_CLAIM (ATC) testnet token — no monetary value
Out of scope: AXUSD, AXAU, AXM, any canonical Axiom financial asset, Arbitrum systems

---

## 1. Custody Model — 2-of-3 Multi-Party Authorization

The Axiom Sui distribution layer uses a **2-of-3 multi-party authorization model** for all privileged on-chain actions. No single party has unilateral control over AdminCap operations.

### 1.1 Roles

| Role | Party | Responsibility |
|---|---|---|
| **Engineering Lead** | Senior protocol engineer | Move contract deployment, proof toolchain operation, technical audit |
| **Operations Lead** | Protocol operations manager | Campaign creation, fund management, routine admin operations |
| **Emergency Recovery** | Designated security officer | Break-glass access for incident response; key held offline |

### 1.2 Quorum Rules

| Action | Required Signers |
|---|---|
| Create new campaign | Engineering Lead + Operations Lead |
| Fund campaign | Engineering Lead + Operations Lead |
| Activate campaign | Engineering Lead + Operations Lead |
| Pause campaign | Any 1 of 3 (single-party emergency pause) |
| Unpause campaign | Engineering Lead + Operations Lead |
| Update merkle root | Engineering Lead + Operations Lead |
| Close campaign | Engineering Lead + Operations Lead |
| Transfer AdminCap | Engineering Lead + Operations Lead + Emergency Recovery (all 3) |
| Destroy AdminCap | Engineering Lead + Operations Lead + Emergency Recovery (all 3) |
| Package upgrade (if applicable) | All 3 + Phase 9 authorization |

**Note on single-party pause:** Emergency pause is intentionally single-party to allow rapid response to an incident. Unpause requires quorum to prevent accidental or unauthorized reopening.

---

## 2. AdminCap Custody

### 2.1 Current State (Phase 8 Testnet)

- AdminCap is held by the deployer wallet (testnet only)
- Deployer key is stored in `SUI_DEPLOYER_KEY` environment secret
- This is acceptable for testnet staging; NOT acceptable for mainnet

### 2.2 Target State (Phase 9+)

1. AdminCap is transferred to a Sui multisig address controlled by 2-of-3 parties
2. The Sui multisig address is constructed using `sui keytool multi-sig-address`
3. Each party holds one Ed25519 key in a hardware security module (HSM) or hardware wallet
4. The multisig address controls AdminCap exclusively

### 2.3 Key Generation Protocol

```
Step 1: Each party generates a fresh Ed25519 keypair independently
        Using: sui keytool generate ed25519
        Storage: Hardware wallet (Ledger Nano S/X) or HSM

Step 2: Each party publishes their public key for multi-sig address construction
        No private keys are ever shared

Step 3: Engineering Lead constructs the 2-of-3 multisig address
        Using: sui keytool multi-sig-address --pks PK1 PK2 PK3 --weights 1 1 1 --threshold 2

Step 4: All 3 parties verify the multisig address derivation independently

Step 5: AdminCap is transferred to the multisig address via:
        claim_campaign::transfer_admin_cap(admin_cap, MULTISIG_ADDRESS)
```

---

## 3. Upgrade Authority

### 3.1 Default Policy (A6)

By default, the `axiom_claim_prototype` package is published as a **frozen package** (no UpgradeCap created). This means:

- The package bytecode is permanently immutable on-chain
- No upgrade is possible via the Sui upgrade mechanism
- Any bug fix or feature addition requires deploying a new package

### 3.2 Upgrade Contingency

If a critical vulnerability requires an upgrade and the current package was frozen:

1. Deploy a new package with a new package ID
2. Close all existing campaigns via `close_campaign()` (drains pool to admin)
3. Create new campaigns on the new package
4. Issue a public disclosure of the vulnerability and migration path
5. Obtain Phase 9+ multi-party authorization for the new deployment

### 3.3 UpgradeCap Policy (if non-frozen deployment)

If a future version requires upgradeable deployment:

1. UpgradeCap must be held by the 2-of-3 multisig address (not a single key)
2. All upgrades require 3-of-3 approval (higher threshold than routine ops)
3. A 72-hour time-lock is recommended between upgrade proposal and execution
4. A new Phase 9+ authorization document is required for each upgrade

---

## 4. Key Rotation

### 4.1 Routine Rotation Schedule

| Key | Rotation Trigger |
|---|---|
| Engineering Lead key | Annual, or upon role change |
| Operations Lead key | Annual, or upon role change |
| Emergency Recovery key | Annual, or upon suspected compromise |

### 4.2 Rotation Protocol

1. New keypair generated by incoming key holder
2. 2-of-3 quorum signs a `transfer_admin_cap` transaction to a new multisig address
3. Old multisig address is deprecated; no further signing by old key
4. Document new multisig address in operations runbook
5. Verify new multisig address can sign a test transaction before decommissioning old

### 4.3 Role Transition

When a role changes hands:

1. Outgoing party participates in final key ceremony with incoming party
2. AdminCap transferred to new multisig (old + new key holders sign together)
3. Old party's key retired and never used again
4. New configuration verified with a test pause/unpause cycle

---

## 5. Compromise Response

### 5.1 Suspected Single-Key Compromise

If one of the 3 keys is suspected compromised:

1. **Immediate:** Emergency Recovery or any available key holder issues `pause()` (single-party emergency pause)
2. **Within 1 hour:** Notify all 3 key holders; initiate incident response
3. **Within 4 hours:** Construct new multisig address excluding compromised key; get 2-of-3 quorum from remaining valid keys
4. **Within 8 hours:** Transfer AdminCap to new multisig address
5. **Within 24 hours:** Issue public disclosure if campaign was active during compromise window
6. **Post-incident:** Full key rotation for all 3 parties (suspected compromise increases risk for all)

### 5.2 Suspected AdminCap Theft

If AdminCap object is believed to have been transferred without authorization:

1. **Immediate:** Monitor Sui explorer for unauthorized AdminCap usage
2. **Assessment:** Determine if unauthorized campaign modifications occurred
3. **Response:** If possible, issue `close_campaign()` before attacker can drain pool
4. **Disclosure:** Full on-chain event audit; notify all stakeholders
5. **Recovery:** Deploy new package; issue migration guidance

### 5.3 Deployer Key Compromise (Testnet)

For Phase 8 testnet only:

1. Rotate `SUI_DEPLOYER_KEY` environment secret immediately
2. Redeploy package to testnet with new deployer key
3. Document incident in phase completion notes
4. No user funds at risk (testnet; no monetary value)

---

## 6. Incident Escalation Path

```
Level 1 (Routine): Engineering Lead or Operations Lead
  └── Scope: Campaign operations, root updates, funding

Level 2 (Elevated): Engineering Lead + Operations Lead (2-of-3)
  └── Scope: AdminCap transfers, campaign close, key rotation

Level 3 (Emergency): All 3 parties + Protocol Governance
  └── Scope: Compromise response, package deprecation, public disclosure

External: Legal/Compliance, Security Firm
  └── Scope: Regulatory notification (if mainnet), external audit engagement
```

---

## 7. Key Storage Requirements

| Party | Minimum Storage Standard |
|---|---|
| Engineering Lead | Hardware wallet (Ledger) or enterprise HSM; never plaintext storage |
| Operations Lead | Hardware wallet (Ledger) or enterprise HSM; never plaintext storage |
| Emergency Recovery | Offline hardware wallet; geographically separate from Engineering Lead |

**Prohibited storage methods:**
- Plaintext private key files on internet-connected machines
- Cloud-hosted key management services for signing keys (metadata OK)
- Shared secrets or threshold schemes that allow single-party reconstruction
- Email or messaging app storage

---

## 8. Phase 9 Readiness Checklist

- [ ] All 3 key holders have generated their keypairs on HSM/hardware wallet
- [ ] 2-of-3 Sui multisig address constructed and verified by all parties
- [ ] AdminCap transferred to multisig address (testnet dry run)
- [ ] Test transaction (pause/unpause cycle) signed by 2-of-3 successfully
- [ ] Emergency Recovery key stored offline in separate location
- [ ] Rotation schedule documented in operations runbook
- [ ] Incident response contacts established for all 3 key holders
- [ ] Phase 9 Authorization Package signed by all required parties

---

*Axiom Protocol — Sui Phase 8 — Testnet Only*
*Key management design; key ceremony not conducted. No mainnet deployment authorized.*
