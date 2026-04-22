# AXIOM PROTOCOL — INTERNAL OPERATIONAL PLAYBOOK

**52-Week $100/Week Proof-of-Concept Validation**

| Field | Value |
|-------|-------|
| Version | 2.1 (Feb 10, 2026) |
| Last Updated | February 10, 2026 |
| Classification | INTERNAL — Solo Founder Use Only |
| Network | Arbitrum One (Chain ID: 42161) |
| Deployer | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |

---

## 1. MISSION

Validate all 56+ deployed smart contracts on Arbitrum One through real capital flows over 52 weeks at $100/week ($5,200 total). Generate auditable on-chain evidence of every product's full lifecycle. Accumulate sufficient protocol-generated revenue to acquire the first investment property.

This is NOT a public launch. This is an internal stress test by the solo founder before any community release.

---

## 2. DUAL AXUSD ECOSYSTEM

Two separate AXUSD stablecoins coexist on Arbitrum One. Every operation must use the correct one.

### 2.1 PRIMARY AXUSD (GENIUS Act Compliant)

| Field | Value |
|-------|-------|
| Address | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` |
| PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` |
| Total Supply | 1,000,048.91 AXUSD |
| PSM Ceiling | 5,000,000 USDC |
| Compliance | GENIUS Act (Public Law 119-27) |
| Reserve Backing | 100% — T-Bills, RWAs, USDC |
| Selection Rule | Highest `totalSupply()` among verified Axiom AXUSD contracts on Arbitrum One |
| Use For | Minting, PSM swaps, supply tracking, public metrics, RWA backing |

### 2.2 EULER AXUSD (Original — Immutable On-Chain Binding)

| Field | Value |
|-------|-------|
| Address | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| PSM | `0x4584888cB411E9cc88e3800BAB73A430D90d3793` |
| Total Supply | 156.50 AXUSD |
| PSM Ceiling | 500,000 USDC |
| Selection Rule | Determined strictly by `EulerVault.asset()` and `RevenueRouter.axusd()` — never by supply |
| Use For | Euler Vault deposits, Revenue Router fees, lending operations |

### 2.3 Binding Verification

`EulerVault.asset()` returns `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c`.
`RevenueRouter.axusd()` returns `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c`.
These bindings are immutable. They cannot be changed.

### 2.4 DO NOT MIX Rule

**Never deposit PRIMARY AXUSD into Euler Vault and never report EULER AXUSD metrics as public supply.**

This is enforced in code via the `DO_NOT_MIX` constant exported from `src/config/activeContracts.generated.ts`.

### 2.5 Source of Truth

| Item | Location |
|------|----------|
| Generated config | `src/config/activeContracts.generated.ts` |
| Verification script | `scripts/verify-active-contracts.js` |
| Regenerate command | `npm run verify:contracts` |

---

## 3. CONTRACT REGISTRY

### 3.1 Core Protocol Addresses

| Contract | Address |
|----------|---------|
| PRIMARY AXUSD | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` |
| PRIMARY PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` |
| EULER AXUSD | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| EULER PSM | `0x4584888cB411E9cc88e3800BAB73A430D90d3793` |
| Euler Vault (eAXUSD-4) | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` |
| Revenue Router | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` |
| Treasury Hub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` |
| AXM Token | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| SEED Token | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` |

### 3.2 Legacy/Deprecated Addresses

| Address | Reason |
|---------|--------|
| `0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F` | handleUSD (fxUSD) — NOT an Axiom contract |
| `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` | Euler AXUSD Vault V3 — deprecated (broken hook config) |

---

## 4. FEE PLUMBING

### 4.1 Configuration

| Component | Value |
|-----------|-------|
| Fee Source | Euler Vault `0xe3048078...` |
| Fee Recipient | Revenue Router `0x39A9Ca...` |
| Interest Fee | 10% of borrower interest |
| Configuration TX | `0xf978ae0331445de5f98fdc863eb2c1cdd5298c8a9b065d1205726edaffae5966` |
| Status | OPERATIONAL (Feb 10, 2026) |

### 4.2 Revenue Distribution

| Bucket | Allocation | Recipient |
|--------|-----------|-----------|
| SEED Yield | 50% | SEED lockers via SEEDYieldDistributor |
| Treasury | 30% | Treasury Hub |
| Backstop | 20% | Backstop Vault |

---

## 5. WEEKLY CAPITAL ALLOCATION

### 5.1 Sentinel-Adjusted Budgets

