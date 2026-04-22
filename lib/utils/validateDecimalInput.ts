/**
 * validateDecimalInput
 * Validates a decimal string before passing to ethers.parseUnits().
 * Throws ValidationError (statusCode=400) on invalid input.
 *
 * Guards: empty, zero, negative, exponential notation, too many decimals, non-numeric.
 */

export class ValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateDecimalInput(value: string, maxDecimals: number = 18): void {
  if (!value || value.trim() === "") {
    throw new ValidationError("Amount is required");
  }

  const trimmed = value.trim();

  // Reject negative
  if (trimmed.startsWith("-")) {
    throw new ValidationError("Amount must be positive");
  }

  // Reject exponential notation (ethers.parseUnits cannot handle "1e-7")
  if (trimmed.toLowerCase().includes("e")) {
    throw new ValidationError("Amount must be a plain decimal number (exponential notation not supported)");
  }

  // Reject non-numeric characters (allow digits, one dot, one leading sign already rejected above)
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new ValidationError("Amount must be a valid decimal number");
  }

  // Reject zero
  if (parseFloat(trimmed) <= 0) {
    throw new ValidationError("Amount must be greater than zero");
  }

  // Reject too many decimal places
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex !== -1) {
    const decimals = trimmed.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      throw new ValidationError(`Amount supports at most ${maxDecimals} decimal places`);
    }
  }
}
