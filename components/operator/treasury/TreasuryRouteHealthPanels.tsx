import { useEffect, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { parseAbi, type Address } from 'viem';
import { ARBITRUM_ONE_CHAIN_ID, TREASURY_VAULT_REGISTRY } from '../../../lib/axiom/treasuryVaultRegistry';
import {
  CAMELOT_LEGACY_STRATEGY,
  CAMELOT_USDC_AXUSD_V3_STRATEGY,
  CAMELOT_V2_COMPACT_ADDRESS,
  classifyCamelotRoute,
} from '../../../lib/axiom/camelotStrategyRoutes';

const MARKET_HEALTH_MATRIX = [
  { market: 'Aave V3 USDC', status: 'LIVE_SUCCESS', detail: 'Active allocation route' },
  { market: 'Euler WETH', status: 'LIVE_SUCCESS', detail: 'Active allocation route' },
  { market: 'Camelot USDC/AXUSD', status: 'LIVE_SUCCESS via v3 strategy', detail: 'Canonical route: Camelot v3' },
  { market: 'Euler USDC Theo', status: 'EXTERNAL_GOVERNOR_REQUIRED', detail: 'Downstream governor action required' },
  { market: 'Euler thBILL Theo', status: 'INVENTORY_BLOCKED', detail: 'Idle thBILL inventory required before allocation' },
] as const;

const CAMELOT_PREFLIGHT_ABI = parseAbi([
  'function tokenId() view returns (uint256)',
  'function positionManager() view returns (address)',
]);

type CamelotStatus =
  | 'READY'
  | 'POSITION_MANAGER_NO_BYTECODE'
  | 'INVALID_TICK_SPACING'
  | 'POSITION_ALREADY_OPEN_WITHDRAW_FIRST';

export function TreasuryRouteHealthPanels() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: ARBITRUM_ONE_CHAIN_ID });
  const [camelotStatus, setCamelotStatus] = useState<CamelotStatus>('READY');
  const [camelotTokenId, setCamelotTokenId] = useState<bigint | null>(null);
  const [camelotPositionManager, setCamelotPositionManager] = useState<Address | null>(null);

  const camelotAddress = TREASURY_VAULT_REGISTRY.strategies.camelotUsdcAxusd.address;
  const configuredCamelotRaw = process.env.NEXT_PUBLIC_AXIOM_CAMELOT_STRATEGY_ADDRESS;
  const configuredCamelotRoute = classifyCamelotRoute(configuredCamelotRaw);
  const configuredCamelotDisplay = configuredCamelotRoute.resolvedAddress
    ?? configuredCamelotRaw
    ?? '(unset - defaults to canonical v3)';
  const isWrongChain = isConnected && chainId !== ARBITRUM_ONE_CHAIN_ID;

  useEffect(() => {
    if (!publicClient || !isConnected || isWrongChain) return;

    if (configuredCamelotRoute.deprecationCode === 'POSITION_MANAGER_NO_BYTECODE') {
      setCamelotStatus('POSITION_MANAGER_NO_BYTECODE');
      setCamelotTokenId(null);
      setCamelotPositionManager(CAMELOT_LEGACY_STRATEGY);
      return;
    }
    if (configuredCamelotRoute.deprecationCode === 'INVALID_TICK_SPACING') {
      setCamelotStatus('INVALID_TICK_SPACING');
      setCamelotTokenId(null);
      setCamelotPositionManager(null);
      return;
    }

    Promise.all([
      publicClient.readContract({ address: camelotAddress, abi: CAMELOT_PREFLIGHT_ABI, functionName: 'tokenId' }) as Promise<bigint>,
      publicClient.readContract({ address: camelotAddress, abi: CAMELOT_PREFLIGHT_ABI, functionName: 'positionManager' }) as Promise<Address>,
    ]).then(async ([tokenId, positionManager]) => {
      setCamelotTokenId(tokenId);
      setCamelotPositionManager(positionManager);
      const bytecode = await publicClient.getBytecode({ address: positionManager });
      if (!bytecode || bytecode === '0x') {
        setCamelotStatus('POSITION_MANAGER_NO_BYTECODE');
        return;
      }
      if (tokenId > 0n) {
        setCamelotStatus('POSITION_ALREADY_OPEN_WITHDRAW_FIRST');
        return;
      }
      setCamelotStatus('READY');
    }).catch(() => setCamelotStatus('POSITION_MANAGER_NO_BYTECODE'));
  }, [publicClient, isConnected, isWrongChain, camelotAddress, configuredCamelotRoute.deprecationCode]);

  return (
    <>
      <section>
        <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Final Market Health Matrix</h2>
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-dl-border text-dl-gray uppercase">
              <th className="text-left py-2 pr-3">Market</th>
              <th className="text-left py-2 pr-3">Status</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {MARKET_HEALTH_MATRIX.map((row) => (
              <tr key={row.market} className="border-b border-dl-border">
                <td className="py-2 pr-3 text-dl-navy">{row.market}</td>
                <td className="py-2 pr-3">{row.status}</td>
                <td className="py-2 text-dl-gray">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-1">Camelot Route Diagnostics</h2>
        <div className="space-y-3">
          <div className="border border-dl-border p-3 text-xs font-mono text-dl-gray space-y-1">
            <p>Configured Camelot route (raw): {configuredCamelotDisplay}</p>
            <p>Resolved active Camelot route: {camelotAddress}</p>
            <p>Canonical Camelot v3 route: {CAMELOT_USDC_AXUSD_V3_STRATEGY}</p>
            <p>Camelot tokenId: {camelotTokenId !== null ? camelotTokenId.toString() : 'unknown'}</p>
            <p>Camelot positionManager: {camelotPositionManager ?? 'unknown'}</p>
          </div>

          <div className="border border-amber-300 bg-amber-50 p-3 text-xs font-mono text-amber-800">
            Camelot v3 is single-position. Repeated allocations require withdraw/recall before reallocation.
          </div>

          {camelotStatus === 'READY' ? (
            <div className="border border-green-300 bg-green-50 p-3 text-xs font-mono text-green-700">
              READY - route passes preflight checks.
            </div>
          ) : (
            <div className="border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700 whitespace-pre-wrap">
              {camelotStatus}
              {camelotStatus === 'POSITION_ALREADY_OPEN_WITHDRAW_FIRST' && '\nDo not send allocation transaction while tokenId is open.'}
            </div>
          )}

          <div className="border border-dl-border bg-gray-50 p-3 text-xs font-mono text-dl-gray space-y-1">
            <p>Old Camelot (deprecated): {CAMELOT_LEGACY_STRATEGY} - invalid Position Manager route.</p>
            <p>Camelot v2 (deprecated): {CAMELOT_V2_COMPACT_ADDRESS} - invalid tick-spacing route.</p>
            <p>Residual balances: inspect old/v2 routes and use verified recall/sync flows. Do not run unsafe rescue transactions.</p>
          </div>
        </div>
      </section>
    </>
  );
}
