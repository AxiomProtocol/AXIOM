# Axiom Protocol — Sui Phase 10 Custody Exception Record
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Classification:** Internal Governance

---

## Exception Summary

**Exception type:** Single-wallet AdminCap custody
**Risk ID:** R-SUI-02
**Exception granted:** 2026-05-15
**Expiry / Remediation deadline:** 2026-06-14
**Status:** ACTIVE EXCEPTION

---

## Custody Configuration

| Item | Value |
|---|---|
| AdminCap object | `0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a` |
| Current holder | `0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad` |
| Key reference | SUI_DEPLOYER_KEY (environment secret) |
| Key type | Ed25519 bech32 suiprivkey |
| Multisig status | NOT YET CONFIGURED |
| Migration plan | `AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md` |

---

## Authorized Operations Under This Exception

The single-wallet holder is authorized to:
- Pause the campaign (`claim_campaign::pause`)
- Unpause the campaign (`claim_campaign::unpause`)
- Close the campaign (`claim_campaign::close_campaign`)
- Update the Merkle root while paused (`claim_campaign::update_merkle_root`)
- Fund the campaign pool (`claim_campaign::fund_campaign`)
- Mint additional AMC up to supply cap (`guarded_treasury::guarded_mint`)
- Transfer AdminCap to a new address (`claim_campaign::transfer_admin_cap`)

---

## Operations NOT Possible Under This Exception

- Upgrade or modify the package (UpgradeCap destroyed — IMMUTABLE)
- Retrieve tokens from claimant wallets (not possible on-chain)
- Exceed MAX_SUPPLY (1,000,000,000,000,000 base units)

---

## Rationale

This custody exception is granted temporarily because:
1. AMC is a community reward token with no monetary value. Financial risk of single-wallet custody is limited.
2. Hardware key security (SUI_DEPLOYER_KEY) provides reasonable protection for the initial launch phase.
3. Multisig infrastructure requires additional lead time for signer coordination.
4. Phase 9 launch timeline was prioritized over multisig setup given the low-risk nature of AMC.

---

## Remediation Plan

Target: 2-of-3 multisig via Sui's native multisig or a supported multisig wallet.

Steps:
1. Identify 3 signers (operator + 2 trusted parties)
2. Generate multisig address combining signer public keys
3. Test multisig signing on testnet
4. Transfer AdminCap: `claim_campaign::transfer_admin_cap(admin_cap, multisig_address)`
5. Verify AdminCap ownership on-chain
6. Update `DEPLOYER_ADDRESS` in operator dashboard to multisig address
7. Close this exception record

Deadline: 2026-06-14

---

## Exception Review

This exception is reviewed weekly. Any breach of the exception conditions (unauthorized AdminCap transfer, key loss) escalates immediately to P0 per the Incident Response Plan.

---

*Exception record v1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
