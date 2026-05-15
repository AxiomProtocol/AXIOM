# Axiom Protocol — Sui Phase 10 Accepted Risk Register
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Classification:** Internal Governance

---

## Register Summary

| Risk ID | Risk | Severity | Accepted Date | Owner | Deadline | Status |
|---|---|---|---|---|---|---|
| R-SUI-01 | External Move security audit deferred | MEDIUM | 2026-05-15 | Protocol Ops | 2026-07-14 | OPEN |
| R-SUI-02 | AdminCap single-wallet custody | MEDIUM | 2026-05-15 | Protocol Ops | 2026-06-14 | OPEN |
| R-SUI-03 | Single-party Phase 9/10 authorization | LOW | 2026-05-15 | Governance | 2026-08-13 | OPEN |
| R-SUI-04 | In-process monitoring state (no persistence) | LOW | 2026-05-15 | Engineering | 2026-07-31 | OPEN |

---

## R-SUI-01: External Move Security Audit Deferred

**Risk:** The Move contracts governing AMC claim distribution have not been reviewed by an independent external security auditor.

**Rationale for acceptance:**
- Community reward token only — no monetary value, no reserve backing, no financial instruments
- Package is immutable (UpgradeCap destroyed) — no upgrade vector post-deploy
- 28/28 internal Move tests pass including adversarial cases (duplicate claim, proof abuse, supply cap, gas griefing)
- All hardening measures A1–A7 applied
- Distribution is small-scale (4 AMC initial pool)

**Severity:** MEDIUM

**Residual risk:** Unknown Move vulnerabilities could allow claim without valid proof or disrupt campaign state. Financial exposure is limited to AMC community tokens with no monetary value.

**Remediation:** Engage external Move auditor. Timeline: within 60 days of Phase 9 launch.

**Acceptance deadline:** 2026-07-14

**Owner:** Protocol Ops

**Review frequency:** Monthly until resolved

---

## R-SUI-02: AdminCap Single-Wallet Custody

**Risk:** The AdminCap object that controls campaign operations is held by a single operator wallet (`0x4917ffea...`). Loss or compromise of this wallet would result in loss of operator control.

**Rationale for acceptance:**
- Temporary measure during initial launch phase
- Campaign can continue operating read-only (claims still work) even without AdminCap access
- Wallet is secured with hardware key (SUI_DEPLOYER_KEY)
- Low financial exposure — AMC has no monetary value

**Severity:** MEDIUM

**Residual risk:** If wallet is compromised, attacker could pause, close, or update Merkle root. Cannot mint additional AMC without GuardedTreasury object access. Cannot steal already-claimed tokens (transferred on-chain to claimants).

**Remediation:** Migrate AdminCap to 2-of-3 multisig. See `AXIOM_SUI_PHASE9_MULTISIG_MIGRATION.md`.

**Acceptance deadline:** 2026-06-14

**Owner:** Protocol Ops

**Review frequency:** Weekly until resolved

---

## R-SUI-03: Single-Party Phase 9/10 Authorization

**Risk:** Both the technical deployment and operational decisions for Phase 9/10 were authorized and executed by a single party.

**Rationale for acceptance:**
- Community reward distribution only — not a financial product
- Full transparency via public disclosure page
- No user funds at risk
- Formal governance review planned

**Severity:** LOW

**Remediation:** Governance scope review to define multi-party authorization requirements for future Sui phases.

**Acceptance deadline:** 2026-08-13

**Owner:** Governance

---

## R-SUI-04: In-Process Monitoring State

**Risk:** Monitoring telemetry (proof request records, wallet risk profiles) is stored in-process memory. Data resets on server restart.

**Rationale for acceptance:**
- Monitoring is supplemental — on-chain records are authoritative
- Server restarts are rare in production
- Development phase — persistence layer planned for Phase 11

**Severity:** LOW

**Remediation:** Migrate monitoring state to Postgres (Drizzle) or Redis. Phase 11 scope item.

**Acceptance deadline:** 2026-07-31

**Owner:** Engineering

---

## Risk Register Update Policy

This register is reviewed:
- Monthly during active campaign operation
- Immediately after any P0 or P1 incident
- After any change to campaign configuration

Updates require L3 Protocol Ops approval.

---

*Register version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
