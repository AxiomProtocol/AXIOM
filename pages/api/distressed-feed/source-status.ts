import type { NextApiRequest, NextApiResponse } from 'next';

export type SourceAccessStatus =
  | 'active'
  | 'api_key_required'
  | 'service_offline'
  | 'api_blocked'
  | 'no_public_api'
  | 'js_rendered';

export interface SourceStatusEntry {
  source: string;
  name: string;
  accessStatus: SourceAccessStatus;
  reason: string;
  note?: string;
  inventoryHint?: string;
  lastChecked: string;
}

async function checkHud(): Promise<SourceStatusEntry> {
  try {
    const res = await fetch('https://www.hudhomestore.gov/searchresult?sState=GA', {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const location = res.headers.get('location') || '';
    if (location.includes('/app_offline') || location.includes('app_offline')) {
      return {
        source: 'hud',
        name: 'HUD HomeStore',
        accessStatus: 'service_offline',
        reason: 'HUD HomeStore is currently offline for maintenance. The site redirects to /app_offline.',
        note: 'Monitor hudhomestore.gov for restoration. The adapter will resume automatically once the site is back online.',
        lastChecked: new Date().toISOString(),
      };
    }
    if (res.status === 200) {
      return {
        source: 'hud',
        name: 'HUD HomeStore',
        accessStatus: 'active',
        reason: 'Site is reachable.',
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      source: 'hud',
      name: 'HUD HomeStore',
      accessStatus: 'service_offline',
      reason: `Unexpected response: HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'hud',
      name: 'HUD HomeStore',
      accessStatus: 'service_offline',
      reason: `Connection failed: ${msg}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkFannie(): Promise<SourceStatusEntry> {
  try {
    const res = await fetch('https://homepath.fanniemae.com/cfl/property-inventory', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ state: 'GA', pageSize: 1, page: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return {
        source: 'fannie_mae',
        name: 'Fannie Mae HomePath',
        accessStatus: 'api_blocked',
        reason: 'HomePath is a Cloudflare-protected SPA. The API returns an HTML challenge page instead of JSON.',
        note: 'Fannie Mae REO properties are accessible through ATTOM\'s dataset. Configure ATTOM_API_KEY to source these listings.',
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      source: 'fannie_mae',
      name: 'Fannie Mae HomePath',
      accessStatus: 'active',
      reason: 'API returned JSON.',
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'fannie_mae',
      name: 'Fannie Mae HomePath',
      accessStatus: 'api_blocked',
      reason: `API unreachable: ${msg}`,
      note: 'Fannie Mae REO properties are accessible through ATTOM\'s dataset.',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkFreddie(): Promise<SourceStatusEntry> {
  try {
    const res = await fetch('https://www.homesteps.com/api/properties/search', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ state: 'GA', pageSize: 1, page: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) {
      return {
        source: 'freddie_mac',
        name: 'Freddie Mac HomeSteps',
        accessStatus: 'no_public_api',
        reason: 'HomeSteps has no public search API. REO properties are listed exclusively through approved real estate agents on MLS.',
        note: 'Freddie Mac REO properties are accessible through ATTOM\'s dataset. Configure ATTOM_API_KEY to source these listings.',
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      source: 'freddie_mac',
      name: 'Freddie Mac HomeSteps',
      accessStatus: 'no_public_api',
      reason: `API returned HTTP ${res.status}. No public API is documented.`,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'freddie_mac',
      name: 'Freddie Mac HomeSteps',
      accessStatus: 'no_public_api',
      reason: `API unreachable: ${msg}`,
      note: 'Freddie Mac REO properties are accessible through ATTOM\'s dataset.',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkUsda(): Promise<SourceStatusEntry> {
  const targetStates = [
    { label: 'GA', fips: '13' },
    { label: 'NC', fips: '37' },
    { label: 'AL', fips: '01' },
    { label: 'TN', fips: '47' },
    { label: 'SC', fips: '45' },
    { label: 'FL', fips: '12' },
    { label: 'MS', fips: '28' },
  ];

  const inventoryParts: string[] = [];
  let totalProperties = 0;

  for (const st of targetStates) {
    try {
      const res = await fetch(
        `https://properties.sc.egov.usda.gov/resales/public/getCountiesOfStateWithActiveProperties?stateCode=${st.fips}&searchFormName=SFH`,
        {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const counties = await res.json() as Array<{ countyCode: string; countyName: string }>;
        if (Array.isArray(counties) && counties.length > 0) {
          const stateCount = counties.reduce((sum, c) => {
            const m = c.countyName.match(/\((\d+)\)/);
            return sum + (m ? parseInt(m[1], 10) : 0);
          }, 0);
          if (stateCount > 0) {
            inventoryParts.push(`${st.label}: ${stateCount}`);
            totalProperties += stateCount;
          }
        }
      }
    } catch {
    }
  }

  const inventoryHint = inventoryParts.length > 0
    ? `Live inventory: ${inventoryParts.join(', ')} (${totalProperties} total across monitored states)`
    : 'No active SFH inventory detected in monitored states';

  return {
    source: 'usda',
    name: 'USDA Rural Development',
    accessStatus: 'js_rendered',
    reason: 'The USDA property search renders results via jQuery DataTables client-side rendering. Property data is not present in the server HTML response — a JavaScript engine is required to retrieve listings.',
    note: 'County-level inventory counts are accessible via the public API. Individual property details require JavaScript execution.',
    inventoryHint,
    lastChecked: new Date().toISOString(),
  };
}

async function checkAttom(): Promise<SourceStatusEntry> {
  const apiKey = process.env.ATTOM_API_KEY || process.env.ATTOM_API_KET;
  if (!apiKey) {
    return {
      source: 'attom',
      name: 'ATTOM Pre-Foreclosure',
      accessStatus: 'api_key_required',
      reason: 'ATTOM_API_KEY environment variable is not configured.',
      note: 'The ATTOM adapter is fully built and covers NOD, Lis Pendens, and Notice of Trustee Sale filings with a 90-day lookback. It also covers REO properties including Fannie Mae, Freddie Mac, and HUD inventory. Add ATTOM_API_KEY to activate this source.',
      lastChecked: new Date().toISOString(),
    };
  }
  return {
    source: 'attom',
    name: 'ATTOM Pre-Foreclosure',
    accessStatus: 'active',
    reason: 'API key is configured. Run ingestion to fetch pre-foreclosure filings.',
    lastChecked: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [hud, fannie, freddie, usda, attom] = await Promise.all([
      checkHud(),
      checkFannie(),
      checkFreddie(),
      checkUsda(),
      checkAttom(),
    ]);

    return res.json({
      sources: [hud, fannie, freddie, usda, attom],
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Status check failed', detail: message });
  }
}
