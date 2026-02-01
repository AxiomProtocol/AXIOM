# Node Operator Program - Implementation Assumptions

**Version:** 1.0.0  
**Last Updated:** 2026-02-01  
**Classification:** Internal Use Only

---

## Overview

This document records assumptions made during the implementation of the Node Operator Program where specifications were ambiguous or incomplete.

---

## Implementation Assumptions

### 1. Operator Identity

**Assumption**: Operator IDs are auto-generated UUIDs prefixed with `OP-`.

**Rationale**: No specific ID format was specified. UUID provides uniqueness and the prefix aids human readability.

**Example**: `OP-a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

### 2. Attestation Signature Format

**Assumption**: Signature stubs are SHA256 hashes representing the attestation signature, not actual cryptographic signatures.

**Rationale**: The program operates at the application layer without direct smart contract interaction. Actual on-chain signatures are handled separately when attestations are submitted to CapitalBridgeHub.

**Format**: `sig:sha256:<64-char-hex>`

---

### 3. Conflict Check Implementation

**Assumption**: Conflict checks are self-attested with a boolean flag. Future versions may include automated conflict detection.

**Rationale**: No conflict detection system was specified. Self-attestation with audit trail provides accountability.

**Fields**:
- `conflictCheckPassed`: boolean
- `conflictDisclosure`: optional string

---

### 4. Verification Artifact Storage

**Assumption**: Verification artifacts are stored as hashes only; actual documents are stored externally (e.g., in secure document management system).

**Rationale**: Sensitive KYC documents should not be stored in application data. Hash references provide proof without storage.

---

### 5. Posted AXIOM Rate Source

**Assumption**: The `postedAxiomUsdRate` is manually configured in `data/nodes/config.json`. No automated oracle integration.

**Rationale**: Oracle integration would require additional infrastructure. Manual posting allows human oversight during observation window.

**Default Rate**: $0.10 USD per AXIOM

---

### 6. Dry-Run Packet Selection

**Assumption**: Dry-run exercises use existing test packets in `data/property-packets/`. No separate dry-run packet set.

**Rationale**: Reusing existing test data reduces duplication and ensures dry-runs reflect production packet structure.

---

### 7. Dual Attestation Pairing

**Assumption**: Dual attestation requires two different operators but does not require specific "competency categories" as those are not yet defined.

**Rationale**: Competency categories were mentioned but not defined. Current implementation enforces only that attestors are different.

**Future**: Add `competencyCategory` field when categories are defined.

---

### 8. Suspension Status

**Assumption**: Suspended operators retain their status but with a `suspended: true` flag and cannot perform activities.

**Rationale**: No SUSPENDED status was defined in the status enum. Flag approach preserves status history.

---

### 9. Reward Payout Execution

**Assumption**: Payout previews are generated but actual token transfers are not executed by this module.

**Rationale**: Token transfers require treasury integration and transaction signing. This module handles accrual and preview only.

---

### 10. Weekly Report Timing

**Assumption**: Weekly reports cover Sunday 00:00 UTC to Saturday 23:59 UTC.

**Rationale**: No specific week definition provided. UTC-based week provides consistency.

---

### 11. Incident Investigation Timeline

**Assumption**: Investigation periods are:
- LOW: 7 days
- MEDIUM: 14 days
- HIGH: 21 days
- CRITICAL: 30 days (immediate suspension applies)

**Rationale**: Severity-based timelines not specified. These provide reasonable investigation periods.

---

### 12. Hash Format Standardization

**Assumption**: All hash references use the format `sha256:<64-char-hex>` for consistency.

**Rationale**: Multiple hash formats could cause confusion. Standardized format aids validation and display.

---

### 13. Packet-Operator Assignment

**Assumption**: Operators are not explicitly assigned to packets. Any ACTIVE operator with appropriate role may work on any packet.

**Rationale**: No assignment system was specified. Open model allows flexibility.

**Future**: Add assignment system if exclusive packet ownership is needed.

---

### 14. Multi-Role Operators

**Assumption**: An operator may hold multiple roles (e.g., Validator + Observer) but not (Attestor + Validator) for the same packet to preserve independence.

**Rationale**: Role stacking was mentioned for earnings but conflict rules were not specified. Conservative approach prevents self-attestation.

---

### 15. Sample Data Realism

**Assumption**: Sample data uses realistic but fictional values. Wallet addresses are test addresses (not mainnet).

**Rationale**: Production data cannot be used in samples. Realistic fictional data aids testing.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-01 | Initial assumptions documented | System |

---

## Review Schedule

These assumptions should be reviewed:
- Before production launch
- When related features are expanded
- During quarterly program review
