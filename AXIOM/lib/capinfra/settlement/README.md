# Settlement (Phase 2)

Settlement instruction service is out of scope for Phase 1. The
`cap_settlement_instructions` table exists with a unique
`idempotency_key` constraint so Phase 2 can implement instruction
authorization, execution, and reconciliation without a schema change.
