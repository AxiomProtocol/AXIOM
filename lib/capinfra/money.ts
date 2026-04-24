/**
 * Capital Infrastructure — canonical money helpers and type-level guards.
 *
 * Why this module exists
 * ──────────────────────
 * Tasks #202 and #214 both fixed the same defect — passing raw integer
 * cents (e.g. "50000") into a settlement-layer field that expects a USD
 * decimal string ("500.00"). The bug silently persisted amounts 100×
 * too large because both values are plain `string` at the type level.
 *
 * To prevent that class of regression, every settlement-layer consumer
 * (`createInstruction`, `externallySettleInstruction`, drift rows, etc.)
 * now requires a *branded* `UsdDecimalString`. Plain `string` values —
 * including `String(tx.amount)` from raw cents — will not compile.
 *
 * The only legitimate ways to obtain a `UsdDecimalString` are:
 *
 *   - `centsToDecimalString(cents)`         — convert from integer cents
 *   - `usdDecimalString(s)`                 — runtime-validate an existing
 *                                             decimal string (e.g. coming
 *                                             from a remote API or DB row)
 *   - `z.string().regex(...).brand<...>()`  — zod parse at the API edge
 *
 * Any drift in the call graph that tries to short-circuit these helpers
 * will be caught by the TypeScript compiler.
 */

declare const __usdDecimalBrand: unique symbol;
declare const __centsBrand: unique symbol;

/**
 * USD amount as a fixed-point decimal string (e.g. "500.00", "0.01").
 * Branded so raw `string` values cannot reach settlement-layer consumers
 * without going through `centsToDecimalString` or `usdDecimalString`.
 */
export type UsdDecimalString = string & { readonly [__usdDecimalBrand]: 'UsdDecimalString' };

/**
 * Integer USD cents (signed). Branded so callers must consciously use
 * `asCents` (or the conversion helper) rather than treating any random
 * `number` as cents.
 */
export type Cents = number & { readonly [__centsBrand]: 'Cents' };

// Decimal-string format: optional sign, integer part, optional fractional
// part of any length. Stellar amounts use up to 7 fractional digits, ACH
// uses 2; the brand exists to distinguish "decimal string from a trusted
// source" from "raw cents serialized via String(...)", not to police the
// fractional-digit count. Per-rail precision rules live in the adapter.
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/**
 * Tag a validated integer as `Cents`. Throws if the value is not a
 * finite integer.
 */
export function asCents(n: number): Cents {
  if (!Number.isInteger(n)) {
    throw new TypeError(`asCents: expected integer, got ${n}`);
  }
  return n as Cents;
}

/**
 * Convert a signed integer cents value into an absolute USD decimal
 * string. Example: -1234 → "12.34", 500 → "5.00".
 *
 * This is the single canonical path from cents to a settlement-layer
 * amount string. Callers MUST NOT use `String(cents)` or template
 * literals to serialize cents directly.
 */
export function centsToDecimalString(cents: number): UsdDecimalString {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`centsToDecimalString: expected integer cents, got ${cents}`);
  }
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${whole}.${frac}` as UsdDecimalString;
}

/**
 * Runtime-validate a string as a USD decimal amount and return the
 * branded type. Use this when an amount string already exists (e.g.
 * the value came from Horizon, the DB, or a parsed webhook field) and
 * you need to feed it into the settlement layer.
 */
export function usdDecimalString(s: string): UsdDecimalString {
  if (typeof s !== 'string' || !DECIMAL_RE.test(s)) {
    throw new TypeError(`usdDecimalString: invalid USD decimal string "${s}"`);
  }
  return s as UsdDecimalString;
}

/**
 * Best-effort parse: returns the branded value or `null` if the input
 * isn't a valid USD decimal string. Useful for webhook payloads where
 * the field is optional and should silently drop on malformed data.
 */
export function tryUsdDecimalString(s: string | null | undefined): UsdDecimalString | null {
  if (typeof s !== 'string' || !DECIMAL_RE.test(s)) return null;
  return s as UsdDecimalString;
}

/**
 * Convert a USD decimal string into integer cents using deterministic
 * bigint arithmetic (no floating-point). "100.00" → 10000n, "0.01" → 1n.
 * Mirrors `decimalStringToCents` in the ACH SDK; re-exported here so
 * callers can stay within the canonical money module.
 */
export function decimalStringToCents(decimal: string): bigint {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith('-');
  const abs = negative ? trimmed.slice(1) : trimmed;
  const dotIdx = abs.indexOf('.');
  let wholePart: string;
  let fracPart: string;
  if (dotIdx === -1) {
    wholePart = abs;
    fracPart = '00';
  } else {
    wholePart = abs.slice(0, dotIdx);
    fracPart = abs.slice(dotIdx + 1, dotIdx + 3).padEnd(2, '0');
  }
  const cents = BigInt(wholePart || '0') * 100n + BigInt(fracPart);
  return negative ? -cents : cents;
}
