import { useState, useEffect, useCallback } from 'react';
import { useSwapQuote } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

// Fix 1: Canonical token addresses aligned with quote.ts and price.ts.
// Only tokens with live EulerSwap pool support are included.
const TOKENS = [
  { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  isNative: false },
  { symbol: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', decimals: 18, isNative: false },
  { symbol: 'AXM',   address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', decimals: 18, isNative: false },
];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

export default function SwapInterface() {
  const { isConnected, address, provider } = useWallet();
  const [tokenIn, setTokenIn]   = useState(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [balanceIn, setBalanceIn]   = useState('0.00');
  const [balanceOut, setBalanceOut] = useState('0.00');

  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote(
    tokenIn.address,
    tokenOut.address,
    amountIn
  );

  const fetchBalance = useCallback(async (token: typeof TOKENS[0], setBalance: (b: string) => void) => {
    if (!address || !provider) { setBalance('0.00'); return; }
    try {
      const { ethers } = await import('ethers');
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      setBalance(parseFloat(ethers.formatUnits(balance, token.decimals)).toFixed(token.decimals === 6 ? 2 : 4));
    } catch {
      setBalance('0.00');
    }
  }, [address, provider]);

  useEffect(() => { fetchBalance(tokenIn, setBalanceIn); }, [tokenIn, address, provider, fetchBalance]);
  useEffect(() => { fetchBalance(tokenOut, setBalanceOut); }, [tokenOut, address, provider, fetchBalance]);

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
  };

  const handleTokenSelect = (type: 'in' | 'out', token: typeof TOKENS[0]) => {
    if (type === 'in') {
      token.address === tokenOut.address ? handleSwapTokens() : setTokenIn(token);
    } else {
      token.address === tokenIn.address ? handleSwapTokens() : setTokenOut(token);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !quote) return;
    // Swap execution to be wired to EulerSwap router in next implementation phase.
    console.log('[SwapInterface] Swap intent:', { tokenIn, tokenOut, amountIn, quote });
  };

  // Design Law palette constants
  const DL = {
    border:   'border border-[#1B2A4A]/20',
    surface:  'bg-[#F8F6F0]',
    label:    'text-[#1B2A4A]/60 text-xs font-mono uppercase tracking-wide',
    value:    'text-[#1B2A4A] font-semibold',
    gold:     'text-[#B8973A]',
    navyBg:   'bg-[#1B2A4A]',
    navyText: 'text-white',
  };

  return (
    <div className={`${DL.border} bg-white max-w-md mx-auto`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B2A4A]/10">
        <span className="font-serif text-lg text-[#1B2A4A] tracking-tight">Swap</span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 border border-[#1B2A4A]/20 hover:border-[#1B2A4A]/50 transition-colors"
        >
          <svg className="w-4 h-4 text-[#1B2A4A]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="px-5 py-3 border-b border-[#1B2A4A]/10 bg-[#F8F6F0]">
          <div className={`${DL.label} mb-2`}>Slippage Tolerance</div>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                  slippage === val
                    ? 'border-[#1D3D2A] bg-[#1D3D2A] text-white'
                    : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/50'
                }`}
              >
                {val}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-16 px-2 py-1.5 border border-[#1B2A4A]/20 text-xs font-mono text-[#1B2A4A] text-center bg-white focus:outline-none focus:border-[#1B2A4A]"
              placeholder="Custom"
            />
          </div>
        </div>
      )}

      <div className="p-5 space-y-1">
        <div className={`${DL.surface} ${DL.border} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className={DL.label}>You pay</span>
            <button
              onClick={() => setAmountIn(balanceIn)}
              className={`${DL.label} hover:text-[#1B2A4A] transition-colors`}
            >
              Balance: {balanceIn}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-mono text-[#1B2A4A] outline-none placeholder:text-[#1B2A4A]/30"
            />
            <TokenSelector token={tokenIn} onSelect={(t) => handleTokenSelect('in', t)} tokens={TOKENS} />
          </div>
        </div>

        <div className="flex justify-center py-1 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="p-2 border border-[#1B2A4A]/20 bg-white hover:bg-[#F8F6F0] transition-colors"
          >
            <svg className="w-4 h-4 text-[#1B2A4A]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <div className={`${DL.surface} ${DL.border} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className={DL.label}>You receive</span>
            <span className={DL.label}>Balance: {balanceOut}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-mono text-[#1B2A4A]">
              {quoteLoading ? (
                <span className="text-[#1B2A4A]/30">Loading...</span>
              ) : quote ? (
                parseFloat(quote.amountOut).toFixed(6)
              ) : (
                <span className="text-[#1B2A4A]/30">0.0</span>
              )}
            </div>
            <TokenSelector token={tokenOut} onSelect={(t) => handleTokenSelect('out', t)} tokens={TOKENS} />
          </div>
        </div>
      </div>

      {quote && (
        <div className="mx-5 mb-4 border border-[#1B2A4A]/10 bg-[#F8F6F0] p-3 space-y-2">
          <div className="flex justify-between">
            <span className={DL.label}>Price Impact</span>
            <span className={`font-mono text-xs ${parseFloat(quote.priceImpact) > 5 ? 'text-red-600' : 'text-[#1D3D2A]'}`}>
              {parseFloat(quote.priceImpact).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className={DL.label}>Fee</span>
            <span className="font-mono text-xs text-[#1B2A4A]">{parseFloat(quote.fee).toFixed(6)} {tokenIn.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className={DL.label}>Route</span>
            <span className="font-mono text-xs text-[#1B2A4A]">{quote.route.length > 2 ? `${quote.route.length} hops` : 'Direct'}</span>
          </div>
          <div className="flex justify-between">
            <span className={DL.label}>Protocol</span>
            <span className="font-mono text-xs text-[#B8973A]">EulerSwap V2</span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="mx-5 mb-4 p-3 border border-red-300 bg-red-50">
          <p className="text-xs font-mono text-red-700">{quoteError}</p>
        </div>
      )}

      <div className="px-5 pb-5">
        <button
          onClick={handleSwap}
          disabled={!isConnected || !quote || quoteLoading}
          className={`w-full py-3.5 font-mono text-sm font-semibold tracking-wide transition-colors ${
            isConnected && quote && !quoteLoading
              ? 'bg-[#1B2A4A] text-white hover:bg-[#1D3D2A]'
              : 'bg-[#1B2A4A]/10 text-[#1B2A4A]/30 cursor-not-allowed'
          }`}
        >
          {!isConnected
            ? 'CONNECT WALLET'
            : !amountIn
            ? 'ENTER AMOUNT'
            : quoteLoading
            ? 'GETTING QUOTE...'
            : !quote
            ? 'NO ROUTE FOUND'
            : 'SWAP'}
        </button>
        <p className="text-center text-[10px] font-mono text-[#1B2A4A]/30 mt-2">
          Powered by EulerSwap V2 on Arbitrum One
        </p>
      </div>
    </div>
  );
}

function TokenSelector({
  token,
  onSelect,
  tokens
}: {
  token: typeof TOKENS[0];
  onSelect: (token: typeof TOKENS[0]) => void;
  tokens: typeof TOKENS;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-[#1B2A4A]/20 bg-white hover:border-[#1B2A4A]/50 transition-colors"
      >
        <span className="font-mono text-sm font-semibold text-[#1B2A4A]">{token.symbol}</span>
        <svg className="w-3 h-3 text-[#1B2A4A]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#1B2A4A]/20 shadow-lg z-50">
            {tokens.map((t) => (
              <button
                key={t.symbol}
                onClick={() => { onSelect(t); setIsOpen(false); }}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-mono text-[#1B2A4A] hover:bg-[#F8F6F0] transition-colors ${
                  t.address === token.address ? 'bg-[#F8F6F0] text-[#B8973A]' : ''
                }`}
              >
                {t.symbol}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
