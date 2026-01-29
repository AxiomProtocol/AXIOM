import { useState, useEffect } from 'react';
import { useSwapQuote } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

const TOKENS = [
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, logo: '/eth.png', isNative: true },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, logo: '/weth.png' },
  { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logo: '/usdc.png' },
  { symbol: 'AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', decimals: 18, logo: '/axusd.png' },
  { symbol: 'AXM', address: '0x0C00fA01729A8FFa7C0F31bC5e95195ed58ce946', decimals: 18, logo: '/axm-token.png' }
];

export default function SwapInterface() {
  const { isConnected, address } = useWallet();
  const [tokenIn, setTokenIn] = useState(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  
  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote(
    tokenIn.address,
    tokenOut.address,
    amountIn
  );

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
  };

  const handleTokenSelect = (type: 'in' | 'out', token: typeof TOKENS[0]) => {
    if (type === 'in') {
      if (token.address === tokenOut.address) {
        handleSwapTokens();
      } else {
        setTokenIn(token);
      }
    } else {
      if (token.address === tokenIn.address) {
        handleSwapTokens();
      } else {
        setTokenOut(token);
      }
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !quote) return;
    console.log('Executing swap:', { tokenIn, tokenOut, amountIn, quote });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Swap</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50/50 rounded-xl">
          <div className="text-sm text-gray-500 mb-2">Slippage Tolerance</div>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  slippage === val
                    ? 'bg-teal-500 text-gray-900'
                    : 'bg-gray-100 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {val}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-16 px-2 py-1 bg-gray-100 border border-gray-600 rounded-lg text-sm text-gray-900 text-center"
              placeholder="Custom"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="bg-gray-50/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">You pay</span>
            <span className="text-sm text-gray-500">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 outline-none"
            />
            <TokenSelector
              token={tokenIn}
              onSelect={(t) => handleTokenSelect('in', t)}
              tokens={TOKENS}
            />
          </div>
        </div>

        <div className="flex justify-center -my-1 z-10 relative">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-gray-100 hover:bg-gray-600 border-4 border-gray-800 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">You receive</span>
            <span className="text-sm text-gray-500">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-semibold text-gray-900">
              {quoteLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : quote ? (
                parseFloat(quote.amountOut).toFixed(6)
              ) : (
                <span className="text-gray-500">0.0</span>
              )}
            </div>
            <TokenSelector
              token={tokenOut}
              onSelect={(t) => handleTokenSelect('out', t)}
              tokens={TOKENS}
            />
          </div>
        </div>
      </div>

      {quote && (
        <div className="mt-4 p-3 bg-gray-50/30 rounded-xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price Impact</span>
            <span className={quote.priceImpact > 5 ? 'text-red-400' : 'text-gray-300'}>
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Fee</span>
            <span className="text-gray-300">{parseFloat(quote.fee).toFixed(6)} {tokenIn.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Route</span>
            <span className="text-gray-300">{quote.route.length > 2 ? `${quote.route.length} hops` : 'Direct'}</span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-xl">
          <p className="text-sm text-red-400">{quoteError}</p>
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={!isConnected || !quote || quoteLoading}
        className={`w-full mt-4 py-4 rounded-xl font-bold text-lg transition-all ${
          isConnected && quote && !quoteLoading
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
        }`}
      >
        {!isConnected
          ? 'Connect Wallet'
          : !amountIn
          ? 'Enter Amount'
          : quoteLoading
          ? 'Getting Quote...'
          : !quote
          ? 'No Route Found'
          : 'Swap'}
      </button>
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
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-600 rounded-xl transition-colors"
      >
        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-teal-600">
          {token.symbol.charAt(0)}
        </div>
        <span className="font-semibold text-gray-900">{token.symbol}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            {tokens.map((t) => (
              <button
                key={t.symbol}
                onClick={() => {
                  onSelect(t);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors ${
                  t.address === token.address ? 'bg-gray-100' : ''
                }`}
              >
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-bold text-teal-600">
                  {t.symbol.charAt(0)}
                </div>
                <span className="font-medium text-gray-900">{t.symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
