/**
 * Capital Infrastructure — typed error classes mapped to HTTP status codes.
 */

export class CapInfraError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 500, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends CapInfraError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class UnauthorizedError extends CapInfraError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends CapInfraError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends CapInfraError {
  constructor(message = 'Not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends CapInfraError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

export class PolicyDeniedError extends CapInfraError {
  constructor(reasonCode: string, message: string, details?: unknown) {
    super(reasonCode, message, 422, details);
  }
}

import type { NextApiResponse } from 'next';
import { ZodError } from 'zod';

export function sendError(res: NextApiResponse, err: unknown): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof CapInfraError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }
  console.error('[capinfra] unhandled error', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}
