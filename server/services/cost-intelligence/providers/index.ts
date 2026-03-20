import { CraftsmanLocalProvider, CraftsmanHttpProvider } from './craftsman';
import type { CostProvider } from '../../../../lib/cost-intelligence/types';

const _providers: Map<string, CostProvider> = new Map();

function registerProvider(p: CostProvider) {
  _providers.set(p.id, p);
}

registerProvider(new CraftsmanLocalProvider());
registerProvider(new CraftsmanHttpProvider());

export function getProvider(id: string): CostProvider {
  const p = _providers.get(id);
  if (!p) throw new Error(`Unknown cost provider: ${id}`);
  return p;
}

export async function getActiveProvider(): Promise<CostProvider> {
  const http = _providers.get('craftsman_http')!;
  if (await http.isAvailable()) return http;
  return _providers.get('craftsman_local')!;
}

export function listProviders(): { id: string; name: string; version: string }[] {
  return [..._providers.values()].map((p) => ({ id: p.id, name: p.name, version: p.version }));
}

export { CraftsmanLocalProvider, CraftsmanHttpProvider };
