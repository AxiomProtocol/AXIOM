"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";

import {
  erc20Abi,
  parseAbi,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";

const ARBITRUM_ONE = 42161;

// ─── Addresses ────────────────────────────────────────────────────────────────

const PAXG_ADDR    = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" as `0x${string}`;
const WETH_ADDR    = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`;
const USDC_ADDR    = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;
const ROUTER       = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" as `0x${string}`;
const QUOTER_V2    = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`;

// Fee tiers that have liquidity
const FEE_ETH_PAXG  = 3000;  // WETH/PAXG 0.3%
const FEE_USDC_PAXG = 500;   // USDC/PAXG 0.05%

// USDC uses 6 decimals, everything else 18
const USDC_DECIMALS = 6;

// ─── ABIs ──────────────────────────────────────────────────────────────────────

const quoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

const routerAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

type InputToken = "ETH" | "USDC";
type GetStatus  = "idle" | "approving" | "approved" | "submitting" | "confirming" | "success" | "error";

// ─── Helper: fetch a live PAXG quote from QuoterV2 ────────────────────────────

async function fetchPaxgQuote(
  publicClient: ReturnType<typeof usePublicClient>,
  inputToken: InputToken,
  amount: string
): Promise<{ amountOut: bigint; error?: never } | { amountOut?: never; error: string } | null> {
  if (!publicClient) return null;

  const tokenIn  = inputToken === "ETH" ? WETH_ADDR : USDC_ADDR;
  const fee      = inputToken === "ETH" ? FEE_ETH_PAXG : FEE_USDC_PAXG;
  const decimals = inputToken === "USDC" ? USDC_DECIMALS : 18;

  let amountIn: bigint;
  try { amountIn = parseUnits(amount, decimals); }
  catch { return { error: "Invalid amount" }; }

  const callData = encodeFunctionData({
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [{ tokenIn, tokenOut: PAXG_ADDR, amountIn, fee, sqrtPriceLimitX96: 0n }],
  });

  // QuoterV2 uses a revert-based mechanism: pool.swap() reverts in the callback,
  // QuoterV2 catches it and either returns normally OR reverts again with the data.
  // We handle both paths.
  let rawData: `0x${string}` | undefined;

  try {
    const result = await publicClient.call({ to: QUOTER_V2, data: callData });
    rawData = result.data;
  } catch (err: any) {
    // Walk the error chain looking for revert data
    const candidates = [
      err?.data,
      err?.cause?.data,
      err?.cause?.cause?.data,
      err?.shortMessage,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.startsWith("0x") && c.length > 2) {
        rawData = c as `0x${string}`;
        break;
      }
    }
    if (!rawData) {
      const msg = err?.shortMessage ?? err?.message ?? "Quote failed";
      console.error("[GetPaxgPanel] quote error:", msg, err);
      return { error: msg };
    }
  }

  if (!rawData || rawData === "0x") return { error: "No quote data returned" };

  try {
    const [amountOut] = decodeFunctionResult({
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      data: rawData,
    }) as [bigint, bigint, number, bigint];
    return { amountOut };
  } catch (err: any) {
    console.error("[GetPaxgPanel] decode error:", err);
    return { error: "Could not decode quote" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GetPaxgPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const isWrongNetwork           = isConnected && chainId !== ARBITRUM_ONE;
  const publicClient             = usePublicClient();
  const { writeContractAsync }   = useWriteContract();

  const [inputToken, setInputToken]     = useState<InputToken>("ETH");
  const [amount, setAmount]             = useState("");
  const [paxgOut, setPaxgOut]           = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [ethBalance, setEthBalance]     = useState("0");
  const [usdcBalance, setUsdcBalance]   = useState("0");
  const [paxgBalance, setPaxgBalance]   = useState("0");
  const [status, setStatus]             = useState<GetStatus>("idle");
  const [txHash, setTxHash]             = useState<`0x${string}` | null>(null);
  const [errMsg, setErrMsg]             = useState<string | null>(null);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (confirmed && status === "confirming") {
      setStatus("success");
      setAmount("");
      setPaxgOut(null);
      fetchBalances();
    }
  }, [confirmed]);

  // ── Fetch balances ──────────────────────────────────────────────────────────

  const fetchBalances = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      const [ethRaw, usdcRaw, paxgRaw] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({ address: USDC_ADDR, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
        publicClient.readContract({ address: PAXG_ADDR, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      ]);
      setEthBalance(parseFloat(formatUnits(ethRaw, 18)).toFixed(5));
      setUsdcBalance(parseFloat(formatUnits(usdcRaw, USDC_DECIMALS)).toFixed(2));
      setPaxgBalance(parseFloat(formatUnits(paxgRaw, 18)).toFixed(6));
    } catch { /* no-op */ }
  }, [address, publicClient]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  // ── Quote via QuoterV2 (debounced display quote) ───────────────────────────

  useEffect(() => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !publicClient) {
      setPaxgOut(null);
      setErrMsg(null);
      return;
    }
    const tid = setTimeout(async () => {
      setQuoteLoading(true);
      const result = await fetchPaxgQuote(publicClient, inputToken, amount);
      if (result && "amountOut" in result) {
        setPaxgOut(parseFloat(formatUnits(result.amountOut, 18)).toFixed(6));
        setErrMsg(null);
      } else if (result && "error" in result) {
        setPaxgOut(null);
        setErrMsg(result.error);
      } else {
        setPaxgOut(null);
      }
      setQuoteLoading(false);
    }, 600);
    return () => clearTimeout(tid);
  }, [amount, inputToken, publicClient]);

  // ── Swap handler ────────────────────────────────────────────────────────────

  const handleSwap = async () => {
    if (!isConnected || !address || !amount || !publicClient) return;
    if (status !== "idle" && status !== "error") return;
    if (isWrongNetwork) { setErrMsg("Switch to Arbitrum One to continue."); return; }

    setErrMsg(null);
    setTxHash(null);

    try {
      const tokenIn  = inputToken === "ETH" ? WETH_ADDR : USDC_ADDR;
      const fee      = inputToken === "ETH" ? FEE_ETH_PAXG : FEE_USDC_PAXG;
      const decimals = inputToken === "USDC" ? USDC_DECIMALS : 18;
      const amountIn = parseUnits(amount, decimals);

      // ── Fetch fresh on-chain quote right before submit ─────────────────────
      setStatus("approving"); // Show activity while fetching fresh quote
      const freshResult = await fetchPaxgQuote(publicClient, inputToken, amount);
      if (!freshResult || "error" in freshResult) {
        throw new Error(freshResult?.error ?? "Could not fetch live quote. Please try again.");
      }
      const freshOut = freshResult.amountOut;
      // 1% slippage tolerance applied to the fresh quote
      const amountOutMin = (freshOut * 99n) / 100n;
      // Update display quote to match fresh result
      setPaxgOut(parseFloat(formatUnits(freshOut, 18)).toFixed(6));

      // ── USDC: approve router first ─────────────────────────────────────────
      if (inputToken === "USDC") {
        setStatus("approving");
        const allowance = await publicClient.readContract({
          address: USDC_ADDR,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, ROUTER],
        }) as bigint;

        if (allowance < amountIn) {
          const approveTx = await writeContractAsync({
            address: USDC_ADDR,
            abi: erc20Abi,
            functionName: "approve",
            args: [ROUTER, amountIn],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
        setStatus("approved");
      }

      // ── Swap ───────────────────────────────────────────────────────────────
      setStatus("submitting");

      const swapParams = {
        tokenIn,
        tokenOut: PAXG_ADDR,
        fee,
        recipient: address,
        amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n,
      } as const;

      const hash = await writeContractAsync({
        address: ROUTER,
        abi: routerAbi,
        functionName: "exactInputSingle",
        args: [swapParams],
        // ETH input: send value so router wraps it to WETH internally
        ...(inputToken === "ETH" ? { value: amountIn } : {}),
      });

      setTxHash(hash);
      setStatus("confirming");

    } catch (e: any) {
      const msg = e?.shortMessage ?? e?.message ?? "Swap failed";
      setErrMsg(msg.length > 150 ? msg.slice(0, 150) + "…" : msg);
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setErrMsg(null); };

  // ── Render ──────────────────────────────────────────────────────────────────

  const parsedAmount = parseFloat(amount) || 0;
  const balance      = inputToken === "ETH" ? ethBalance : usdcBalance;
  const canSwap      = isConnected && parsedAmount > 0 && !!paxgOut && !quoteLoading && status === "idle" && !isWrongNetwork;

  const statusLabel: Record<GetStatus, string> = {
    idle:       "Swap for PAXG",
    approving:  inputToken === "ETH" ? "Fetching live quote…" : "Approving USDC…",
    approved:   "Approval confirmed",
    submitting: "Submitting swap…",
    confirming: "Confirming on-chain…",
    success:    "Swap confirmed",
    error:      "Retry",
  };

  return (
    <div className="px-5 py-5 space-y-4">

      {/* Wrong Network Banner */}
      {isWrongNetwork && (
        <div className="border border-red-200 px-4 py-3 bg-red-50">
          <p className="font-dl-mono text-xs text-red-800 font-bold">
            WRONG NETWORK — Switch your wallet to Arbitrum One (Chain ID 42161) to continue.
          </p>
        </div>
      )}

      {/* Info banner */}
      {!isWrongNetwork && (
        <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
          <p className="font-dl-mono text-xs text-dl-navy/60 leading-relaxed">
            Swap ETH or USDC for PAXG (Paxos Gold) directly on Arbitrum One via Uniswap V3.
            PAXG is required as the reserve asset to mint AXAU.
          </p>
        </div>
      )}

      {/* Input token selector */}
      <div>
        <label className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/60 block mb-1.5">
          Pay With
        </label>
        <div className="flex border border-dl-border">
          {(["ETH", "USDC"] as InputToken[]).map(t => (
            <button
              key={t}
              onClick={() => { setInputToken(t); setAmount(""); setPaxgOut(null); }}
              className={`flex-1 py-2.5 font-dl-mono text-sm uppercase tracking-wider transition-colors ${
                inputToken === t
                  ? "bg-dl-navy text-white"
                  : "bg-dl-bg text-dl-navy/50 hover:text-dl-navy border-r border-dl-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/60">
            {inputToken} Amount
          </label>
          {isConnected && (
            <button
              onClick={() => setAmount(balance)}
              className="font-dl-mono text-xs text-dl-navy/50 hover:text-dl-navy"
            >
              Balance: {balance}
            </button>
          )}
        </div>
        <div className="flex border border-dl-border">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="any"
            className="flex-1 px-4 py-3 font-dl-mono text-lg text-dl-navy bg-transparent outline-none placeholder:text-dl-navy/20"
          />
          <span className="px-4 py-3 font-dl-mono text-sm text-dl-navy/60 bg-dl-bg-alt border-l border-dl-border self-center">
            {inputToken}
          </span>
        </div>
      </div>

      {/* Quote output */}
      <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt min-h-[56px]">
        {quoteLoading ? (
          <p className="font-dl-mono text-xs text-dl-navy/40">Fetching quote from Uniswap V3…</p>
        ) : paxgOut && parsedAmount > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between font-dl-mono text-sm">
              <span className="text-dl-navy/60">PAXG you receive</span>
              <span className="text-dl-navy font-semibold">{paxgOut} PAXG</span>
            </div>
            <div className="flex justify-between font-dl-mono text-xs text-dl-navy/40">
              <span>Route</span>
              <span>{inputToken} → PAXG · {inputToken === "ETH" ? "0.3%" : "0.05%"} fee · Uniswap V3</span>
            </div>
            <div className="flex justify-between font-dl-mono text-xs text-dl-navy/40">
              <span>Slippage tolerance</span>
              <span>1.0%</span>
            </div>
          </div>
        ) : (
          <p className="font-dl-mono text-xs text-dl-navy/30">Enter amount to see quote</p>
        )}
      </div>

      {/* PAXG balance after */}
      {isConnected && (
        <div className="flex justify-between font-dl-mono text-xs text-dl-navy/50">
          <span>Current PAXG balance</span>
          <span>{paxgBalance} PAXG</span>
        </div>
      )}

      {/* CTA */}
      {!isConnected ? (
        <div className="px-4 py-3 border border-dl-border text-center font-dl-mono text-sm text-dl-navy/50">
          Connect wallet to swap
        </div>
      ) : isWrongNetwork ? (
        <div className="px-4 py-3 border border-red-200 text-center font-dl-mono text-sm text-red-700 bg-red-50">
          Switch to Arbitrum One
        </div>
      ) : (
        <button
          onClick={status === "error" ? reset : handleSwap}
          disabled={!canSwap && status !== "error"}
          className={`w-full py-3 font-dl-mono text-sm uppercase tracking-widest transition-colors ${
            canSwap || status === "error"
              ? "bg-dl-navy text-white hover:bg-dl-navy/80"
              : "bg-dl-navy/30 text-white/60 cursor-not-allowed"
          }`}
        >
          {statusLabel[status]}
        </button>
      )}

      {/* Error */}
      {errMsg && (
        <div className="border border-red-200 px-4 py-3 bg-red-50">
          <p className="font-dl-mono text-xs text-red-700">{errMsg}</p>
        </div>
      )}

      {/* Success */}
      {status === "success" && txHash && (
        <div className="border border-dl-forest px-4 py-3 bg-green-50">
          <p className="font-dl-mono text-xs text-dl-forest">
            Swap confirmed — PAXG received.{" "}
            <a href={`https://arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
              View on Arbiscan
            </a>
            <span className="block mt-1 text-dl-forest/70">You can now use the Mint tab to mint AXAU with your PAXG.</span>
          </p>
        </div>
      )}

      {/* Confirming */}
      {status === "confirming" && txHash && (
        <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
          <p className="font-dl-mono text-xs text-dl-navy/60">
            Waiting for confirmation…{" "}
            <a href={`https://arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline text-dl-navy">
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          </p>
        </div>
      )}

      {/* Step flow for USDC */}
      {inputToken === "USDC" && ["approving", "approved", "submitting"].includes(status) && (
        <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
          <div className="space-y-1">
            {[
              { label: "Step 1: Approve USDC to router", done: ["approved", "submitting"].includes(status), active: status === "approving" },
              { label: "Step 2: Execute swap",           done: false,                                         active: status === "submitting" },
            ].map(step => (
              <div key={step.label} className="flex items-center gap-2 font-dl-mono text-xs">
                <span className={`w-2 h-2 flex-shrink-0 ${step.done ? "bg-dl-forest" : step.active ? "bg-dl-gold animate-pulse" : "bg-dl-border"}`} />
                <span className={step.done ? "text-dl-forest" : step.active ? "text-dl-navy" : "text-dl-navy/30"}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="font-dl-mono text-[10px] text-dl-navy/40 pt-1">
        Swaps routed through Uniswap V3 on Arbitrum One. Market rates apply. 1% slippage tolerance.
        Axiom Protocol does not collect fees on this swap.
      </p>
    </div>
  );
}
