import { useState } from 'react';
import { useUserLiquidity } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

// Fix 1: Canonical token addresses aligned with quote.ts, price.ts, and eulerswap-pools.ts.
// Fix 3: Removed all Camelot Router references. EulerSwap V2 liquidity is ERC-4626 vault-based —
//        deposits go through the backing EVK vaults, not a simple addLiquidity() router call.
// Fix 6: Design Law compliant — no rounded corners, shadows, teal, or gradient classes.

const SUPPORTED_PAIRS = [
  {
    id: 'usdc_axusd',
    label: 'USDC / AXUSD',
    pool: '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8',
    tokens: [
      { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', decimals: 18 },
    ],
  },
  {
    id: 'axm_axusd',
    label: 'AXM / AXUSD',
    pool: '0x981763699D269E129a08E216b1AeC7caa376A8a8',
    tokens: [
      { symbol: 'AXM',   address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', decimals: 18 },
      { symbol: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', decimals: 18 },
    ],
  },
];

const DL = {
  border:  'border border-[#1B2A4A]/20',
  surface: 'bg-[#F8F6F0]',
  label:   'text-[10px] font-mono uppercase tracking-widest text-[#1B2A4A]/50',
  value:   'text-[#1B2A4A] font-mono',
  gold:    'text-[#B8973A]',
  navy:    'text-[#1B2A4A]',
  forest:  'text-[#1D3D2A]',
};

export default function LiquidityManager() {
  const { isConnected, address } = useWallet();
  const { positions, loading: positionsLoading } = useUserLiquidity(address ?? undefined);
  const [activeTab, setActiveTab] = useState<'positions' | 'add'>('positions');

  const TABS = [
    { id: 'positions' as const, label: 'Your Positions' },
    { id: 'add'       as const, label: 'Add Liquidity' },
  ];

  return (
    <div className={`${DL.border} bg-white`}>
      <div className="flex border-b border-[#1B2A4A]/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3.5 px-6 text-xs font-mono uppercase tracking-wide transition-colors ${
              activeTab === tab.id
                ? 'text-[#1B2A4A] border-b-2 border-[#1B2A4A] bg-white'
                : 'text-[#1B2A4A]/40 hover:text-[#1B2A4A]/70 bg-[#F8F6F0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'positions' && (
          <PositionsTab
            isConnected={isConnected}
            loading={positionsLoading}
            positions={positions}
            onAddLiquidity={() => setActiveTab('add')}
          />
        )}

        {activeTab === 'add' && (
          <AddLiquidityTab isConnected={isConnected} />
        )}
      </div>
    </div>
  );
}

function PositionsTab({
  isConnected,
  loading,
  positions,
  onAddLiquidity,
}: {
  isConnected: boolean;
  loading: boolean;
  positions: any[];
  onAddLiquidity: () => void;
}) {
  if (!isConnected) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 mx-auto mb-4 border border-[#1B2A4A]/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#1B2A4A]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-xs font-mono text-[#1B2A4A]/40 uppercase tracking-wide">Connect wallet to view positions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10">
        <div className="w-4 h-4 border border-[#1B2A4A] border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-[#1B2A4A]/50">Loading positions...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-[#1B2A4A]/10 bg-[#F8F6F0] p-4 mb-5">
        <p className="text-xs font-mono text-[#1B2A4A]/60 leading-relaxed">
          EulerSwap LP positions are represented as ERC-4626 vault shares in the backing EVK vaults.
          On-chain position indexing is planned — connect your wallet to check vault balances directly on Arbiscan.
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs font-mono text-[#1B2A4A]/40 uppercase tracking-wide mb-4">No positions found</p>
          <button
            onClick={onAddLiquidity}
            className="px-5 py-2.5 bg-[#1B2A4A] text-white text-xs font-mono uppercase tracking-wide hover:bg-[#1D3D2A] transition-colors"
          >
            Add Liquidity
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((pos, i) => (
            <div key={i} className="border border-[#1B2A4A]/10 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-mono text-[#1B2A4A]">Pool #{pos.poolId}</span>
                <span className="text-sm font-mono text-[#1D3D2A] font-semibold">
                  ${parseFloat(pos.liquidity).toFixed(2)}
                </span>
              </div>
              <div className="text-xs font-mono text-[#1B2A4A]/40 mt-1">
                {pos.sharePercent?.toFixed(4)}% share — {parseFloat(pos.lpTokenBalance || '0').toFixed(8)} LP
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddLiquidityTab({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) {
    return (
      <div className="text-center py-10">
        <p className="text-xs font-mono text-[#1B2A4A]/40 uppercase tracking-wide">Connect wallet to add liquidity</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="border border-[#B8973A]/30 bg-[#B8973A]/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#B8973A] mb-2">EulerSwap Liquidity Model</div>
        <p className="text-xs font-mono text-[#1B2A4A]/70 leading-relaxed">
          EulerSwap V2 liquidity is backed by EVK (Euler Vault Kit) vaults, not a standard AMM router.
          LPs deposit into the vault, which earns both swap fees and Euler lending yield simultaneously.
        </p>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-widest text-[#1B2A4A]/50 mb-3">Live Pools</div>
      <div className="space-y-2">
        {SUPPORTED_PAIRS.map((pair) => (
          <div key={pair.id} className="border border-[#1B2A4A]/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono font-semibold text-[#1B2A4A]">{pair.label}</span>
              <span className="text-[10px] font-mono text-[#1D3D2A] border border-[#1D3D2A]/30 px-2 py-0.5">ACTIVE</span>
            </div>
            <div className="text-[10px] font-mono text-[#1B2A4A]/40 mb-3">
              {pair.pool}
            </div>
            <a
              href={`https://arbiscan.io/address/${pair.pool}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#B8973A] hover:underline"
            >
              View on Arbiscan →
            </a>
          </div>
        ))}
      </div>

      <div className="border border-[#1B2A4A]/10 bg-[#F8F6F0] p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#1B2A4A]/50 mb-2">How to Provide Liquidity</div>
        <ol className="space-y-2">
          {[
            'Obtain AXUSD (ERC-3643) via the Capital Program or Axiom Exchange',
            'Deposit into the EulerSwap backing vault to receive eAXUSD vault shares',
            'Your shares earn swap fees + Euler lending yield automatically',
            'Withdraw at any time by redeeming your vault share tokens',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-xs font-mono text-[#1B2A4A]/60">
              <span className="text-[#B8973A] shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
