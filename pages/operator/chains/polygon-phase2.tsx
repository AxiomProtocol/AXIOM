import React, { useEffect, useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import type { PolygonHealthReport } from '../../../lib/polygon/chainHealth';
import type { PolygonStatusResponse } from '../../api/polygon/status';

export default function PolygonPhase2Page() {
  const [health, setHealth]   = useState<PolygonHealthReport | null>(null);
  const [status, setStatus]   = useState<PolygonStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [hRes, sRes] = await Promise.all([
          fetch('/api/polygon/chain-health'),
          fetch('/api/polygon/status'),
        ]);
        const [hData, sData] = await Promise.all([hRes.json(), sRes.json()]);
        setHealth(hData as PolygonHealthReport);
        setStatus(sData as PolygonStatusResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Polygon data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const badge = (ok: boolean, labelTrue: string, labelFalse: string) => (
    <span style={{
      fontFamily: 'monospace',
      fontSize: '11px',
      padding: '2px 8px',
      background: ok ? '#0a3d1f' : '#3d0a0a',
      color: ok ? '#4ade80' : '#f87171',
      border: `1px solid ${ok ? '#166534' : '#7f1d1d'}`,
    }}>
      {ok ? labelTrue : labelFalse}
    </span>
  );

  const mono = (v: string | number | null | undefined) => (
    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
      {v ?? '—'}
    </span>
  );

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', marginBottom: '8px', letterSpacing: '0.08em' }}>
            OPERATOR / CHAINS / POLYGON
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#f8fafc', margin: '0 0 8px' }}>
            Polygon PoS — Phase 2
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
            ERC-3643 AXUSD deployment · Identity bridge · Payments settlement layer
          </p>
        </div>

        {loading && (
          <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>Loading chain data…</p>
        )}
        {error && (
          <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f87171' }}>Error: {error}</p>
        )}

        {status && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbd5e1', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' }}>
              Integration Phase
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
              <dt style={{ color: '#64748b' }}>Phase</dt>
              <dd style={{ margin: 0, color: '#e2e8f0' }}>{status.phase}</dd>
              <dt style={{ color: '#64748b' }}>Next Step</dt>
              <dd style={{ margin: 0, color: '#fbbf24' }}>{status.nextStep}</dd>
              <dt style={{ color: '#64748b' }}>Chain</dt>
              <dd style={{ margin: 0 }}>{mono(`${status.chain} (${status.chainId})`)}</dd>
              <dt style={{ color: '#64748b' }}>Feature Flag</dt>
              <dd style={{ margin: 0 }}>{badge(status.enabled, 'ENABLED', 'DISABLED')}</dd>
              <dt style={{ color: '#64748b' }}>RPC Configured</dt>
              <dd style={{ margin: 0 }}>{badge(status.rpcConfigured, 'CONFIGURED', 'NOT SET')}</dd>
              <dt style={{ color: '#64748b' }}>Mainnet Deployed</dt>
              <dd style={{ margin: 0 }}>{badge(status.mainnetDeployed, 'DEPLOYED', 'PENDING')}</dd>
              <dt style={{ color: '#64748b' }}>Amoy Testnet Deployed</dt>
              <dd style={{ margin: 0 }}>{badge(status.testnetDeployed, 'DEPLOYED', 'PENDING')}</dd>
              <dt style={{ color: '#64748b' }}>AXUSD Address</dt>
              <dd style={{ margin: 0 }}>{mono(status.axusdAddress ?? 'Not yet deployed')}</dd>
              <dt style={{ color: '#64748b' }}>Identity Bridge Mode</dt>
              <dd style={{ margin: 0 }}>{mono(status.identityBridgeMode)}</dd>
            </dl>
          </section>
        )}

        {health && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbd5e1', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' }}>
              Chain Health
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
              <dt style={{ color: '#64748b' }}>RPC URL</dt>
              <dd style={{ margin: 0 }}>{mono(health.rpcUrl ?? 'not configured')}</dd>
              <dt style={{ color: '#64748b' }}>RPC Reachable</dt>
              <dd style={{ margin: 0 }}>{badge(health.rpcReachable, 'REACHABLE', 'UNREACHABLE')}</dd>
              <dt style={{ color: '#64748b' }}>Block Number</dt>
              <dd style={{ margin: 0 }}>{mono(health.blockNumber?.toLocaleString() ?? null)}</dd>
              <dt style={{ color: '#64748b' }}>Block Age</dt>
              <dd style={{ margin: 0 }}>{mono(health.blockAgeSeconds != null ? `${health.blockAgeSeconds}s ago` : null)}</dd>
              <dt style={{ color: '#64748b' }}>Chain ID</dt>
              <dd style={{ margin: 0 }}>{mono(health.chainId)}</dd>
              <dt style={{ color: '#64748b' }}>Identity Bridge Ready</dt>
              <dd style={{ margin: 0 }}>{badge(health.identityBridgeReady, 'READY', 'NOT READY')}</dd>
              <dt style={{ color: '#64748b' }}>Checked At</dt>
              <dd style={{ margin: 0 }}>{mono(health.checkedAt)}</dd>
            </dl>
            {health.errors.length > 0 && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#1c0a0a', border: '1px solid #7f1d1d' }}>
                {health.errors.map((e, i) => (
                  <p key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#f87171', margin: '2px 0' }}>⚠ {e}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {health && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbd5e1', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' }}>
              Contract Deployment Status
            </h2>

            {[
              { label: 'Polygon Mainnet (chainId 137)', data: health.mainnetContracts, explorer: 'https://polygonscan.com' },
              { label: 'Polygon Amoy Testnet (chainId 80002)', data: health.amoyContracts, explorer: 'https://amoy.polygonscan.com' },
            ].map(({ label, data, explorer }) => (
              <div key={label} style={{ marginBottom: '24px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  {label} — {badge(data.deployed, 'ALL DEPLOYED', 'PENDING')}
                </p>
                {data.missingContracts.length > 0 ? (
                  <div style={{ padding: '8px 12px', background: '#1c150a', border: '1px solid #78350f' }}>
                    <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fbbf24', margin: '0 0 4px' }}>Missing contracts:</p>
                    {data.missingContracts.map(c => (
                      <p key={c} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fbbf24', margin: '1px 0' }}>  · {c}</p>
                    ))}
                  </div>
                ) : (
                  <dl style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '6px 12px', fontFamily: 'monospace', fontSize: '11px' }}>
                    <dt style={{ color: '#64748b' }}>AXUSD Token</dt>
                    <dd style={{ margin: 0 }}>
                      <a href={`${explorer}/address/${data.tokenAddress}`} target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}>
                        {data.tokenAddress}
                      </a>
                    </dd>
                    <dt style={{ color: '#64748b' }}>Identity Registry</dt>
                    <dd style={{ margin: 0 }}>
                      <a href={`${explorer}/address/${data.identityRegistryAddress}`} target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}>
                        {data.identityRegistryAddress}
                      </a>
                    </dd>
                  </dl>
                )}
              </div>
            ))}
          </section>
        )}

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbd5e1', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' }}>
            Deploy Runbook
          </h2>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', lineHeight: '1.8' }}>
            <p style={{ color: '#64748b', marginBottom: '8px' }}>Step 1 — Fund Amoy wallet via faucet:</p>
            <p style={{ color: '#e2e8f0', paddingLeft: '16px' }}>https://faucet.polygon.technology</p>

            <p style={{ color: '#64748b', margin: '12px 0 8px' }}>Step 2 — Deploy to Amoy testnet:</p>
            <pre style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '10px 14px', color: '#4ade80', margin: 0, overflowX: 'auto' }}>
{`export MULTICHAIN_ENABLED=true
export CHAIN_POLYGON_ENABLED=true
POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy`}
            </pre>

            <p style={{ color: '#64748b', margin: '12px 0 8px' }}>Step 3 — Verify on Amoy Polygonscan:</p>
            <p style={{ color: '#e2e8f0', paddingLeft: '16px' }}>https://amoy.polygonscan.com</p>

            <p style={{ color: '#64748b', margin: '12px 0 8px' }}>Step 4 — Deploy to Polygon mainnet:</p>
            <pre style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '10px 14px', color: '#4ade80', margin: 0, overflowX: 'auto' }}>
{`POLYGON_MAINNET_REAL_DEPLOY=true npm run deploy:polygon:mainnet`}
            </pre>

            <p style={{ color: '#64748b', margin: '12px 0 8px' }}>Step 5 — Post-deploy:</p>
            <p style={{ color: '#e2e8f0', paddingLeft: '16px' }}>Transfer admin roles to multisig</p>
            <p style={{ color: '#e2e8f0', paddingLeft: '16px' }}>Verify all 8 contracts on Polygonscan</p>
            <p style={{ color: '#e2e8f0', paddingLeft: '16px' }}>Update cap_assets DB with mainnet AXUSD address</p>
          </div>
        </section>

        <section>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbd5e1', borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' }}>
            API Endpoints
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 'normal' }}>Method</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 'normal' }}>Endpoint</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 'normal' }}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['GET',  '/api/polygon/status',              'Integration phase and flag status'],
                ['GET',  '/api/polygon/chain-health',        'RPC health and block freshness'],
                ['GET',  '/api/polygon/contracts',           'Deployed contract addresses'],
                ['GET',  '/api/polygon/identity/[wallet]',   'Credential bridge state for wallet'],
                ['POST', '/api/polygon/identity/bridge',     'Bridge Arbitrum credential to Polygon'],
                ['POST', '/api/polygon/proofs/verify',       'Off-chain Merkle proof verification'],
              ].map(([method, endpoint, desc]) => (
                <tr key={endpoint} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '6px 8px', color: method === 'POST' ? '#fbbf24' : '#60a5fa' }}>{method}</td>
                  <td style={{ padding: '6px 8px', color: '#e2e8f0' }}>{endpoint}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      </div>
    </DesignLawLayout>
  );
}