| Category | DEFAULT | HALTED | RISK_ON |
|----------|---------|--------|---------|
| AXUSD Minting (PRIMARY PSM) | $40 | $40 | $40 |
| AXM Accumulation (Camelot DEX) | $25 | $15 | $35 |
| Buffer / Gas / Contingency | $20 | $30 | $10 |
| DePIN Node Reservation | $15 | $15 | $15 |
| **Total** | **$100** | **$100** | **$100** |

### 5.2 Allocation Rules

- Sentinel regime determines which column to use.
- AXUSD minting always uses PRIMARY PSM (GENIUS ecosystem).
- Euler deposits always use EULER PSM (Original ecosystem) to mint EULER AXUSD.
- Never cross-deposit between ecosystems (DO NOT MIX rule).

---

## 6. PHASE 1 — FOUNDATION (Weeks 1–13)

### Week 1–2: PSM Stress Test
- Mint AXUSD via PRIMARY PSM (GENIUS).
- Verify 1:1 USDC peg holds.
- Test redeem flow (AXUSD → USDC).
- Log all tx hashes in founder-ops operations log.
- Confirm PSM reserves match minted amount.

### Week 3–4: Euler Vault Activation
- Mint AXUSD via EULER PSM (Original) — use correct PSM.
- Deposit into Euler Vault (`0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059`).
- Verify share math: first deposit gets 1:1 shares (Guard Rail 3).
- Monitor fee accrual to Revenue Router.
- Tag all self-borrow positions as NON-REPRESENTATIVE (Guard Rail 4).

### Week 5–6: Revenue Router Verification
- Confirm fees flowing: Euler Vault → Revenue Router.
- Verify distribution split: 50% SEED / 30% Treasury / 20% Backstop.
- Read Revenue Router balance explicitly (Guard Rail 2).
- Cross-check with fee-plumbing-preflight API endpoint.
- Document actual fee amounts vs projected.

### Week 7–8: AXM Accumulation & DEX Testing
- Execute AXM buys on Camelot DEX.
- Test AXM/ETH and AXM/USDC pools.
- Record slippage and execution quality.
- Begin building governance-weight position.

### Week 9–10: Lending Fund Activation
- Activate Lending Fund (SEC Reg D 506(c)).
- Test deposit and withdrawal flows.
- Verify compliance documentation generation.
- Log fund NAV calculations.

### Week 11–13: SEED & SUSU Circle Launch
- Deploy first SEED staking position.
- Confirm SEED rewards from Revenue Router 50% allocation.
- Initialize SUSU savings circle (minimum viable).
- Test circle contribution and distribution mechanics.

### Phase 1 Exit Criteria
- [ ] PSM mint/redeem cycle completed with both PSMs
- [ ] Euler Vault receiving deposits, generating fees
- [ ] Revenue Router distributing to all 3 buckets
- [ ] AXM position established on Camelot
- [ ] All transactions logged in founder-ops
- [ ] Zero untagged self-borrow positions

---

## 7. PHASE 2 — PRODUCT ACTIVATION (Weeks 14–26)

### Week 14–16: DePIN Node Deployment
- Activate first DePIN infrastructure node.
- Configure node reward collection.
- Verify node uptime monitoring.
- Test node revenue → treasury flow.

### Week 17–19: Sentinel Live Trading
- Transition Sentinel from advisory to semi-active.
- Execute first Sentinel-authorized trade.
- Verify authorization hash chain integrity.
- Audit trail must show: signal → qualify → allocate → authorize.
- Sentinel remains ADVISORY ONLY until governance vote (Guard Rail 5).

### Week 20–22: Cross-Product Integration
- Test AXUSD minting → Euler deposit → fee generation → SEED reward.
- Full lifecycle: $1 in → trace through every contract → revenue out.
- Document complete money flow with tx hashes.
- Verify no value leakage between contracts.

### Week 23–26: Stress Testing & Edge Cases
- Test maximum position sizes within budget.
- Simulate market stress scenarios.
- Test all withdrawal paths under pressure.
- Verify liquidation parameters (if applicable).
- ERC4626 edge case: verify minSharesOut > 0 on deposits (Guard Rail 3).

### Phase 2 Exit Criteria
- [ ] All 7 product categories activated with real capital
- [ ] DePIN node generating measurable revenue
- [ ] Sentinel pipeline producing auditable decisions
- [ ] Full lifecycle trace documented end-to-end
- [ ] No unresolved edge cases in share math

---

## 8. PHASE 3 — REVENUE OPTIMIZATION (Weeks 27–39)

