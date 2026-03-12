const BITGO_ACCESS_TOKEN = process.env.BITGO_ACCESS_TOKEN ?? process.env.AxiomProtocol_API;
const BITGO_API_URL = process.env.BITGO_API_URL ?? 'https://app.bitgo.com';
export const BITGO_ENTERPRISE_ID = process.env.BITGO_ENTERPRISE_ID ?? '';

export const isTestnet = BITGO_API_URL.includes('bitgo-test.com');
export const bitgoCoin = process.env.BITGO_COIN ?? (isTestnet ? 'tarbeth' : 'arbeth');

export interface BitGoRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

export interface BitGoResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function bitGoRequest<T = unknown>(
  path: string,
  options: BitGoRequestOptions = {}
): Promise<BitGoResponse<T>> {
  if (!BITGO_ACCESS_TOKEN) {
    console.warn('[BitGo] BITGO_ACCESS_TOKEN is not set — BitGo custody features are disabled');
    return { ok: false, status: 0, error: 'BitGo not configured' };
  }

  const { method = 'GET', body, params } = options;
  let url = `${BITGO_API_URL}/api/v2${path}`;

  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    url += `?${qs}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${BITGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
      console.error(`[BitGo] ${method} ${path} → ${res.status}: ${errMsg}`);
      return { ok: false, status: res.status, error: errMsg };
    }

    return { ok: true, status: res.status, data: json as T };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[BitGo] ${method} ${path} → network error: ${msg}`);
    return { ok: false, status: 0, error: msg };
  }
}

export function isBitGoConfigured(): boolean {
  return Boolean(BITGO_ACCESS_TOKEN);
}

export { BITGO_API_URL };
