# Canton Network — Open Questions

---

## Business / Partnership Questions (Block All Implementation)

### Q1: Has Digital Asset been contacted?
- **Why it matters:** No Canton integration can proceed without a participant agreement.
- **Resolved?** No
- **Action:** Initiate contact at https://canton.network or sales@digitalasset.com
- **Who resolves:** Axiom business development / founder

### Q2: What does the Canton participant agreement require?
- **Why it matters:** Determines legal obligations, technical requirements, and timeline.
- **Resolved?** No — requires contact with Digital Asset
- **Expected requirements:** Entity verification, technical participant node setup, sync domain connection, network fees

### Q3: Which institutional counterparties does Axiom need to reach on Canton?
- **Why it matters:** Without defined counterparties, there is no Canton use case to build toward.
- **Resolved?** No
- **Who resolves:** Axiom BD / founder

### Q4: Is DAML Hub (managed participant) available and appropriate?
- **Why it matters:** Self-hosted participant requires Go/DevOps expertise not currently in repo.
- **Resolved?** No — must verify with Digital Asset
- **Recommendation:** Use DAML Hub for Phase 1 if available; evaluate cost vs operational burden

---

## Technical Questions

### Q5: Does the team have DAML expertise?
- **Why it matters:** No DAML contracts exist in the repo. Writing DAML requires DAML-specific training.
- **Resolved?** No — no `.daml` files in current codebase
- **Options:** Train existing engineers, hire/contract DAML specialist, engage Digital Asset professional services

### Q6: What Axiom products will be represented as DAML contracts on Canton?
- **Why it matters:** DAML contracts model the specific business logic. Without a defined product scope, contracts cannot be designed.
- **Resolved?** No
- **Candidates:** LP positions (Reg D), secondary market interests, distribution events

### Q7: How does Canton settlement relate to AXUSD settlement on Arbitrum?
- **Why it matters:** If Canton-based LP positions generate distributions, how are those distributions paid? AXUSD on Arbitrum, or a Canton-native asset?
- **Resolved?** No
- **Options:**
  1. Canton position records settlement obligation → Axiom executes AXUSD transfer on Arbitrum separately
  2. Canton connects to Arbitrum via cross-chain settlement (complex)
  3. Canton uses its own asset representation (DAML-modeled) without Arbitrum settlement

### Q8: Is gRPC / @grpc/grpc-js acceptable in the Node.js codebase?
- **Why it matters:** Canton Ledger API is gRPC. This is different from all existing Axiom API patterns.
- **Resolved?** No
- **Recommendation:** Use Canton JSON API (REST wrapper) to avoid gRPC complexity in Node.js

---

## Compliance / Legal Questions

### Q9: Does Canton integration require additional SEC disclosure?
- **Why it matters:** Adding a new institutional access surface to Reg D programs may require disclosure updates.
- **Resolved?** No — legal review needed

### Q10: What are Digital Asset's liability and data handling requirements?
- **Why it matters:** Canton participant agreement will impose obligations on Axiom.
- **Resolved?** No — requires agreement review

---

## Status Tracking

| Question | Resolved | Date | Resolution |
|---------|----------|------|------------|
| Q1 — Digital Asset contact | No | — | — |
| Q2 — Participant agreement requirements | No | — | — |
| Q3 — Target institutional counterparties | No | — | — |
| Q4 — DAML Hub availability | No | — | — |
| Q5 — DAML expertise | No | — | — |
| Q6 — Product scope for Canton | No | — | — |
| Q7 — Canton vs Arbitrum settlement | No | — | — |
| Q8 — gRPC vs JSON API preference | No | — | — |
| Q9 — SEC disclosure | No | — | — |
| Q10 — DA agreement obligations | No | — | — |
