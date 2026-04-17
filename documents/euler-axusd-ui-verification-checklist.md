# AXUSD Vault — Euler V2 UI Verification Checklist

**Purpose.** A plain-English, click-by-click checklist for confirming that the
AXUSD vault appears correctly in the public Euler V2 UI. Use this every time
something on the Euler side changes (registry registration, canonical EVK
redeploy, perspective re-verification) so the visible state matches the
on-chain state.

**Audience.** Anyone — no Solidity required. The on-chain truth is checked by
`node scripts/diagnose-axusd-vault-unknown.js`; this document checks the
**display** that allocators and counterparties actually see.

**Last reviewed.** 2026-04-17.

---

## Before you begin

You will need:

1. A web browser (no wallet connection required for read-only verification).
2. The two adapter addresses (already deployed and Blockscout-verified):
   - AXUSD/USD adapter: `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6`
   - USDC/USD  adapter: `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61`
3. The AXUSD vault address you are verifying. Two candidates exist today:
   - Earn wrapper (live):     `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`
   - Legacy EVK eVault:       `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2`
   - Canonical EVK eVault:    not yet deployed — see Step C below.
4. The Euler V2 UI: <https://app.euler.finance/> (Arbitrum, chain id 42161).
5. The on-chain diagnostic command, run from the repo root:
   ```
   node scripts/diagnose-axusd-vault-unknown.js
   ```
   The diagnostic prints, in plain English, exactly which of the steps
   below should currently pass.

---

## Step A — Confirm both oracle adapters are registered

The Euler V2 UI labels a vault as "Unknown" whenever any oracle adapter
that prices the vault's asset or its collateral is missing from
`oracleAdapterRegistry`. Both adapters must be registered before the UI
will recognize any AXUSD vault.

**Open the registry on Blockscout:**
<https://arbitrum.blockscout.com/address/0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf>

In the **Read Contract** tab:

- [ ] Call `isValid` with arguments
      `element = 0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` and
      `snapshotTime = <any Unix timestamp from the last hour>`.
      Expected: **true**. If false, the AXUSD/USD adapter has not been
      registered yet — Euler governance must run the call documented in
      `documents/euler-adapter-submission-package/03-registry-pr-payload.md`.
- [ ] Call `isValid` with arguments
      `element = 0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61` and the same
      timestamp. Expected: **true**. If false, the USDC/USD adapter has
      not been registered yet — Euler governance must run the call in
      `documents/euler-usdc-adapter-submission-package/03-registry-pr-payload.md`.
- [ ] Call `entries(<adapter address>)` for each adapter and confirm
      `addedAt` is non-zero and `revokedAt` is zero.

If either `isValid` is false, **stop**. The UI will continue to show
"Unknown" until both rows are true. Continue with Step B only after both
adapters are registered.

---

## Step B — Confirm a perspective verifies the vault

In the Euler V2 UI, the **Vault type** ("Ungoverned 0x", "Ungoverned Nzx",
"Euler Earn", etc.) and the **Risk manager** label are read directly from
the perspective contracts. If no perspective verifies the vault, both
labels render as "Unknown".

**Open the Ungoverned 0x perspective on Blockscout** (address resolved live
by the diagnostic; current value at time of writing fetched from
`euler-xyz/euler-interfaces`):
<https://arbitrum.blockscout.com/address/0x068789293D461Be145D14BfC0e270941554CAC26>

In the **Read Contract** tab:

- [ ] Call `isVerified(<vault address>)`. Expected: **true** if the vault
      is the canonical EVK vault deployed via
      `scripts/deploy-axusd-evk-vault-canonical.js`. If the vault under
      test is the Earn wrapper or the legacy EVK vault, this will be
      **false** — that is correct, see Step C.
- [ ] If false on a canonical EVK vault, run
      `node scripts/fix-axusd-evk-vault-metadata.js` (read-only static
      check first; will refuse to broadcast unless safe). Then re-run
      this checklist.

