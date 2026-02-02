# Phase Completion Standard Operating Procedure (SOP)

**Version:** 1.0
**Date:** February 2, 2026
**Applies To:** All AXIOM Protocol development phases

---

## Purpose

This document defines the standard checklist and verification process for certifying each phase of the Universe L3 roadmap as complete. Following this SOP ensures consistency, traceability, and production safety.

---

## Pre-Completion Checklist

### 1. Documentation Verification

| Item | Required | Notes |
|------|----------|-------|
| All deliverables created | Yes | Cross-check against roadmap |
| Contract addresses documented | Yes | Full addresses, not truncated |
| On-chain verification completed | Yes | eth_getCode size checks |
| Counts match across documents | Yes | Genesis ↔ Roadmap ↔ Audit |
| "Pending" items clearly marked | Yes | No ambiguous placeholders |

### 2. Cross-Document Consistency Check

Before certifying completion, verify these documents align:

- `docs/GENESIS_SNAPSHOT.md` - Source of truth for contract registry
- `docs/UNIVERSE_L3_ROADMAP.md` - Phase status and task completion
- `docs/DEPLOYMENT_SIZE_AUDIT.md` - Size verification (scoped)
- `replit.md` - Recent changes summary

**Validation Steps:**
1. Contract counts match across all documents
2. All "Yes/Verified" entries have supporting data
3. Phase tasks marked complete in roadmap
4. Genesis tag linked in roadmap

### 3. On-Chain Verification Log

Each phase completion must include:

```
Verification Date: YYYY-MM-DD
Verification Method: eth_getCode via [RPC endpoint]
Contracts Verified: X of Y
Contracts Pending: [list specific addresses]
Timestamp Block: [optional]
```

### 4. Git Tag/Release

| Requirement | Format |
|-------------|--------|
| Tag Name | `{phase-name}-{date}` |
| Example | `genesis-snapshot-2026-02-02` |
| Release Notes | Link deliverables and counts |
| Commit Hash | Document in snapshot |

---

## Phase Completion Workflow

```
1. Complete all phase tasks
   ↓
2. Run cross-document consistency check
   ↓
3. Perform on-chain verification (eth_getCode)
   ↓
4. Update all documentation with verified data
   ↓
5. Mark "Pending" items explicitly (no ambiguity)
   ↓
6. Create git tag/release
   ↓
7. Run architect review (include_git_diff: true)
   ↓
8. Address any findings from review
   ↓
9. Final sign-off and update roadmap status
```

---

## Sign-Off Template

```markdown
## Phase [X] Completion Sign-Off

**Phase:** [Phase Name]
**Completed:** [Date]
**Tag:** [GitHub release link]

### Verification Summary
- Contracts Deployed: X
- Contracts Size-Verified: Y
- Contracts Pending Verification: Z

### Deliverables
- [x] Deliverable 1 - [link]
- [x] Deliverable 2 - [link]
- ...

### Outstanding Items (if any)
- Item 1: [status/plan]

### Sign-Off
- [ ] Documentation complete and consistent
- [ ] On-chain verification performed
- [ ] Git tag created
- [ ] Architect review passed
- [ ] Roadmap updated
```

---

## Phase-Specific Requirements

### Phase 0: Stabilization
- Genesis snapshot with all deployed contracts
- Size audit for modularization planning
- Fork script for testnet experimentation

### Phase 1: Treasury Integration
- AXUSD system contracts deployed
- Treasury adapter contracts live
- Revenue metrics dashboard functional

### Phase 2: Modularization
- Core contracts refactored for L3 portability
- Size reduction verified where needed

### Phase 3: Universe L3 Testnet
- Private L3 running on Orbit
- Bridge contracts tested
- Internal team validation complete

### Phase 4: Universe L3 Private Mainnet
- Revenue generation metrics documented
- User onboarding tested
- Emergency procedures validated

### Phase 5: Public Launch
- Full security audit complete
- Public documentation published
- Community launch plan executed

---

## Error Handling

If phase completion review fails:

1. **Document findings** - List specific issues
2. **Create remediation tasks** - Add to task list
3. **Fix issues** - Address each finding
4. **Re-run verification** - Repeat architect review
5. **Iterate** - Until all checks pass

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial SOP |
