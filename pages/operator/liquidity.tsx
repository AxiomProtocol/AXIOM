import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import {
  evaluateAxauPublicAmmReadiness,
  getLiquidityDeploymentScaffolding,
  getLiquidityMonitoringScaffold,
  getLiquidityPolicy,
  listLiquidityAssets,
  listLiquidityPools,
  listLiquidityVenues,
  type AxauCompatibilityDecision,
  type LiquidityAsset,
  type LiquidityDeploymentInput,
  type LiquidityMetricDefinition,
  type LiquidityPoolDefinition,
  type LiquidityTreasuryPolicy,
  type LiquidityVenue,
} from '../../lib/liquidity';

interface PageProps {
  assets: LiquidityAsset[];
  venues: LiquidityVenue[];
  pools: LiquidityPoolDefinition[];
  policy: LiquidityTreasuryPolicy;
  axauDecision: AxauCompatibilityDecision;
  deploymentInputs: LiquidityDeploymentInput[];
  monitoring: LiquidityMetricDefinition[];
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  return {
    props: {
      assets: listLiquidityAssets(),
      venues: listLiquidityVenues(),
      pools: listLiquidityPools(),
      policy: getLiquidityPolicy(),
      axauDecision: evaluateAxauPublicAmmReadiness(),
      deploymentInputs: getLiquidityDeploymentScaffolding(),
      monitoring: getLiquidityMonitoringScaffold(),
    },
  };
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'planned' || status === 'approved_primary' || status === 'approved_secondary'
    ? 'border-green-700 text-green-800 bg-green-50'
    : status === 'blocked' || status === 'no_go'
      ? 'border-red-700 text-red-800 bg-red-50'
      : status === 'evaluation' || status === 'evaluation_only'
        ? 'border-yellow-700 text-yellow-900 bg-yellow-50'
        : 'border-dl-border text-dl-muted bg-dl-bg-alt';

