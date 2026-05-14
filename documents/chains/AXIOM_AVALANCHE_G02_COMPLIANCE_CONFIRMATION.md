# Axiom Protocol — G02 Jurisdiction Allowlist Compliance Confirmation

**Gate:** G02 — Replace setAllowAll with Per-Jurisdiction Allowlist
**Status:** SATISFIED — 2026-05-14
**Confirmed by:** Operations / Protocol Team
**Effective date:** 2026-05-14

---

## Jurisdiction Allowlist — Approved Configuration

**Approved country:** United States of America
**ISO 3166-1 numeric code:** 840
**Environment variable:** `AVALANCHE_MAINNET_COUNTRY_CODES=840`

This is the complete approved allowlist for the initial Avalanche C-Chain mainnet deployment. No additional countries are approved at this time.

---

## Rationale

The AXUSD ERC-3643 compliance stack on Avalanche C-Chain mainnet is restricted to U.S. participants for the initial launch phase. This matches the existing Arbitrum One compliance posture and limits cross-jurisdictional regulatory exposure during the launch period.

Additional jurisdictions may be approved through a separate compliance review process. Each additional country code requires:
- Written compliance counsel review
- Documented approval
- Update to `AVALANCHE_MAINNET_COUNTRY_CODES` environment variable before deploy or via `CountryAllowModule.setAllowedCountry(MC, <code>, true)` post-deploy

---

## Technical Implementation

- The mainnet deploy script (`scripts/deploy/avalanche/deploy-phase1-mainnet.mts`) defaults to `"840"` if `AVALANCHE_MAINNET_COUNTRY_CODES` is unset
- `setAllowAll(MC, true)` is explicitly absent from the mainnet script (Fuji testnet shortcut only)
- `setAllowedCountry(MC, 840, true)` will be called during mainnet post-deploy wiring
- The deployed value is confirmed via `getCountry(identityAddress)` during smoke test

---

## Gate Acceptance Criteria — All Met

- [x] `setAllowAll(MC, true)` is NOT called in the mainnet deploy script
- [x] `setAllowedCountry(MC, 840, true)` is called per-code during wiring
- [x] Jurisdiction list documented and confirmed: United States (840) only
- [ ] Smoke test verification: wallets with non-840 country codes blocked (post-deploy)

The post-deploy smoke test verification will be completed during mainnet deployment. All pre-deploy criteria are satisfied.

---

## Gate Verdict: SATISFIED
