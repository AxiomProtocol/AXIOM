# AXUSD Euler Earn Vault — Sibling "Unknown" Audit

**Vault:** `earnAXUSD` at `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` (Arbitrum One)
**Factory:** EulerEarnFactory `0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d`
**Status (audit, 2026-04-17):** Vault type **RECOGNIZED ✓** (Euler Earn).
**Verdict:** **No redeploy required.**  Sibling EVK vault's "Unknown" issue
**does not apply** to this Earn vault.  No on-chain transactions executed.

---

## 1. TL;DR

| Question | Answer |
|---|---|
| Does the same root cause (`upgradeable=false`) hit this vault? | **No.** Euler Earn vaults use a different factory + perspective system. |
| Is it verified by an Euler perspective? | **Yes** — `eulerEarnFactoryPerspective` returns `isVerified(vault) == true`. |
| Will the Euler V2 UI show "Vault type: Unknown"? | **No.** Type label resolves via the factory perspective. |
| Is a canonical Euler Earn redeploy script needed? | **No.** Per task spec ("if it also shows Unknown, produce a canonical redeploy script"). |
| Are there any caveats? | **Yes** — see §3 below; the underlying strategy is the broken legacy eAXUSD-6, and `eulerEarnGovernedPerspective` does not pass. |

---

## 2. On-chain audit output (2026-04-17)

```
[Perspective verification]
  eulerEarnFactoryPerspective        VERIFIED ✓ [Euler Earn Factory Perspective]
  eulerEarnGovernedPerspective       not verified [Governed Perspective]

[Vault identity]
  name:        Axiom Earn AXUSD
  symbol:      earnAXUSD
  decimals:    18
  asset:       0xD611...Ade7  (AXUSD ERC-3643)
  EVC:         0x6302...1066  (canonical Euler EVC on Arbitrum)

[Governance roles]
  owner:       0x8d78...4C96  (deployer EOA, unlabeled)
  curator:     0x0            (none assigned)
  guardian:    0x0
  feeRecipient: 0xF5d5...Cb94  (AxiomFeeBurner)
  fee:         10% (1e17 WAD)
  timelock:    0 sec

[Supply queue]
   [0] 0xacdA...09B2  (eAXUSD-6, legacy EVK vault, cap=0, currentCap≈dust)

[Withdraw queue]
   [0] 0xacdA...09B2

VERDICT: Vault type recognized (factory perspective).  No redeploy needed.
```

Run anytime: `node scripts/audit-axusd-euler-earn-vault.js`.

> Note on perspective error decoding: the audit script reuses the EVK
> `PerspectiveError` bit table (UPGRADABILITY, ORACLE_*, GOVERNOR, etc.).
> The Earn perspectives may emit additional or differently-meaning bits,
> so any decoded codes against the Earn perspectives are **informational
> and best-effort** — refer to the perspective contract source if a
> specific failure needs to be acted on.

---

## 3. Why this vault is fine and the EVK sibling wasn't

The EVK sibling (`eAXUSD-6` at `0xacdA...09B2`) was Unknown because:

> The Ungoverned/Governed EVK perspectives all require
> `vaultFactory.getProxyConfig(vault).upgradeable == true`, and the legacy
> EVK deploy script created the proxy with `upgradeable=false`.  This bit
> is fixed at proxy creation time and cannot be changed.

The Euler Earn factory **does not use** that perspective.  The
`eulerEarnFactoryPerspective` only checks that the vault was created by
the canonical `EulerEarnFactory` contract.  Our vault was deployed by
`scripts/deploy-axusd-euler-earn-vault.js` calling
`EulerEarnFactory.createEulerEarn(...)`, so it passes by construction.
This is why the Euler V2 UI labels this vault correctly — there is no
"Unknown" state to fix.

---

## 4. Secondary findings (non-blocking, but tracked)

These do not create an "Unknown" UI state but are worth flagging:

### 4a. `eulerEarnGovernedPerspective` does not verify

The stricter Governed perspective requires every strategy in the
supply/withdraw queue to itself be perspective-verified.  The only
strategy registered is the **legacy `eAXUSD-6` EVK vault**, which is
**not** perspective-verified (see `documents/euler-axusd-vault-unknown-fix.md`).
Therefore the Earn vault cannot pass the Governed perspective until the
underlying EVK strategy is replaced with a canonical, perspective-verified
EVK vault.

This is **automatically fixed** by the canonical EVK redeploy work
already documented in `euler-axusd-vault-unknown-fix.md`.  The required
sequence after that vault ships is:

1. `submitCap(canonical_eaxusd, target_cap)` on this Earn vault.
2. Wait the timelock (currently 0 → instant).
3. `acceptCap(canonical_eaxusd)`.
4. `setSupplyQueue([canonical_eaxusd])` (drop the legacy strategy).
5. Re-run `node scripts/audit-axusd-euler-earn-vault.js` to confirm both
   Earn perspectives now verify.

### 4b. Owner is an unlabeled deployer EOA

`owner = 0x8d7892...4C96` is the deployer EOA.  This does **not** affect
perspective verification, but the Euler V2 UI will display the raw
address rather than a friendly name.  Two equivalent fixes:

- **Transfer ownership to a labeled Safe multisig.**  If we deploy a
  Safe and submit a PR adding it to
  `euler-xyz/euler-interfaces/addresses/42161/MultisigAddresses.json`,
  the UI will pick up the label after Euler's next bundle redeploy.
- **Or** add the deployer EOA itself to the same file (less ideal — EOAs
  are usually not labeled by Euler governance).

This change is cosmetic and can be deferred.  It overlaps with the
multisig migration already implied by `euler-axusd-vault-unknown-fix.md`
§ 4.

### 4c. Underlying strategy carries the legacy oracle bug

The legacy `eAXUSD-6` EVK vault has the zero-borrow-pricing bug
documented in §7b of `euler-axusd-vault-unknown-fix.md`.  Because the
Earn vault is a passive yield aggregator (it deposits AXUSD into
strategies and reads their share price), the bug does **not** corrupt
Earn vault accounting — Earn is shielded by the EVK's `convertToAssets`
arithmetic, which is unaffected by the broken AXUSD/USDC oracle (the
oracle only affects borrow valuation inside the EVK vault, not deposit
share math).

Still, every dollar deposited into `earnAXUSD` is currently routed to a
vault whose borrow-side risk engine is broken.  Until the canonical EVK
vault is live and the supply queue is repointed (§4a), users should not
deposit material capital into `earnAXUSD`.

---

## 5. Files added by this task

| File | Purpose |
|---|---|
| `scripts/audit-axusd-euler-earn-vault.js` | Read-only on-chain audit for the Earn vault.  Decodes perspective verification and prints a green/red verdict. |
| `documents/euler-axusd-earn-vault-audit.md` | This document. |

No deploy script, no redeploy script, no on-chain mutations.  The
existing `scripts/deploy-axusd-euler-earn-vault.js` was **not modified**.

---

## 6. How to re-verify

```bash
# Default: audits the deployed earnAXUSD vault on Arbitrum.
node scripts/audit-axusd-euler-earn-vault.js

# Audit any other Earn vault by overriding VAULT.
VAULT=0x... node scripts/audit-axusd-euler-earn-vault.js

# Pin the perspective addresses snapshot to a specific commit:
EULER_INTERFACES_REF=<sha> node scripts/audit-axusd-euler-earn-vault.js
```

Use Alchemy if available (`ALCHEMY_API_KEY=...`) — the script falls back
to the public Arbitrum RPC otherwise.
