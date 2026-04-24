# Language Modernization Map

Date: 2026-02-11
Scope: UI copy only — no code identifiers, API routes, database columns, types, or contract addresses modified.

## Purpose

Reduce explicit crypto-native vocabulary in public-facing pages where it improves allocator readability, without losing technical precision in contexts where specificity matters.

## Files Modified

| File | Terms Replaced | Terms Kept |
|---|---|---|
| pages/about-us.tsx | token, smart contract, smart contracts, multi-signature | bridge (in "bridge loan"), Arbitrum One |
| pages/pilot/index.tsx | None needed (already institutional) | All existing terms |
| pages/sentinel/index.tsx | None needed (already institutional) | All existing terms |

## Replacement Map

| Original Term | Replacement | Context Rule |
|---|---|---|
| smart contract(s) | automated control layer(s) | Always replace in marketing/about copy |
| multi-signature | multi-party authorization | Always replace in marketing/about copy |
| token | instrument | Only when describing broad concepts; keep in technical API/contract contexts |
| DeFi | on-chain liquidity markets | Only in non-technical marketing copy |
| multi-sig | multi-party authorization | Always in UI copy |
| Arbitrum One | L2 settlement environment | Only in non-technical marketing copy; keep when stating technical facts |
| staking | capital deployment | In marketing copy only |
| dao | governance council | In marketing copy only |
| whitepaper | technical prospectus | Always |
| airdrop | distribution event | Always |
| tvl / total value locked | assets under management | Always |

## Specific Changes Made

### pages/about-us.tsx

1. **Line 19** (AXIOM_IS_NOT array):
   - Before: `A meme driven token story`
   - After: `A meme driven instrument narrative`

2. **Line 33** (PRINCIPLES Security):
   - Before: `Multi-signature controls, audited smart contracts, and privacy by default.`
   - After: `Multi-party authorization controls, audited automated control layers, and privacy by default.`

3. **Line 39** (MILESTONES 2024):
   - Before: `smart contract architecture design`
   - After: `automated control layer architecture design`

4. **Line 40** (MILESTONES Q1 2025):
   - Before: `23 verified smart contracts deployed on Arbitrum One`
   - After: `23 verified automated control layers deployed on Arbitrum One`

### pages/pilot/index.tsx

No changes required. Page copy is already institutional-grade with no prohibited terms detected.

### pages/sentinel/index.tsx

No changes required. Page copy is already institutional-grade with no prohibited terms detected.

## Terms Intentionally NOT Replaced

| Term | Location | Reason |
|---|---|---|
| bridge loan | about-us.tsx line 42 | Standard financial term (short-term real estate financing). Not a crypto bridge. Added to lexicon guard exclusion list. |
| Arbitrum One | about-us.tsx lines 36, 43 | Used in technical context stating where contracts are deployed. Precision matters here. |
| contracts | about-us.tsx line 36 | Used as "23 verified contracts" — generic term, not "smart contracts" |
| SPV | pilot/index.tsx | Standard financial term (Special Purpose Vehicle). Not crypto vocabulary. |
| DEX | Multiple pages | Retained in technical contexts where it refers to the specific product name (DEX V2 ecosystem) |
| AXM | Multiple pages | Protocol instrument ticker — technical identifier, not marketing copy |
| AXUSD | Multiple pages | Protocol stablecoin ticker — technical identifier |

## Lexicon Guard Updates

Added compound term exclusions to `lib/designLaw/lexiconGuard.ts` to prevent false positives:
- `bridge loan` — standard financial term
- `bridge financing` — standard financial term
- `hash map` / `hash table` / `hash code` — standard programming terms

## Verification

```bash
# Run lexicon test to verify all changes
npm run test:lexicon

# Expected output: MIRDT files clean, 0 advisory violations
```