For the Earn wrapper, also check the Euler Earn perspective (address
varies by deployment — confirm via the diagnostic's `[3] Perspective
verification` block). The Earn wrapper can only be verified once the
underlying EVK strategy vault is verified.

---

## Step C — Confirm the right vault is being checked

A common confusion is checking the live Earn wrapper
(`0x4359…cB45B`) and expecting it to behave like the EVK eVault. It
does not. The Earn wrapper is an ERC4626 yield aggregator over EVK
vaults; it has no `governorAdmin`, no `oracle`, no `unitOfAccount`, and
no `hookConfig`. Perspectives that look for those fields revert when
they probe an Earn wrapper, which is why the diagnostic correctly
reports `flavour = Euler Earn` for that address.

If you are testing the legacy EVK vault `0xacdA…09B2`, that vault was
deployed before USD-pseudo became the required unit of account and uses
USDC as UoA — perspectives will never accept it. The fix is the
canonical redeploy (`scripts/deploy-axusd-evk-vault-canonical.js`),
which only becomes safe to broadcast in full once both adapters are
registered (see `[preflight]` block of that script).

- [ ] Diagnostic reports `flavour = EVK eVault` (not "Euler Earn", not
      "Unknown").
- [ ] Diagnostic reports `unitOfAccount = 0x...0348` (USD pseudo) and
      `recognized = true`.
- [ ] Diagnostic reports `EVK impl matches = true`.

---

## Step D — Verify the labels in the public UI

Once Step A returns true for both adapters, Step B returns true for the
target vault, and Step C confirms you are pointed at the right vault,
the Euler V2 UI should refresh within minutes. Hard-refresh the page if
needed (most browsers: hold Shift and click reload).

Open <https://app.euler.finance/> and navigate to the vault page. Confirm:

- [ ] **Vault type** is no longer "Unknown". Expected values:
      - For a canonical EVK vault under Ungoverned 0x: "Ungoverned 0x".
      - For the Earn wrapper: "Euler Earn".
- [ ] **Risk manager** is no longer "Unknown". Expected values:
      - For an Ungoverned 0x EVK vault: "None" (governance was renounced
        as part of the canonical deploy script's verification path).
      - For the Earn wrapper: the curator address from the Earn deploy.
- [ ] **Oracle** section lists both adapters by name
      (`AXUSDPegOracleAdapter` and `ChainlinkUSDCOracleAdapter`) with
      live prices.
- [ ] **Asset** is shown as AXUSD (ERC-3643).
- [ ] **Collateral** is shown as USDC.
- [ ] No red banner warning the vault is unverified.

If any row above is still wrong after Steps A–C all pass, hard-refresh,
wait five minutes, and re-check. If still wrong after fifteen minutes,
re-run the diagnostic — there is almost certainly a fresh on-chain
mismatch the diagnostic will surface.

---

## Re-run cadence

Run this checklist:

- After Euler governance executes either `add(...)` call.
- After the canonical EVK vault is deployed.
- After running `scripts/fix-axusd-evk-vault-metadata.js`.
- Any time a teammate reports the labels look wrong in the UI.

The on-chain diagnostic (`node scripts/diagnose-axusd-vault-unknown.js`)
should be run before each of those checks — the UI cannot be more
correct than the chain it reads.

---

## Cross-references

| Document | Role |
|---|---|
| `scripts/diagnose-axusd-vault-unknown.js` | One-shot, read-only on-chain diagnostic backing this checklist |
| `documents/euler-axusd-vault-unknown-fix.md` | Root-cause analysis and remediation history |
| `documents/euler-adapter-submission-package/` | AXUSD/USD adapter submission to Euler governance |
| `documents/euler-usdc-adapter-submission-package/` | USDC/USD adapter submission to Euler governance |
| `scripts/deploy-axusd-evk-vault-canonical.js` | Canonical EVK eVault deploy (required to replace the legacy vault) |
| `scripts/fix-axusd-evk-vault-metadata.js` | Idempotent perspective-verify call for an EVK vault |
