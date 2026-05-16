/**
 * EulerVaultCard — WITHDRAWN STATE
 * Euler EVK/Earn vaults withdrawn 2026-05-13. All balances confirmed zero.
 * Static notice rendered for all variants — no fetch, no interval.
 */

/** Guard: this card is permanently deactivated. Do not re-enable. */
export const isActive = false;

interface EulerVaultCardProps {
  variant?: 'full' | 'compact' | 'widget';
  showCollateral?: boolean;
  className?: string;
}

export default function EulerVaultCard({
  variant = 'full',
  className = '',
}: EulerVaultCardProps) {
  if (!isActive) {
    const baseStyle =
      variant === 'widget'
        ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700 opacity-60'
        : variant === 'compact'
        ? 'bg-gray-50 rounded-xl p-5 border border-gray-200 opacity-60'
        : 'bg-gray-50 rounded-2xl p-6 border border-gray-200 opacity-60';

    return (
      <div className={`${baseStyle} ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 font-bold">E</span>
          </div>
          <div>
            <h3 className={variant === 'full' ? 'text-gray-500 text-lg font-bold line-through' : 'text-gray-500 font-semibold line-through'}>
              AXUSD Lending Vault
            </h3>
            <p className="text-gray-400 text-sm">Euler Finance — Withdrawn</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-xs font-medium border border-gray-200">
            Withdrawn
          </span>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Euler EVK Open Market Vault (eAXUSD-6) and Euler Earn vault positions
          were withdrawn on 2026-05-13. All balances are confirmed zero. Liquidity
          has migrated to Axiom-native on-chain financial rails.
        </p>
        {variant === 'full' && (
          <p className="text-gray-400 text-xs mt-3 font-mono">
            eAXUSD-6: 0xacdA87801f6409bB5157BA78aF1BD9631d6609B2
          </p>
        )}
      </div>
    );
  }
  return null;
}
