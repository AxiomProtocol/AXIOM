"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useChainId } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import MainnetSwapAndBridge from "./MainnetSwapAndBridge";

const ARBITRUM_ONE  = 42161;
const PAXG_ARB      = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" as `0x${string}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function GetPaxgPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const isWrongNetwork           = isConnected && chainId !== ARBITRUM_ONE;
  const publicClient             = usePublicClient();

  const [paxgBalance, setPaxgBalance] = useState<string | null>(null);
  const [paxgPrice,   setPaxgPrice]   = useState<string | null>(null);
  const [loadingBal,  setLoadingBal]  = useState(false);

  // ── Fetch PAXG balance on Arbitrum ──────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    if (!address || !publicClient) return;
    setLoadingBal(true);
    try {
      const raw = await publicClient.readContract({
        address: PAXG_ARB,
        abi:     erc20Abi,
        functionName: "balanceOf",
        args:    [address],
      }) as bigint;
      setPaxgBalance(parseFloat(formatUnits(raw, 18)).toFixed(6));
    } catch { /* no-op */ }
    finally { setLoadingBal(false); }
  }, [address, publicClient]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // ── Fetch live PAXG spot price from NAV endpoint ────────────────────────────

  useEffect(() => {
    fetch("/api/axau/nav")
      .then(r => r.json())
      .then(d => {
        if (d?.xauUsdPrice) {
          setPaxgPrice(parseFloat(d.xauUsdPrice).toLocaleString("en-US", {
            style:    "currency",
            currency: "USD",
            maximumFractionDigits: 2,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-5 py-5 space-y-5">

      {/* Wrong network banner */}
      {isWrongNetwork && (
        <div className="border border-red-200 px-4 py-3 bg-red-50">
          <p className="font-dl-mono text-xs text-red-800 font-bold">
            WRONG NETWORK — Switch wallet to Arbitrum One (Chain ID 42161).
          </p>
        </div>
      )}

      {/* Context banner */}
      <div className="border-l-4 border-dl-gold px-4 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-navy/80 leading-relaxed">
          PAXG (Paxos Gold) is the reserve asset backing AXAU. The widget below
          handles the full acquisition end-to-end inside Axiom — your wallet
          will be prompted to swap USDC for PAXG on Ethereum mainnet (deep
          Uniswap V3 liquidity) and then bridge to Arbitrum One. No external
          tabs, no deep-links.
        </p>
      </div>

      {/* Live price + balance */}
      <div className="border border-dl-border divide-y divide-dl-border">
        <div className="flex justify-between px-4 py-2.5">
          <span className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/50">PAXG Spot Price</span>
          <span className="font-dl-mono text-sm text-dl-navy font-semibold">
            {paxgPrice ?? "—"} / oz
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5">
          <span className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/50">
            Your PAXG (Arbitrum)
          </span>
          {!isConnected ? (
            <span className="font-dl-mono text-xs text-dl-navy/40">Connect wallet</span>
          ) : loadingBal ? (
            <span className="font-dl-mono text-xs text-dl-navy/40">Loading…</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-dl-mono text-sm text-dl-navy font-semibold">
                {paxgBalance ?? "0.000000"} PAXG
              </span>
              <button
                onClick={fetchBalance}
                className="font-dl-mono text-xs text-dl-navy/40 hover:text-dl-navy underline"
              >
                ↻
              </button>
            </div>
          )}
        </div>
      </div>

      {/* In-app swap + bridge widget */}
      <MainnetSwapAndBridge />

      {/* Footnote on Arbitrum DEX impracticality */}
      <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-navy/60 leading-relaxed">
          <strong className="text-dl-navy">Why not swap on Arbitrum directly?</strong>{" "}
          Only ~9.75 PAXG exists on the entire Arbitrum One chain. Any non-trivial
          USDC→PAXG swap on Arbitrum incurs 70–99% slippage. The mainnet swap +
          bridge path above is the only economically viable route.
        </p>
      </div>

    </div>
  );
}
