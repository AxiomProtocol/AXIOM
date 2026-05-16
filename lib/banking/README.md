# Banking Provider Seam

This directory defines the provider-agnostic banking interface used by Axiom Protocol.

## Status (2026-04-28)

**No banking provider is active.** The banking integration was disabled when the provider account was cancelled on 2026-04-28. The provider slot is fully open and ready to receive a replacement.

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

4. **Route handlers activate automatically.**
   All `pages/api/banking/` and `pages/api/axiom-rail/` handlers use `withBankingProvider`
   from `lib/banking/apiGuard.ts`. When `BANKING_PROVIDER` is set to a registered provider,
   the handlers receive a typed provider reference and execute normally. When no provider is
   configured, they return `503 BANKING_UNAVAILABLE` automatically — no handler-level changes
   needed.

5. **Update `replit.md`** to reflect the active banking provider.

## Files

* `types.ts` — the `BankingProvider` interface, value types, and error classes.
* `registry.ts` — selects the active provider by `BANKING_PROVIDER` env var; exposes
  `requireActiveBankingProvider()` and `getActiveBankingProvider()`.
* `apiGuard.ts` — `withBankingProvider` HOF for Next.js route handlers.
* `README.md` — this document.

## Related

* `lib/banking/providers/` — add new provider implementations here.
* `lib/capinfra/adapters/ach/` — lower-level settlement-adapter interface used by the
  capital-infrastructure subsystem (separate from the `BankingProvider` interface).
* `lib/providers/providerStatus.ts` — surfaces provider status to `/api/integrations/status`.
