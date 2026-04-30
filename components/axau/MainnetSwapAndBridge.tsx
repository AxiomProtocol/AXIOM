"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useMainnetSwapAndBridge, type FlowStep } from "../../hooks/axau/useMainnetSwapAndBridge";

const ARBITRUM_ONE = 42161;

interface QuoteResp {
  success?: boolean;
  outputAmount?: string;
  outputAmountRaw?: string;
  priceImpactPct?: number | null;
  fairPaxg?: string | null;
  xauUsdPrice?: string | null;
  paxgTransferFeeBps?: number;
  paxgTransferFeeWarning?: string | null;
  error?: string;
}

interface BridgeGasResp {
  success?: boolean;
  totalCallValueEth?: string;
  l1BaseFeeGwei?: string;
  error?: string;
}

const STEP_LABELS: Record<FlowStep, string> = {
  idle: "Ready",
  "switch-to-mainnet": "Switching to Ethereum mainnet",
  "approve-usdc": "Approving USDC",
  "swap-usdc-to-paxg": "Swapping USDC -> PAXG",
  "lookup-gateway": "Looking up Arbitrum gateway",
  "approve-paxg-to-gateway": "Approving PAXG to Arbitrum gateway",
  "fetch-bridge-gas": "Computing bridge gas",
  "deposit-paxg-to-l1-gateway": "Depositing to Arbitrum bridge",
  "switch-back-to-arbitrum": "Switching back to Arbitrum",
  "wait-for-l2-arrival": "Bridge in progress (~10–15 min)",
  complete: "PAXG arrived on Arbitrum",
  error: "Error",
};

const STEP_ORDER: FlowStep[] = [
  "switch-to-mainnet",
  "approve-usdc",
  "swap-usdc-to-paxg",
  "lookup-gateway",
  "approve-paxg-to-gateway",
  "fetch-bridge-gas",
  "deposit-paxg-to-l1-gateway",
  "switch-back-to-arbitrum",
  "wait-for-l2-arrival",
  "complete",
];

function txExplorer(hash: string, network: "mainnet" | "arbitrum"): string {
  return network === "mainnet"
    ? `https://etherscan.io/tx/${hash}`
    : `https://arbiscan.io/tx/${hash}`;
}

