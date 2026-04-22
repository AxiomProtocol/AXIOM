# PR: add AXIOM Risk Council Safe to Arbitrum MultisigAddresses

**Repo:** `euler-xyz/euler-interfaces`
**Branch (suggested):** `axiom/risk-council-multisig`
**File touched:** `addresses/42161/MultisigAddresses.json`

---

## Summary

Adds the **AXIOM Risk Council** Safe (Arbitrum One) to the per-chain
multisig label registry so Euler V2 surfaces a friendly name on the
Axiom Earn AXUSD vault page (and any future AXUSD vaults that use the
same multisig as `owner` / `curator`).

- **Network:** Arbitrum One (chainId 42161)
- **Safe address:** _filled in by `scripts/deploy-axusd-risk-council-safe.js`_
  (see `MultisigAddresses.patch.json` in this directory for the
  current predicted address — re-run the script after deploying the
  Safe to confirm it matches).
- **Safe version:** 1.4.1 (canonical SafeProxyFactory
  `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67`, singleton
  `0x41675C099F32341bf84BFc5382aF534df5C7461a`).
- **Role on-chain:** `owner` (and `curator`) of the Axiom Earn AXUSD
  vault `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`.

## Diff

```diff
 {
   "DAO": "0xe55798d71193bAA789031415b668A992F2e566EE",
   "labs": "0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d",
+  "axiomRiskCouncil": "0x<PASTE PREDICTED SAFE>",
   "securityCouncil": "0x493F3c0881c0ECE55aDD86c38A927e50eBAd680B",
   "securityPartnerA": "0xd4Cb3460eCbE00122cA4Be010d983Fd00d87Cb85",
   "securityPartnerB": "0x4d46Fe5e429BE01F0D5fF0FAF0cB79577dFC21Dd"
 }
```

The exact line (with the deployed address baked in) is in
`MultisigAddresses.patch.json` next to this README — copy the value
under `add.axiomRiskCouncil`.

## Verification steps for Euler reviewers

1. Confirm the address is a Safe on Arbitrum One:
   `cast code 0x<safe>` returns the standard SafeProxy bytecode.
2. Confirm it controls the Axiom Earn AXUSD vault:
   ```
   cast call 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B "owner()(address)" --rpc-url <arb>
   # → 0x<safe>
   cast call 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B "curator()(address)" --rpc-url <arb>
   # → 0x<safe>     (or 0x0 if curator wasn't set in the same handover)
   ```
3. Re-run our public audit:
   `node scripts/audit-axusd-euler-earn-vault.js` (in
   `axiom-protocol/axiom`) and confirm the **Owner label** and
   **Curator label** lines flip from `UNLABELED ✗` to `LABELED ✓`
   after this PR merges and the next bundle redeploy.

## Why the label name `axiomRiskCouncil`

Matches the existing camelCase convention in this file
(`securityCouncil`, `securityPartnerA`, …) and the `axiom*` prefix is
unique within the file, so it cannot collide with future Euler-side
multisigs.