### Week 27–30: Yield Optimization
- Optimize Euler Vault position for maximum fee generation.
- Tune SEED staking for optimal reward capture.
- Analyze Revenue Router distribution efficiency.
- Calculate actual APY vs theoretical across all products.

### Week 31–34: Treasury Growth Analysis
- Aggregate all revenue streams.
- Calculate net protocol revenue after gas costs.
- Project treasury growth trajectory to Week 52.
- Determine if property acquisition target is achievable.

### Week 35–39: Governance Preparation
- Document all operational learnings.
- Prepare governance framework for public phase.
- Define voting thresholds for Sentinel activation.
- Draft community onboarding materials.
- Review all 6 guard rails — confirm none violated.

### Phase 3 Exit Criteria
- [ ] Revenue optimization implemented and measured
- [ ] Treasury growth trajectory calculated
- [ ] Property acquisition feasibility determined
- [ ] Governance framework documented
- [ ] All guard rails verified intact

---

## 9. PHASE 4 — PROPERTY ACQUISITION (Weeks 40–52)

### Week 40–43: Property Pipeline
- Activate property search using ATTOM/RentCast/Walk Score APIs.
- Score candidate properties against protocol criteria.
- Verify sufficient treasury balance for acquisition.
- Legal review of tokenization structure.

### Week 44: HARD PAUSE CHECKPOINT (Guard Rail 6)
- IF no qualifying property identified by Week 44: HARD PAUSE on property acquisition track. Redirect remaining budget to treasury growth. Document decision and rationale.
- IF qualifying property exists: Proceed to due diligence.

### Week 45–48: Due Diligence & Tokenization
- Complete property due diligence.
- Prepare real estate tokenization smart contracts.
- Test tokenization flow on testnet first.
- Legal compliance review.

### Week 49–52: Acquisition & Documentation
- Execute property acquisition (if approved).
- Tokenize property on-chain.
- Generate final 52-week audit report.
- Document all lessons learned.
- Prepare for public phase transition.

### Phase 4 Exit Criteria
- [ ] Property acquired OR hard pause documented
- [ ] Complete 52-week transaction audit trail
- [ ] All smart contracts validated through real use
- [ ] Protocol ready for public phase assessment

---

## 10. MANDATORY GUARD RAILS

### Guard Rail 1: Fee Recipient Assumption Check
Before any `setFeeReceiver()` call, verify Euler vault fees are non-zero. Never assume fees are flowing — read on-chain.
- Check: `GET /api/founder-ops/fee-plumbing-preflight`
- Status: PASS (Feb 10, 2026)

### Guard Rail 2: Revenue Router Accounting Visibility
Never trust balance assumptions. Always perform explicit balance read + event verification before claiming revenue distribution is working.
- Check: `GET /api/founder-ops/overview` → `feePlumbing` field
- Status: PASS (Feb 10, 2026)

### Guard Rail 3: ERC4626 Share Math Edge Case
On every Euler Vault deposit, assert `minSharesOut > 0`. First depositor gets 1:1 shares. Subsequent depositors must verify share price has not been manipulated.
- Check: Manual verification on each deposit tx

### Guard Rail 4: Self-Borrow Risk Contamination
ALL founder loopback test positions (borrow against own collateral) MUST be tagged as NON-REPRESENTATIVE in the operations log. These do not reflect real market risk.
- Check: `POST /api/founder-ops/log` entries must include tag

### Guard Rail 5: Sentinel Authority Boundary
Sentinel is ADVISORY ONLY until a post-public governance vote explicitly grants execution authority. No automated trades without human confirmation during proof-of-concept.
- Check: `/sentinel` dashboard → stance must show ADVISORY

### Guard Rail 6: Property Phase Timing Risk
If no qualifying property is identified by Week 44, execute a HARD PAUSE on the property acquisition track. Redirect remaining capital to treasury growth.
- Check: Week 44 operations log entry required

---

## 11. RISK CHECKPOINTS

| # | Week | Gate |
|---|------|------|
| 1 | 4 | PSM peg stability confirmed |
| 2 | 8 | Euler fees flowing to Revenue Router |
| 3 | 13 | Phase 1 exit criteria met |
| 4 | 17 | DePIN node revenue verified |
| 5 | 22 | Full lifecycle trace documented |
| 6 | 26 | Phase 2 exit criteria met |
| 7 | 34 | Treasury growth trajectory calculated |
| 8 | 39 | Phase 3 exit criteria met |
| 9 | 44 | Property acquisition go/no-go decision |

