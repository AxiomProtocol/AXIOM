/**
 * Centralized Environment Validation Utility
 * Ensures all required environment variables are available
 * and provides graceful fallbacks for missing configurations
 */

export interface EnvStatus {
  available: boolean;
  name: string;
  required: boolean;
}

export interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  available: string[];
  errors: string[];
}

// Core environment variables required for the app to function
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
] as const;

// Optional environment variables that enhance functionality
const OPTIONAL_ENV_VARS = [
  'SESSION_SECRET',
  'STRIPE_API_KEY',
  'ATTOM_API_KEY',
  'RENTCAST_API_KEY',
  'WALKSCORE_API_KEY',
  'ALCHEMY_API_KEY',
  'SENDGRID_API_KEY',
] as const;

/**
 * Check if a specific environment variable is set
 */
export function hasEnvVar(name: string): boolean {
  return typeof process.env[name] === 'string' && process.env[name]!.trim().length > 0;
}

/**
 * Get environment variable with optional default value
 */
export function getEnvVar(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }
  return defaultValue;
}

/**
 * Get required environment variable - throws if missing
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Validate all required environment variables
 */
export function validateRequiredEnvVars(): EnvValidationResult {
  const missing: string[] = [];
  const available: string[] = [];
  const errors: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (hasEnvVar(envVar)) {
      available.push(envVar);
    } else {
      missing.push(envVar);
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    available,
    errors,
  };
}

/**
 * Get status of all environment variables (required and optional)
 */
export function getEnvStatus(): EnvStatus[] {
  const status: EnvStatus[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    status.push({
      name: envVar,
      available: hasEnvVar(envVar),
      required: true,
    });
  }

  for (const envVar of OPTIONAL_ENV_VARS) {
    status.push({
      name: envVar,
      available: hasEnvVar(envVar),
      required: false,
    });
  }

  return status;
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return hasEnvVar('DATABASE_URL');
}

/**
 * Check if property services are configured
 */
export function isPropertyServicesConfigured(): {
  attom: boolean;
  rentcast: boolean;
  walkscore: boolean;
} {
  return {
    attom: hasEnvVar('ATTOM_API_KEY'),
    rentcast: hasEnvVar('RENTCAST_API_KEY'),
    walkscore: hasEnvVar('WALKSCORE_API_KEY'),
  };
}

/**
 * Check if payment services are configured
 */
export function isPaymentConfigured(): boolean {
  return hasEnvVar('STRIPE_API_KEY');
}

/**
 * Check if email services are configured
 */
export function isEmailConfigured(): boolean {
  return hasEnvVar('SENDGRID_API_KEY');
}

/**
 * Check if blockchain services are configured
 */
export function isBlockchainConfigured(): boolean {
  return hasEnvVar('ALCHEMY_API_KEY');
}

/**
 * Create a standardized error response for missing configuration
 */
export function createMissingConfigResponse(serviceName: string, requiredEnvVar: string) {
  return {
    success: false,
    error: `${serviceName} not configured`,
    message: `This feature requires ${requiredEnvVar} to be set in environment variables`,
    code: 'SERVICE_NOT_CONFIGURED',
  };
}

/**
 * Create a standardized error response for database connection issues
 */
export function createDatabaseErrorResponse(error?: Error) {
  return {
    success: false,
    error: 'Database connection error',
    message: 'Unable to connect to the database. Please try again later.',
    code: 'DATABASE_ERROR',
    details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
  };
}

/**
 * Wrap an async handler with database error handling
 */
export function withDatabaseErrorHandling<T>(
  handler: () => Promise<T>,
  fallback: T
): Promise<T> {
  return handler().catch((error) => {
    console.error('Database error:', error);
    return fallback;
  });
}

export default {
  hasEnvVar,
  getEnvVar,
  getRequiredEnvVar,
  validateRequiredEnvVars,
  getEnvStatus,
  isDatabaseConfigured,
  isPropertyServicesConfigured,
  isPaymentConfigured,
  isEmailConfigured,
  isBlockchainConfigured,
  createMissingConfigResponse,
  createDatabaseErrorResponse,
  withDatabaseErrorHandling,
};
