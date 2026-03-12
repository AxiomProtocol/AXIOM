import { Unit } from '@unit-finance/unit-node-sdk';

const UNIT_API_TOKEN = process.env.UNIT_API_TOKEN;

function resolveBaseUrl(): string {
  const raw = (process.env.UNIT_API_URL ?? 'https://api.s.unit.sh').trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(raw);
    const base = `${parsed.protocol}//${parsed.host}`;
    if (base !== raw) {
      console.warn(`[Unit] UNIT_API_URL contained a path ("${raw}") — using base origin "${base}" instead`);
    }
    return base;
  } catch {
    return 'https://api.s.unit.sh';
  }
}

const UNIT_API_URL = resolveBaseUrl();

let _client: Unit | null = null;

export function getUnitClient(): Unit | null {
  if (!UNIT_API_TOKEN) {
    console.warn('[Unit] UNIT_API_TOKEN is not set — Unit banking features are disabled');
    return null;
  }
  if (!_client) {
    _client = new Unit(UNIT_API_TOKEN, UNIT_API_URL);
  }
  return _client;
}

export function isUnitConfigured(): boolean {
  return Boolean(UNIT_API_TOKEN);
}

export const UNIT_ORG_ID = process.env.UNIT_ORG_ID ?? '';
export const UNIT_WEBHOOK_SECRET = process.env.UNIT_WEBHOOK_SECRET ?? '';
export { UNIT_API_URL };
