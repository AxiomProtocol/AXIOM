# Governance Hardening Protocol

**Status:** `governanceHardeningActive = true`  
**Network:** Arbitrum One (42161)  
**Last Updated:** 2026-01-26  
**Classification:** Internal Operations

---

## Review Window

| Milestone | Date |
|-----------|------|
| Hardening Window Start | 2026-01-26 |
| Earliest Possible Lock Review | Month 2 (2026-03-26) |
| Latest Intended Lock Review | Month 6 (2026-07-26) |

---

## Minimum Lock Criteria Checklist

Use this as the gate to execute `lockForever()`. All criteria must remain green for the full observation window.

### Governance & Controls

| Criterion | Status | Notes |
|-----------|--------|-------|
| Timelock delay active and unchanged for entire window | Pending | 24h delay configured |
| At least 1 successful proposal lifecycle (propose → delay → execute) | Pending | None executed yet |
| Zero unauthorized role changes | Passing | No changes detected |
| Guardian / Circuit Breaker role assigned and tested (non-triggering) | Pending | Role assignment pending |

### Treasury & Risk

| Criterion | Status | Notes |
|-----------|--------|-------|
| Treasury balance never negative | Passing | |
| No invariant violations across all 5 domains | Passing | 15/15 passing |
| Exposure ceilings respected at all times | Passing | |
| No emergency pause triggered | Passing | |

### Observability

| Criterion | Status | Notes |
|-----------|--------|-------|
| Observer dashboard live continuously | Passing | 7 pages operational |
| Metrics stable and publishing on schedule | Passing | 22 metrics defined |
| No gaps in on-chain reads or reporting | Passing | |

### Operations

| Criterion | Status | Notes |
|-----------|--------|-------|
| No hotfixes or admin shortcuts introduced | Passing | |
| No parameter changes in final hardening phase | Pending | Window not started |
| Public notice of intent issued before lock | Pending | |

**Gate Status:** When all boxes stay green for the full window → proceed with `lockForever()`.

---

## Public Wording

> **Governance Hardening Status**
>
> Axiom operates with an active timelock during an initial observation period.
>
> This window exists to validate real-world operation, governance workflows, and emergency controls under live conditions.
>
> The irreversible governance lock will be executed only after:
> - Verified operating history
> - Successful governance execution
> - Zero invariant violations
> - Public notice of intent
>
> This approach prioritizes system integrity over speed.

---

## Documentation Cadence

### Weekly Snapshot (Short)

Publish every Monday:
- Treasury balance snapshot
- Timelock status unchanged (yes/no)
- Invariants: all passing (count)
- Governance actions: none (or list if executed)

### Monthly Report (Structured)

Publish first week of each month:
- Risk metrics summary
- Governance activity log
- Observer uptime percentage
- Any deviations (even if none)

**Consistency matters more than polish.**

---

## Operational Guidance

### What To Do Right Now

1. ✅ This checklist added to `/docs/governance-hardening.md`
2. ✅ `governanceHardeningActive = true` flag documented
3. ✅ Review window scheduled (Month 2 earliest, Month 6 latest)
4. **Do nothing else unless something breaks.**

That restraint is the signal.

### What This Sets You Up For

Once this window completes, you'll be able to:
- Execute `lockForever()` with confidence
- Hand institutions a clean operating history
- Say "this system has already been running this way"

---

## Contract References

| Contract | Address | Role |
|----------|---------|------|
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Timelock enforcement |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | Parameter registry |
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Proposal execution |

---

## Next Steps (Pending Decision)

After hardening window completes:
- [ ] Draft exact lock execution announcement
- [ ] Define pre-lock external review checklist
- [ ] Wire "lock readiness" badge into observer dashboard
