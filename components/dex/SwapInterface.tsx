import { useState, useEffect, useCallback } from 'react';
import { useSwapQuote } from '../../lib/hooks/useDex';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { erc20Abi, parseAbi, parseUnits } from 'viem';

const TOKENS = [
  { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`, decimals: 6  },
  { symbol: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' as `0x${string}`, decimals: 18 },
  { symbol: 'AXM',   address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' as `0x${string}`, decimals: 18 },
];

const CANONICAL_PSM   = '0xDB669bb6cA07215C5B055B62072AAED2F821E53F' as `0x${string}`;
const AXM_AXUSD_POOL  = '0x981763699D269E129a08E216b1AeC7caa376A8a8' as `0x${string}`;

const USDC_ADDR  = TOKENS[0].address.toLowerCase();
const AXUSD_ADDR = TOKENS[1].address.toLowerCase();
const AXM_ADDR   = TOKENS[2].address.toLowerCase();

// PSM: approve tokenIn → mint/redeem (pull model — no front-run risk)
const PSM_ABI = parseAbi([
  'function mint(uint256 usdcAmount) external returns (uint256)',
  'function redeem(uint256 axusdAmount) external returns (uint256)',
]);

// EulerSwap V2 pool: Uniswap-V2-compatible swap
// Caller must transfer tokenIn to pool before calling swap (push model)
// token0=AXM (0x864F) < token1=AXUSD (0xD611) — confirmed from deployment
const EULERSWAP_ABI = parseAbi([
  'function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data) external',
]);

type SwapStatus = 'idle' | 'approving' | 'transferring' | 'swapping' | 'confirming' | 'success' | 'error';

function getRoute(tIn: string, tOut: string): 'psm' | 'euler' | null {
  const a = tIn.toLowerCase(), b = tOut.toLowerCase();
  if ((a === USDC_ADDR && b === AXUSD_ADDR) || (a === AXUSD_ADDR && b === USDC_ADDR)) return 'psm';
  if ((a === AXM_ADDR  && b === AXUSD_ADDR) || (a === AXUSD_ADDR && b === AXM_ADDR))  return 'euler';
  return null;
}

export default function SwapInterface() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [tokenIn, setTokenIn]   = useState(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [balanceIn, setBalanceIn]   = useState('0.00');
  const [balanceOut, setBalanceOut] = useState('0.00');

  const [swapStatus, setSwapStatus] = useState<SwapStatus>('idle');
  const [swapTxHash, setSwapTxHash] = useState<`0x${string}` | null>(null);
  const [swapError, setSwapError]   = useState<string | null>(null);

  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote(
    tokenIn.address,
    tokenOut.address,
    amountIn,
  );

  const fetchBalance = useCallback(async (token: typeof TOKENS[0], setBalance: (b: string) => void) => {
    if (!address || !publicClient) { setBalance('0.00'); return; }
    try {
      const raw = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });
      const { formatUnits } = await import('viem');
      setBalance(parseFloat(formatUnits(raw as bigint, token.decimals)).toFixed(token.decimals === 6 ? 2 : 4));
    } catch { setBalance('0.00'); }
  }, [address, publicClient]);

  useEffect(() => { fetchBalance(tokenIn, setBalanceIn); }, [tokenIn, address, publicClient, fetchBalance]);
  useEffect(() => { fetchBalance(tokenOut, setBalanceOut); }, [tokenOut, address, publicClient, fetchBalance]);

  const handleSwapTokens = () => {
    const t = tokenIn; setTokenIn(tokenOut); setTokenOut(t); setAmountIn('');
  };

  const handleTokenSelect = (type: 'in' | 'out', token: typeof TOKENS[0]) => {
    if (type === 'in') {
      token.address === tokenOut.address ? handleSwapTokens() : setTokenIn(token);
    } else {
      token.address === tokenIn.address ? handleSwapTokens() : setTokenOut(token);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !quote || !address || !publicClient) return;
    if (swapStatus !== 'idle' && swapStatus !== 'error') return;

    const route = getRoute(tokenIn.address, tokenOut.address);
    if (!route) { setSwapError('No route available for this pair'); return; }

    setSwapError(null);
    setSwapTxHash(null);

    const amountInBig  = parseUnits(amountIn, tokenIn.decimals);
    const slipPct      = parseFloat(slippage) / 100;
    const minOutFloat  = parseFloat(quote.amountOut) * (1 - slipPct);
    const minOutBig    = parseUnits(minOutFloat.toFixed(tokenOut.decimals), tokenOut.decimals);

    try {
      if (route === 'psm') {
        // ── PSM route: approve tokenIn → mint/redeem ──
        // PSM pulls tokenIn from msg.sender — no front-run risk
        setSwapStatus('approving');
        const allowance = await publicClient.readContract({
          address: tokenIn.address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, CANONICAL_PSM],
        }) as bigint;

        if (allowance < amountInBig) {
          const approveTx = await writeContractAsync({
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [CANONICAL_PSM, amountInBig],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }

        setSwapStatus('swapping');
        const swapTx = await writeContractAsync(
          tokenIn.symbol === 'USDC'
            ? { address: CANONICAL_PSM, abi: PSM_ABI, functionName: 'mint',   args: [amountInBig] }
            : { address: CANONICAL_PSM, abi: PSM_ABI, functionName: 'redeem', args: [amountInBig] }
        );
        setSwapStatus('confirming');
        await publicClient.waitForTransactionReceipt({ hash: swapTx });
        setSwapTxHash(swapTx);

      } else {
        // ── EulerSwap route: transfer tokenIn to pool → pool.swap ──
        // token0=AXM (0x864F) < token1=AXUSD (0xD611)
        const isTokenInToken0 = tokenIn.address.toLowerCase() === AXM_ADDR;

        setSwapStatus('transferring');
        const transferTx = await writeContractAsync({
          address: tokenIn.address,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [AXM_AXUSD_POOL, amountInBig],
        });
        await publicClient.waitForTransactionReceipt({ hash: transferTx });

        // amount0Out = AXM out, amount1Out = AXUSD out
        const amount0Out = isTokenInToken0 ? 0n        : minOutBig;
        const amount1Out = isTokenInToken0 ? minOutBig : 0n;

        setSwapStatus('swapping');
        const swapTx = await writeContractAsync({
          address: AXM_AXUSD_POOL,
          abi: EULERSWAP_ABI,
          functionName: 'swap',
          args: [amount0Out, amount1Out, address, '0x'],
        });
        setSwapStatus('confirming');
        await publicClient.waitForTransactionReceipt({ hash: swapTx });
        setSwapTxHash(swapTx);
      }

      setSwapStatus('success');
      setTimeout(() => {
        fetchBalance(tokenIn, setBalanceIn);
        fetchBalance(tokenOut, setBalanceOut);
        setAmountIn('');
        setSwapStatus('idle');
      }, 3000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes('user rejected') && !msg.toLowerCase().includes('user denied')) {
        setSwapError(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
      setSwapStatus('idle');
    }
  };

  const route    = getRoute(tokenIn.address, tokenOut.address);
  const isBusy   = swapStatus !== 'idle' && swapStatus !== 'error' && swapStatus !== 'success';
  const protocol = route === 'psm' ? 'Canonical PSM' : 'EulerSwap V2';
  const isEulerRoute = route === 'euler';

  const statusLabel: Record<SwapStatus, string> = {
    idle:        'SWAP',
    approving:   'APPROVING…',
    transferring:'SENDING TO POOL…',
    swapping:    'SWAPPING…',
    confirming:  'CONFIRMING…',
    success:     'SUCCESS',
    error:       'SWAP',
  };

  const DL = {
    border:  'border border-[#1B2A4A]/20',
    surface: 'bg-[#F8F6F0]',
    label:   'text-[#1B2A4A]/60 text-xs font-mono uppercase tracking-wide',
  };

  return (
    <div className={`${DL.border} bg-white max-w-md mx-auto`}>
      {/* Header */}
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

      {/* Slippage settings */}
      {showSettings && (
        <div className="px-5 py-3 border-b border-[#1B2A4A]/10 bg-[#F8F6F0]">
          <div className={`${DL.label} mb-2`}>Slippage Tolerance</div>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button key={val} onClick={() => setSlippage(val)}
                className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                  slippage === val ? 'border-[#1D3D2A] bg-[#1D3D2A] text-white' : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/50'
                }`}
              >{val}%</button>
            ))}
            <input type="number" value={slippage} onChange={(e) => setSlippage(e.target.value)}
              className="w-16 px-2 py-1.5 border border-[#1B2A4A]/20 text-xs font-mono text-[#1B2A4A] text-center bg-white focus:outline-none focus:border-[#1B2A4A]"
              placeholder="Custom"
            />
          </div>
        </div>
      )}

      {/* Token inputs */}
      <div className="p-5 space-y-1">
        <div className={`${DL.surface} ${DL.border} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className={DL.label}>You pay</span>
            <button onClick={() => setAmountIn(balanceIn)} className={`${DL.label} hover:text-[#1B2A4A] transition-colors`}>
              Balance: {balanceIn}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={amountIn} onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0" disabled={isBusy}
              className="flex-1 bg-transparent text-2xl font-mono text-[#1B2A4A] outline-none placeholder:text-[#1B2A4A]/30 disabled:opacity-50"
            />
            <TokenSelector token={tokenIn} onSelect={(t) => handleTokenSelect('in', t)} tokens={TOKENS} />
          </div>
        </div>

        <div className="flex justify-center py-1 relative z-10">
          <button onClick={handleSwapTokens} disabled={isBusy}
            className="p-2 border border-[#1B2A4A]/20 bg-white hover:bg-[#F8F6F0] transition-colors disabled:opacity-40"
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
              {quoteLoading ? <span className="text-[#1B2A4A]/30">Loading...</span>
                : quote ? parseFloat(quote.amountOut).toFixed(6)
                : <span className="text-[#1B2A4A]/30">0.0</span>}
            </div>
            <TokenSelector token={tokenOut} onSelect={(t) => handleTokenSelect('out', t)} tokens={TOKENS} />
          </div>
        </div>
      </div>

      {/* Quote details */}
      {quote && (
        <div className="mx-5 mb-4 border border-[#1B2A4A]/10 bg-[#F8F6F0] p-3 space-y-2">
          {route !== 'psm' && (
            <div className="flex justify-between">
              <span className={DL.label}>Price Impact</span>
              <span className={`font-mono text-xs ${parseFloat(String(quote.priceImpact)) > 5 ? 'text-red-600' : 'text-[#1D3D2A]'}`}>
                {parseFloat(String(quote.priceImpact)).toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={DL.label}>Fee</span>
            <span className="font-mono text-xs text-[#1B2A4A]">{parseFloat(quote.fee).toFixed(6)} {tokenIn.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className={DL.label}>Protocol</span>
            <span className="font-mono text-xs text-[#B8973A]">{protocol}</span>
          </div>
          {isEulerRoute && (
            <p className="font-mono text-[10px] text-[#1B2A4A]/40 pt-1 leading-relaxed">
              AXM↔AXUSD uses the EulerSwap pool. This route sends 2 transactions: one to fund the pool, one to execute the swap.
            </p>
          )}
          {route === 'psm' && (
            <p className="font-mono text-[10px] text-[#1B2A4A]/40 pt-1 leading-relaxed">
              USDC↔AXUSD routes through the Canonical PSM (1:1 rate, identity-gated). Requires an approved ERC-3643 identity.
            </p>
          )}
        </div>
      )}

      {/* Success state */}
      {swapStatus === 'success' && swapTxHash && (
        <div className="mx-5 mb-4 p-3 border border-[#1D3D2A]/30 bg-[#1D3D2A]/5">
          <p className="text-xs font-mono text-[#1D3D2A] font-semibold mb-1">Swap confirmed</p>
          <a
            href={`https://arbiscan.io/tx/${swapTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[#1D3D2A]/70 hover:text-[#1D3D2A] break-all underline"
          >
            {swapTxHash.slice(0, 18)}…{swapTxHash.slice(-8)} ↗
          </a>
        </div>
      )}

      {/* Error state */}
      {(swapError || quoteError) && (
        <div className="mx-5 mb-4 p-3 border border-red-300 bg-red-50">
          <p className="text-xs font-mono text-red-700">{swapError ?? quoteError}</p>
        </div>
      )}

      {/* Action button */}
      <div className="px-5 pb-5">
        <button
          onClick={handleSwap}
          disabled={!isConnected || !quote || quoteLoading || isBusy}
          className={`w-full py-3.5 font-mono text-sm font-semibold tracking-wide transition-colors ${
            swapStatus === 'success'
              ? 'bg-[#1D3D2A] text-white'
              : isConnected && quote && !quoteLoading && !isBusy
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
            : statusLabel[swapStatus]}
        </button>
        <p className="text-center text-[10px] font-mono text-[#1B2A4A]/30 mt-2">
          Powered by EulerSwap V2 + Canonical PSM on Arbitrum One
        </p>
      </div>
    </div>
  );
}

function TokenSelector({
  token, onSelect, tokens
}: {
  token: typeof TOKENS[0];
  onSelect: (token: typeof TOKENS[0]) => void;
  tokens: typeof TOKENS;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
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
              <button key={t.symbol}
                onClick={() => { onSelect(t); setIsOpen(false); }}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-mono text-[#1B2A4A] hover:bg-[#F8F6F0] transition-colors ${
                  t.address === token.address ? 'bg-[#F8F6F0] text-[#B8973A]' : ''
                }`}
              >{t.symbol}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
