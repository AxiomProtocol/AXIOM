# Canton Network — SDKs and Source Files Required

**Status:** No SDK reviewed. No source files attached. Participant agreement not in place.

---

## Primary SDK: DAML SDK

### DAML SDK
- **Download:** https://docs.daml.com/getting-started/installation.html
- **Language:** DAML contracts are written in DAML (a Haskell-inspired functional language)
- **Purpose:** Write, compile, and test Canton smart contracts (DAML templates)
- **Priority:** CRITICAL — no Canton integration without DAML SDK
- **Review status:** Not reviewed

**DAML is NOT TypeScript, NOT Solidity.** The Axiom engineering team must either:
1. Learn DAML, or
2. Engage a DAML/Canton specialist

### Key DAML SDK tools:
- `daml` CLI — compile, test, deploy DAML packages
- `daml studio` — VS Code extension for DAML development
- `daml sandbox` — Local Canton sandbox for development/testing
- `daml assistant` — Version management

---

## Application-Layer SDKs (TypeScript / Node.js)

For Axiom's Next.js backend to communicate with the Canton JSON API:

### @grpc/grpc-js (for Ledger API)
- **Package:** `@grpc/grpc-js`
- **Purpose:** gRPC client for Canton Ledger API
- **Priority:** HIGH if using Ledger API directly
- **Note:** This is a significant departure from Axiom's current REST-based integrations

### Standard fetch / axios (for JSON API)
- If using Canton JSON API (REST wrapper), standard `fetch` or `axios` works
- **Priority:** HIGH — prefer JSON API over raw gRPC for Axiom's Node.js backend
- **Note:** JSON API is simpler but may have feature gaps vs Ledger API

---

## DAML Source Files Needed

Canton integration requires DAML contracts to be written, compiled, and deployed. These DO NOT EXIST in the Axiom repo (no `.daml` files present).

Required DAML contracts to design:
1. `AxiomCapitalProduct.daml` — Models a capital program product (Reg D LP position)
2. `AxiomParticipant.daml` — Models an institutional participant and their permissions
3. `AxiomDistribution.daml` — Models a distribution event
4. `AxiomCompliance.daml` — KYC/accreditation check integration

**These contracts require a DAML specialist to design and write.**

---

## Source Files Still Needed

| File / Artifact | Source | Status |
|----------------|--------|--------|
| DAML SDK installer | docs.daml.com | Not attached |
| DAML language reference | docs.daml.com | Not attached |
| Canton JSON API reference | docs.daml.com/json-api | Not attached |
| Canton Ledger API proto files | github.com/digital-asset/daml | Not attached |
| Canton participant onboarding guide | Digital Asset (private/partner) | Not attached — requires agreement |
| Sample DAML contracts | github.com/digital-asset | Not attached |
| Canton network participant agreement | Digital Asset legal | Not attached — requires partnership |

---

## What Cannot Be Done Without Partnership

All of the following require a signed Canton participant agreement:
- Provisioning a Canton participant node
- Connecting to Canton sync domain
- Registering Axiom as a Canton party
- Uploading DAML packages to Canton
- Transacting with other Canton participants

**No DAML development has meaningful ROI until the partnership agreement is initiated.**

---

## What CAN Be Done Without Partnership

1. Evaluate DAML sandbox for local testing
2. Study DAML language and JSON API
3. Design Axiom's Canton product model in conceptual form
4. Define the DAML contract templates Axiom would need
5. Identify DAML specialist resource for contract development
