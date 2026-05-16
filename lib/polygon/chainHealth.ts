/**
 * Axiom Protocol — Polygon Chain Health Service
 *
 * Checks connectivity, block freshness, and RPC availability for Polygon PoS.
 * Used by /api/polygon/chain-health and operator dashboards.
 */

import { getPolygonRpcUrl } from '../chains/providers';
import { isChainEnabled } from '../chains/capabilities';
import { POLYGON_CONTRACTS, AMOY_CONTRACTS } from '../../shared/contracts-polygon';

export interface PolygonHealthReport {
  enabled:             boolean;
  rpcUrl:              string | null;
  rpcReachable:        boolean;
  blockNumber:         number | null;
  blockAgeSeconds:     number | null;
  chainId:             number | null;
  mainnetContracts:    ContractDeployStatus;
  amoyContracts:       ContractDeployStatus;
  identityBridgeReady: boolean;
  checkedAt:           string;
  errors:              string[];
}

export interface ContractDeployStatus {
  deployed: boolean;
  tokenAddress: string;
  identityRegistryAddress: string;
  missingContracts: string[];
}

function checkContractStatus(
  contracts: typeof POLYGON_CONTRACTS,
): ContractDeployStatus {
  const missingContracts: string[] = [];
  const entries = Object.entries(contracts) as [string, string][];
  for (const [key, addr] of entries) {
    if (!addr || addr === '') missingContracts.push(key);
  }
  return {
    deployed:                missingContracts.length === 0,
    tokenAddress:            contracts.AxiomStable3643,
    identityRegistryAddress: contracts.IdentityRegistry,
    missingContracts,
  };
}

export async function getPolygonChainHealth(): Promise<PolygonHealthReport> {
  const errors: string[] = [];
  const enabled = isChainEnabled('polygon');
  const rpcUrl  = getPolygonRpcUrl();

  let rpcReachable    = false;
  let blockNumber:    number | null = null;
  let blockAgeSeconds: number | null = null;
  let chainId:        number | null = null;

  if (enabled && rpcUrl) {
    try {
      const response = await fetch(rpcUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json() as { result?: string };
        if (data.result) {
          blockNumber = parseInt(data.result, 16);
          rpcReachable = true;

          const blockResp = await fetch(rpcUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: [data.result, false],
              id: 2,
            }),
            signal: AbortSignal.timeout(8000),
          });
          const blockData = await blockResp.json() as { result?: { timestamp: string; } };
          if (blockData.result?.timestamp) {
            const blockTs = parseInt(blockData.result.timestamp, 16);
            blockAgeSeconds = Math.floor(Date.now() / 1000) - blockTs;
          }

          const chainResp = await fetch(rpcUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 3 }),
            signal: AbortSignal.timeout(8000),
          });
          const chainData = await chainResp.json() as { result?: string };
          if (chainData.result) chainId = parseInt(chainData.result, 16);
        }
      }
    } catch (err) {
      errors.push(`RPC unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (!enabled) {
    errors.push('CHAIN_POLYGON_ENABLED is not set to true.');
  } else {
    errors.push('No Polygon RPC URL configured. Set POLYGON_RPC_URL or ALCHEMY_API_KEY.');
  }

  const mainnetContracts = checkContractStatus(POLYGON_CONTRACTS);
  const amoyContracts    = checkContractStatus(AMOY_CONTRACTS);

  return {
    enabled,
    rpcUrl,
    rpcReachable,
    blockNumber,
    blockAgeSeconds,
    chainId,
    mainnetContracts,
    amoyContracts,
    identityBridgeReady: rpcReachable && mainnetContracts.deployed,
    checkedAt: new Date().toISOString(),
    errors,
  };
}