  return (
    <span className={`text-[10px] uppercase tracking-widest font-mono border px-1.5 py-0.5 ${tone}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 border-b border-dl-border last:border-0">
      <span className="text-xs text-dl-muted">{label}</span>
      <span className="font-mono text-xs text-right break-all">{value}</span>
    </div>
  );
}

function AssetCard({ asset }: { asset: LiquidityAsset }) {
  return (
    <section className="border border-dl-border p-4 bg-dl-bg">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-serif text-lg">{asset.symbol}</h3>
          <p className="text-xs text-dl-muted">{asset.name}</p>
        </div>
        <StatusBadge status={asset.publicAmmTradingPermitted ? 'amm_allowed' : 'amm_blocked'} />
      </div>
      <DataRow label="Role" value={asset.role.replaceAll('_', ' ')} />
      <DataRow label="Preferred quote" value={asset.preferredQuoteAsset ?? 'external'} />
      <DataRow label="Restricted transfer" value={asset.restrictedTransferLogicExists ? 'yes' : 'no'} />
      <DataRow label="Wrapper required" value={asset.wrapperRequired ? 'yes' : 'no'} />
      <DataRow label="Launch priority" value={asset.launchPriority} />
      <p className="text-xs text-dl-muted mt-3">{asset.rationale}</p>
    </section>
  );
}

function PoolRow({ pool }: { pool: LiquidityPoolDefinition }) {
  return (
    <tr className="border-t border-dl-border align-top">
      <td className="py-3 pr-3 font-mono text-xs">{pool.launchPhase.replaceAll('_', ' ')}</td>
      <td className="py-3 pr-3">
        <div className="font-serif">{pool.baseAsset}/{pool.quoteAsset}</div>
        <div className="font-mono text-[10px] text-dl-muted">{pool.id}</div>
      </td>
      <td className="py-3 pr-3 font-mono text-xs">{pool.venue}</td>
      <td className="py-3 pr-3"><StatusBadge status={pool.status} /></td>
      <td className="py-3 pr-3 font-mono text-xs">{pool.treasuryPriority}</td>
      <td className="py-3 pr-3 font-mono text-xs">{pool.targetDepthPriority.replaceAll('_', ' ')}</td>
      <td className="py-3 pr-3 text-xs text-dl-muted">{pool.internalNotes}</td>
    </tr>
  );
}

export default function LiquidityOperatorPage({
  assets,
  venues,
  pools,
  policy,
  axauDecision,
  deploymentInputs,
  monitoring,
}: PageProps) {
  const phaseOnePools = pools.filter((pool) => pool.launchPhase === 'phase_1');
  const blockedPools = pools.filter((pool) => pool.status === 'blocked');

  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-serif mb-1">Liquidity Strategy Registry</h1>
            <p className="text-xs font-mono text-dl-muted">
              Arbitrum One - canonical pool sequencing, treasury policy, AXAU gate, and deployment scaffolding.
            </p>
          </div>
          <Link href="/operator" className="text-xs underline text-dl-muted">Back to console</Link>
        </div>

        <section className="border-2 border-dl-gold bg-dl-bg-alt p-4 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="font-serif text-xl">Launch posture</h2>
              <p className="text-sm text-dl-muted">
                One asset, one core pair, one primary venue first. AXUSD/USDC is the deepest launch pool.
              </p>
            </div>
            <StatusBadge status={axauDecision.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="border border-dl-border bg-dl-bg p-3">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Deepest launch pool</div>
              <div className="font-mono mt-1">{policy.deepestPoolAtLaunch}</div>
            </div>
            <div className="border border-dl-border bg-dl-bg p-3">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Controlled smaller pool</div>
              <div className="font-mono mt-1">{policy.controlledSmallerPoolAtLaunch}</div>
            </div>
            <div className="border border-dl-border bg-dl-bg p-3">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Fragmentation control</div>
              <div className="font-mono mt-1">{policy.fragmentationAvoidance}</div>
            </div>
          </div>
        </section>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Phase 1 pools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {phaseOnePools.map((pool) => (
              <div key={pool.id} className="border border-dl-border p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-serif">{pool.baseAsset}/{pool.quoteAsset}</h3>
                  <StatusBadge status={pool.status} />
                </div>
                <DataRow label="Venue" value={pool.venue} />
                <DataRow label="Fee" value={pool.fee.valueBps === null ? pool.fee.status : `${pool.fee.valueBps} bps`} />
                <DataRow label="Treasury priority" value={pool.treasuryPriority} />
                <DataRow label="Depth" value={pool.targetDepthPriority.replaceAll('_', ' ')} />
                <p className="text-xs text-dl-muted mt-3">{pool.internalNotes}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Configured assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {assets.map((asset) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        </section>

        <section className="border border-dl-border p-4 mb-6 overflow-x-auto">
          <h2 className="font-serif text-lg mb-3">Pool registry</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-wide text-dl-muted">
                <th className="pb-2 pr-3">Phase</th>
                <th className="pb-2 pr-3">Pair</th>
                <th className="pb-2 pr-3">Venue</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Treasury</th>
                <th className="pb-2 pr-3">Depth</th>
                <th className="pb-2 pr-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <PoolRow key={pool.id} pool={pool} />
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="border border-red-700 bg-red-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-serif text-lg text-red-900">AXAU compatibility gate</h2>
              <StatusBadge status={axauDecision.status} />
            </div>
            <p className="text-xs font-mono text-red-900 mb-3">
              Public AXAU AMM deployment is blocked until all gates are affirmative.
            </p>
            <ul className="space-y-1">
              {axauDecision.blockingReasons.map((reason) => (
                <li key={reason} className="text-xs font-mono text-red-900">- {reason}</li>
              ))}
            </ul>
          </section>

          <section className="border border-dl-border p-4">
            <h2 className="font-serif text-lg mb-3">Venue registry</h2>
            <div className="space-y-3">
              {venues.map((venue) => (
                <div key={venue.id} className="border border-dl-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif">{venue.name}</span>
                    <StatusBadge status={venue.status} />
                  </div>
                  <DataRow label="First wave" value={venue.firstWavePermitted ? 'yes' : 'no'} />
                  <p className="text-xs text-dl-muted mt-2">{venue.notes}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Policy rules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wide mb-2">Allocation</h3>
              <ul className="space-y-1">
                {policy.allocationRules.map((rule) => <li key={rule} className="text-xs text-dl-muted">- {rule}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wide mb-2">Expansion</h3>
              <ul className="space-y-1">
                {policy.expansionRules.map((rule) => <li key={rule} className="text-xs text-dl-muted">- {rule}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wide mb-2">Blocked</h3>
              <ul className="space-y-1">
                {policy.blockedRules.map((rule) => <li key={rule} className="text-xs text-dl-muted">- {rule}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Deployment and monitoring scaffolding</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wide mb-2">Deployment inputs</h3>
              <ul className="space-y-2">
                {deploymentInputs.map((input) => (
                  <li key={input.poolId} className="border border-dl-border p-2">
                    <div className="font-mono text-xs">{input.poolId}</div>
                    <div className="text-[10px] text-dl-muted">
                      env: {input.environmentVariables.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wide mb-2">Monitoring hooks</h3>
              <ul className="space-y-2">
                {monitoring.map((entry) => (
                  <li key={entry.poolId} className="border border-dl-border p-2">
                    <div className="font-mono text-xs">{entry.poolId}</div>
                    <div className="text-[10px] text-dl-muted">
                      metrics: {entry.metrics.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {blockedPools.length > 0 && (
          <section className="border border-red-700 bg-red-50 p-4">
            <h2 className="font-serif text-lg text-red-900 mb-2">Blocked pools</h2>
            {blockedPools.map((pool) => (
              <div key={pool.id} className="font-mono text-xs text-red-900">
                {pool.id}: {pool.internalNotes}
              </div>
            ))}
          </section>
        )}
      </div>
    </OperatorConsoleLayout>
  );
}