function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function MainnetSwapAndBridge() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { state, execute, reset } = useMainnetSwapAndBridge();

  const [usdcInput, setUsdcInput] = useState("");
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bridgeGas, setBridgeGas] = useState<BridgeGasResp | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuote = useCallback(async (amt: string) => {
    if (!amt || parseFloat(amt) <= 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/axau/mainnet-paxg-quote?amount=${encodeURIComponent(amt)}`);
      const j: QuoteResp = await res.json();
      setQuote(j);
    } catch {
      setQuote({ error: "Quote network error" });
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(usdcInput), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usdcInput, fetchQuote]);

  useEffect(() => {
    fetch("/api/axau/bridge-gas-estimate")
      .then((r) => r.json())
      .then((j: BridgeGasResp) => setBridgeGas(j))
      .catch(() => setBridgeGas({ success: false, error: "gas estimate fetch failed" }));
  }, []);

  // L2 arrival polling now lives inside useMainnetSwapAndBridge so the hook
  // owns the state transition to `complete` and persists/restores resume rows.

  const onMainnet = chainId === 1;
  const onArbitrum = chainId === ARBITRUM_ONE;
  const flowActive = state.step !== "idle" && state.step !== "complete" && state.step !== "error";

  const slippagePct = quote?.priceImpactPct ?? null;
  const slippageOk = slippagePct === null || slippagePct < 3;
  const canExecute =
    isConnected &&
    !!address &&
    !flowActive &&
    !!quote?.outputAmount &&
    slippageOk &&
    parseFloat(usdcInput || "0") > 0;

  const stepIdx = useMemo(() => STEP_ORDER.indexOf(state.step), [state.step]);

  const handleExecute = useCallback(() => {
    if (!quote?.outputAmount) return;
    execute({
      usdcAmount: usdcInput,
      expectedPaxgOut: quote.outputAmount,
      expectedPaxgOutRaw: quote.outputAmountRaw,
    });
  }, [execute, quote?.outputAmount, quote?.outputAmountRaw, usdcInput]);

  return (
    <div className="space-y-5">
      {!isConnected && (
        <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
          <p className="font-dl-mono text-xs text-dl-navy/70">
            Connect a wallet to acquire PAXG on Arbitrum without leaving this page.
          </p>
        </div>
      )}

      {isConnected && !onMainnet && !onArbitrum && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="font-dl-mono text-xs text-amber-900">
            WRONG NETWORK — Connect on Arbitrum One to begin (the widget will switch to Ethereum mainnet for the swap and back).
          </p>
        </div>
      )}

      <div className="border border-dl-border bg-white">
        <div className="px-4 py-3 border-b border-dl-border bg-dl-bg-alt">
          <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/60">
            Get PAXG — In-app (Mainnet swap → Arbitrum bridge)
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/60 mb-1.5">
              USDC Amount (Ethereum mainnet)
            </label>
            <div className="flex items-center border border-dl-border bg-white">
              <input
                type="text"
                inputMode="decimal"
                value={usdcInput}
                onChange={(e) => setUsdcInput(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={flowActive}
                placeholder="0.00"
                className="flex-1 px-4 py-3 font-dl-mono text-sm text-dl-navy outline-none bg-transparent disabled:opacity-50"
              />
              <span className="px-4 font-dl-mono text-xs text-dl-navy/60 border-l border-dl-border h-full py-3">
                USDC
              </span>
            </div>
          </div>

          <div className="border border-dl-border divide-y divide-dl-border">
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/50">
                You receive (PAXG, after swap)
              </span>
              <span className="font-dl-mono text-sm text-dl-navy font-semibold">
                {quoteLoading ? "…" : quote?.outputAmount ?? "—"} PAXG
              </span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/50">
                Price impact
              </span>
              <span
                className={`font-dl-mono text-xs font-semibold ${
                  slippagePct === null
                    ? "text-dl-navy/40"
                    : slippagePct < 1
                      ? "text-green-700"
                      : slippagePct < 3
                        ? "text-amber-700"
                        : "text-red-700"
                }`}
              >
                {slippagePct === null ? "—" : `${slippagePct.toFixed(2)}%`}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/50">
                XAU/USD reference
              </span>
              <span className="font-dl-mono text-xs text-dl-navy/70">
                {quote?.xauUsdPrice ? `$${quote.xauUsdPrice}` : "—"}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/50">
                Bridge ETH cost (one-time)
              </span>
              <span className="font-dl-mono text-xs text-dl-navy/70">
                {bridgeGas?.totalCallValueEth
                  ? `~${parseFloat(bridgeGas.totalCallValueEth).toFixed(6)} ETH`
                  : "—"}
              </span>
            </div>
          </div>

          {quote?.error && (
            <div className="border border-red-200 bg-red-50 px-3 py-2">
              <p className="font-dl-mono text-[11px] text-red-800">QUOTE ERROR — {quote.error}</p>
            </div>
          )}

          {!slippageOk && quote?.outputAmount && (
            <div className="border border-red-200 bg-red-50 px-3 py-2">
              <p className="font-dl-mono text-[11px] text-red-800">
                BLOCKED — Price impact above 3% safety cap. Reduce amount or try again later.
              </p>
            </div>
          )}

          {quote?.paxgTransferFeeWarning && (
            <div className="border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="font-dl-mono text-[11px] text-amber-900">{quote.paxgTransferFeeWarning}</p>
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={!canExecute}
            className="w-full bg-dl-navy text-white font-dl-mono text-xs uppercase tracking-widest py-3.5 hover:bg-dl-navy/90 disabled:bg-dl-border disabled:cursor-not-allowed transition-colors"
          >
            {flowActive
              ? STEP_LABELS[state.step]
              : state.step === "complete"
                ? "Done — Mint AXAU now"
                : "Get PAXG"}
          </button>

          {state.step !== "idle" && (
            <div className="border border-dl-border bg-dl-bg-alt p-3 space-y-2">
              <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/60">
                Progress
              </p>
              <ol className="space-y-1">
                {STEP_ORDER.map((s, i) => {
                  const done = stepIdx > i || state.step === "complete";
                  const active = state.step === s;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 ${
                          done ? "bg-green-600" : active ? "bg-amber-500" : "bg-dl-border"
                        }`}
                      />
                      <span
                        className={`font-dl-mono text-[11px] ${
                          done
                            ? "text-green-800"
                            : active
                              ? "text-amber-800 font-semibold"
                              : "text-dl-navy/40"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")} · {STEP_LABELS[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {state.message && (
                <p className="font-dl-mono text-[11px] text-dl-navy/70 pt-2 border-t border-dl-border">
                  {state.message}
                </p>
              )}

              <div className="space-y-1 pt-2 border-t border-dl-border">
                {state.approveUsdcTx && (
                  <a
                    href={txExplorer(state.approveUsdcTx, "mainnet")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-dl-mono text-[10px] text-dl-navy/70 hover:text-dl-navy"
                  >
                    USDC approve · {shortHash(state.approveUsdcTx)} ↗
                  </a>
                )}
                {state.swapTx && (
                  <a
                    href={txExplorer(state.swapTx, "mainnet")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-dl-mono text-[10px] text-dl-navy/70 hover:text-dl-navy"
                  >
                    Swap · {shortHash(state.swapTx)} ↗
                  </a>
                )}
                {state.approvePaxgTx && (
                  <a
                    href={txExplorer(state.approvePaxgTx, "mainnet")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-dl-mono text-[10px] text-dl-navy/70 hover:text-dl-navy"
                  >
                    PAXG approve · {shortHash(state.approvePaxgTx)} ↗
                  </a>
                )}
                {state.bridgeTx && (
                  <a
                    href={txExplorer(state.bridgeTx, "mainnet")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-dl-mono text-[10px] text-dl-navy/70 hover:text-dl-navy"
                  >
                    Bridge deposit (L1) · {shortHash(state.bridgeTx)} ↗
                  </a>
                )}
              </div>

              {state.step === "error" && (
                <div className="border border-red-200 bg-red-50 px-3 py-2 mt-2">
                  <p className="font-dl-mono text-[11px] text-red-800 font-semibold">
                    {state.errorAtStep ? STEP_LABELS[state.errorAtStep] : "Error"}
                  </p>
                  <p className="font-dl-mono text-[11px] text-red-700 mt-1">{state.errorMessage}</p>
                  <button
                    onClick={reset}
                    className="font-dl-mono text-[10px] uppercase tracking-widest text-red-900 underline mt-2"
                  >
                    Reset
                  </button>
                </div>
              )}

              {state.step === "complete" && (
                <div className="border border-green-300 bg-green-50 px-3 py-2 mt-2">
                  <p className="font-dl-mono text-[11px] text-green-900 font-semibold">
                    PAXG ARRIVED ON ARBITRUM
                  </p>
                  {state.paxgArrivedOnArbitrum && (
                    <p className="font-dl-mono text-[11px] text-green-800 mt-1">
                      Delivered: {state.paxgArrivedOnArbitrum} PAXG
                    </p>
                  )}
                  <p className="font-dl-mono text-[10px] text-green-800/80 mt-1">
                    Switch to the Mint tab to issue AXAU.
                  </p>
                  <button
                    onClick={reset}
                    className="font-dl-mono text-[10px] uppercase tracking-widest text-green-900 underline mt-2"
                  >
                    Reset widget
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