---

## 12. MONITORING & DASHBOARDS

| Dashboard | URL |
|-----------|-----|
| Founder Operations | `/founder-ops` |
| Sentinel Dashboard | `/sentinel` |
| Sentinel Audit Trail | `/sentinel/audit` |

| API Endpoint | Purpose |
|-------------|---------|
| `GET /api/health` | Health check (200 = OK) |
| `GET /api/founder-ops/overview` | Aggregated system status, both ecosystems, DO_NOT_MIX rule |
| `GET /api/founder-ops/fee-plumbing-preflight` | Fee plumbing verification |
| `GET /api/founder-ops/log` | Operations log read |
| `POST /api/founder-ops/log` | Operations log write (requires x-scan-key) |
| `GET /api/axusd/supply` | Primary AXUSD supply |
| `GET /api/euler/vault-stats` | Euler Vault metrics (Euler AXUSD) |
| `GET /api/sentinel/overview` | Sentinel regime and stance |

---

## 13. WEEKLY OPERATIONS TEMPLATE

Every Monday:

1. Run `npm run verify:contracts` — confirm addresses unchanged.
2. Check `GET /api/founder-ops/overview` — all 6 sources OK.
3. Check `GET /api/founder-ops/fee-plumbing-preflight` — OPERATIONAL.
4. Check `/sentinel` — current regime and stance.
5. Execute weekly capital allocation per Sentinel regime (Section 5.1).
6. AXUSD minting: use PRIMARY PSM only.
7. Euler deposits: use EULER PSM to mint, then deposit EULER AXUSD only.
8. Log all transactions via `POST /api/founder-ops/log`.
9. Verify Revenue Router received any new fees.
10. Update operations log with week number and outcomes.

---

## 14. ON-CHAIN EVIDENCE LOG

### 14.1 Contract Verification Evidence (Feb 10, 2026)

| Metric | Value |
|--------|-------|
| PRIMARY AXUSD totalSupply() | 1,000,048.91 |
| EULER AXUSD totalSupply() | 156.503658781 |
| EulerVault.asset() | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| RevenueRouter.axusd() | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| Euler binding match | CONFIRMED (both return EULER AXUSD) |
| PRIMARY PSM USDC reserves | 49.041 |
| EULER PSM USDC reserves | 56.560219 |

### 14.2 Fee Plumbing Evidence

| Field | Value |
|-------|-------|
| Configuration TX | [`0xf978ae0331445de5f98fdc863eb2c1cdd5298c8a9b065d1205726edaffae5966`](https://arbiscan.io/tx/0xf978ae0331445de5f98fdc863eb2c1cdd5298c8a9b065d1205726edaffae5966) |
| Fee Recipient | Revenue Router `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` |
| Interest Fee Rate | 10% |
| Distribution Split | 50% SEED / 30% Treasury / 20% Backstop |
| Status | OPERATIONAL |

### 14.3 System Status at Playbook Generation

| System | Status |
|--------|--------|
| Fee Plumbing | OPERATIONAL |
| Euler Vault Balance | 155.50 AXUSD (Original) |
| Primary AXUSD Supply | 1,000,048+ (GENIUS) |
| Sentinel Regime | HIGH_VOL_DISLOCATION |
| Sentinel Stance | HALTED (advisory only) |
| Data Sources | 6/6 OK (Euler, Sentinel, AXUSD, Lending, DEX, Observer) |
| Contract Verification | PASSED |
| Guard Rails | 6/6 intact |

---

## 15. SINGLE SOURCE OF TRUTH

All runtime code imports active contract addresses from:

```
src/config/activeContracts.generated.ts
```

This file is auto-generated by `scripts/verify-active-contracts.js` and must never be edited manually. To regenerate:

```
npm run verify:contracts
```

The script performs the following on-chain reads:
1. `totalSupply()` for each AXUSD candidate → selects highest as PRIMARY
2. `EulerVault.asset()` → must return EULER AXUSD address
3. `RevenueRouter.axusd()` → must return EULER AXUSD address
4. If bindings (2) and (3) do not match, the script FAILS

The generated file exports: `ACTIVE_AXUSD`, `ACTIVE_PSM`, `EULER_AXUSD`, `EULER_PSM`, `DO_NOT_MIX`, `ACTIVE_CONTRACTS`, `LEGACY_ADDRESSES`, `assertActiveContracts()`.

All API endpoints echo their active contract addresses in response JSON.

---

*End of Playbook v2.1*
