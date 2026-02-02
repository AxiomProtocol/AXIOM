# Node Operator Program Blueprint

**Version:** 1.0  
**Created:** February 2, 2026  
**Status:** Step 1 Complete

---

## Overview

This directory contains the canonical blueprint documentation for the AXIOM Node Operator Program. These documents define the end-to-end workflow, system architecture, data model, and on-chain contract specifications.

---

## Documents

| File | Description |
|------|-------------|
| [architecture.md](./architecture.md) | System architecture overview and component diagram |
| [workflow.md](./workflow.md) | Operator lifecycle state machine and transitions |
| [data-model.md](./data-model.md) | Database schema, API contracts, and data flows |
| [on-chain-spec.md](./on-chain-spec.md) | Smart contract specifications for Step 2 implementation |

---

## Implementation Status

| Step | Name | Status |
|------|------|--------|
| 0 | Repo Discovery and Inventory | Complete |
| 1 | Blueprint Documentation | Complete |
| 2 | On-Chain Contracts | Pending |
| 3 | Credits Ledger | Pending |
| 4 | Readiness Gate | Pending |
| 7 | Note Portal | Pending |
| 8 | Tests | Pending |
| 9 | Shell Commands | Pending |

---

## Related Documentation

- [deployments.md](../deployments.md) - Deployed contract addresses
- [contract-registry.md](../contract-registry.md) - Contract tier classification
- [current-roles-and-permissions.md](../current-roles-and-permissions.md) - Role assignments

---

## Acceptance Criteria

Each document in this blueprint:
1. Cites current UI/APIs and database tables as sources
2. References existing contract artifacts in `archive/contracts-dev/`
3. Defines explicit scope boundaries for on-chain vs off-chain
4. Includes acceptance criteria for Step 2 implementation
