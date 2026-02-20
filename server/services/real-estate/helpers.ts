import type { NextApiResponse } from 'next';

export interface ApiMeta {
  as_of: string;
  sources_used: string[];
  confidence: number;
  warnings?: string[];
}

export function successResponse(res: NextApiResponse, data: unknown, meta: ApiMeta) {
  return res.status(200).json({ data, meta, error: null });
}

export function errorResponse(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
  meta?: Partial<ApiMeta>
) {
  return res.status(status).json({
    data: null,
    meta: {
      as_of: new Date().toISOString(),
      sources_used: [],
      confidence: 0,
      ...meta,
    },
    error: { code, message },
  });
}

export function buildMeta(
  sources: string[],
  confidence: number,
  warnings?: string[]
): ApiMeta {
  return {
    as_of: new Date().toISOString(),
    sources_used: sources,
    confidence,
    warnings: warnings?.length ? warnings : undefined,
  };
}

export function requireMethod(method: string) {
  return (req: { method?: string }, res: NextApiResponse): boolean => {
    if (req.method !== method) {
      errorResponse(res, 405, 'METHOD_NOT_ALLOWED', `Only ${method} is accepted`);
      return false;
    }
    return true;
  };
}

export function parseNumeric(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}
