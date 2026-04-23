import { useEffect, useState } from 'react';
import { CollateralClassBadge, type CollateralClass } from '../design-law/CollateralClassBadge';

interface CapInfraAsset {
  id: string;
  symbol: string;
  displayName: string;
  collateralClass?: CollateralClass | null;
  collateralClassificationRationale?: string | null;
  basePolicyJson?: Record<string, unknown> | null;
  updatedAt?: string | null;
}

function formatPerTxMax(asset: CapInfraAsset): string | null {
  const raw = asset.basePolicyJson?.perTransactionMax;
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === 'string' ? Number(raw) : (raw as number);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US');
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').replace(/\..+$/, ' UTC');
  } catch {
    return iso;
  }
}

interface Props {
  // Filter to a specific symbol to render a single-asset panel (e.g. on the
  // AXAU public page). Omit to render all classified assets (disclosure page).
  symbol?: string;
  // Filter to a specific asset id (used by operator surfaces that already
  // hold the id, not the symbol). Mutually exclusive with `symbol`.
  assetId?: string;
  // Render compact mode (single asset, smaller margins) for asset pages.
  compact?: boolean;
}

export function CollateralClassificationPanel({ symbol, assetId, compact = false }: Props) {
  const [assets, setAssets] = useState<CapInfraAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/capinfra/assets')
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Asset registry lookup failed: HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const items: CapInfraAsset[] = Array.isArray(d?.items) ? d.items : [];
        setAssets(items);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'Lookup failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className={compact ? '' : 'border border-dl-border p-4'}>
        <p className="text-xs font-dl-mono text-dl-gray">
          Collateral classification unavailable.
        </p>
      </div>
    );
  }

  if (assets === null) {
    return (
      <div className={compact ? '' : 'border border-dl-border p-4'}>
        <p className="text-xs font-dl-mono text-dl-gray">Loading classification…</p>
      </div>
    );
  }

  const filtered = assetId
    ? assets.filter((a) => a.id === assetId)
    : symbol
      ? assets.filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase())
      : assets.filter((a) => !!a.collateralClass);

  if (filtered.length === 0) {
    const filterLabel = symbol ?? assetId;
    return (
      <div className={compact ? '' : 'border border-dl-border p-4'}>
        <p className="text-xs font-dl-mono text-dl-gray">
          No classification on file{filterLabel ? ` for ${filterLabel}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'border border-dl-border' : 'border border-dl-border'}>
      {filtered.map((a, i) => {
        const raw = a.collateralClass;
        const klass: CollateralClass =
          raw === 'GREEN' || raw === 'YELLOW' || raw === 'RED' ? raw : 'RED';
        const perTx = klass === 'YELLOW' ? formatPerTxMax(a) : null;
        return (
          <div
            key={a.id}
            className={`px-4 py-3 ${i < filtered.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}
          >
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <CollateralClassBadge value={klass} size="md" />
              <span className="font-dl-serif text-dl-navy text-base font-semibold">
                {a.symbol}
              </span>
              <span className="text-xs text-dl-gray">{a.displayName}</span>
            </div>
            {a.collateralClassificationRationale && (
              <p className="text-sm text-dl-navy leading-relaxed mb-2">
                {a.collateralClassificationRationale}
              </p>
            )}
            {klass === 'YELLOW' && (
              <p className="text-xs font-dl-mono text-dl-navy mb-1">
                Per-transaction cap:{' '}
                {perTx !== null ? `${perTx} units` : 'pending policy publication'}
              </p>
            )}
            <p className="text-xs font-dl-mono text-dl-gray">
              Last classification update: {formatTimestamp(a.updatedAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
