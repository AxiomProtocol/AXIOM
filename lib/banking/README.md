# Banking Provider Seam

This directory defines the provider-agnostic banking interface used by Axiom Protocol.

## Status (2026-04-28)

**No banking provider is active.** The historical integration (Increase) was disabled when the user's Increase account was cancelled. The legacy code in `lib/services/IncreaseService.ts` is preserved and short-circuited via the `INCREASE_DISABLED` env var; it now throws `IncreaseDisabledError` on every call.

When a replacement bank is selected, a new provider implementation should be added under `lib/banking/providers/` and registered in `registry.ts`.

## Adding a new banking provider

1. **Implement the interface.**
   ```ts
   // lib/banking/providers/mercury.ts
   import type { BankingProvider } from '../types';
   export class MercuryProvider implements BankingProvider {
     readonly id = 'mercury' as const;
     readonly name = 'Mercury';
     // ...implement all required methods from BankingProvider
   }
   ```

2. **Register it.** Add a `case` in `registry.ts`:
   ```ts
   case 'mercury': cached = new MercuryProvider(); return cached;
   ```

3. **Set environment variables.**
   ```
   BANKING_PROVIDER=mercury
   MERCURY_API_KEY=...
   ```

4. **Migrate route handlers** (incrementally).
   The historical handlers under `pages/api/banking/`, `pages/api/axiom-rail/`, and the Increase webhook handler all import `IncreaseService` directly. They should be migrated one at a time to call `requireActiveBankingProvider()` from `lib/banking/registry.ts`. While they remain on the legacy import, they will simply continue to throw `IncreaseDisabledError`/503 until the kill switch is lifted.

5. **Update `replit.md`** to reflect the active banking provider.

## Why the legacy code is still here

* It is the most complete reference implementation of the banking surface area we need (accounts, sub-accounts, ACH, wire, cards, inbound notifications, webhook signature verification).
* Database tables (`increase_participants`, `increase_lp_deposits`, `increase_distributions`, `increase_product_escrows`, `inbound_ach_events`, `cap_*` tables) still hold operational history.
* If the user provisions a new Increase account, removing the kill switch is a single env var flip.

## Files

* `types.ts` — the `BankingProvider` interface, value types, and error classes.
* `registry.ts` — selects the active provider by `BANKING_PROVIDER` env var.
* `README.md` — this document.

## Related

* `lib/services/IncreaseService.ts` — legacy reference implementation with kill switch.
* `lib/providers/providerStatus.ts` — surfaces provider status to `/api/integrations/status`.
* `lib/capinfra/adapters/types.ts` — separate, lower-level settlement-adapter interface used by the capital-infrastructure subsystem.
