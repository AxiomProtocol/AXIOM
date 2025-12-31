/**
 * CORS Configuration Middleware
 * Restricts Access-Control-Allow-Origin to explicit allowed domains only
 * Required for Coinbase Onramp compliance - NO WILDCARDS
 */

import type { NextApiRequest, NextApiResponse } from 'next';

function buildAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  
  origins.push('https://axiom-nexus.replit.app');
  origins.push('https://axiom-smart-city.replit.app');
  
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:5000');
    origins.push('http://127.0.0.1:5000');
  }
  
  return origins.filter(Boolean);
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

export function getCorsHeaders(req: NextApiRequest): Record<string, string> {
  const origin = req.headers.origin || '';
  
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  
  if (isAllowed) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  return {};
}

export function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const corsHeaders = getCorsHeaders(req);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (req.method === 'OPTIONS') {
    if (Object.keys(corsHeaders).length === 0) {
      res.status(403).end();
    } else {
      res.status(200).end();
    }
    return true;
  }
  
  return false;
}

export function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin || '';
  
  if (!origin) {
    return true;
  }
  
  return ALLOWED_ORIGINS.includes(origin);
}
