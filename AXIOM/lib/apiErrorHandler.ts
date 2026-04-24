import { NextApiRequest, NextApiResponse } from 'next';
import { logError } from './errorLogger';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      const statusCode = error?.statusCode || 500;

      logError(error, {
        path: req.url,
        method: req.method,
        statusCode,
        userAgent: req.headers['user-agent'],
        requestBody: req.method !== 'GET' ? req.body : undefined,
        additionalInfo: {
          query: req.query,
          headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer,
          },
        },
      });

      if (!res.headersSent) {
        res.status(statusCode).json({
          error: errorMessage,
          code: statusCode,
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }
    }
  };
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
