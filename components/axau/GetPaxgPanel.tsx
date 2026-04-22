"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useChainId } from "wagmi";
import { erc20Abi, formatUnits } from "viem";

const ARBITRUM_ONE  = 42161;
const PAXG_ARB      = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" as `0x${string}`;

// ─── External links ───────────────────────────────────────────────────────────

const LINKS = {
  uniswapEth:  "https://app.uniswap.org/swap?chain=mainnet&outputCurrency=0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  arbBridge:   "https://bridge.arbitrum.io/?destinationChain=arbitrum-one&sourceChain=ethereum",
  paxosHome:   "https://paxos.com/paxgold/",
  coinbase:    "https://www.coinbase.com/price/pax-gold",
  kraken:      "https://www.kraken.com/prices/pax-gold",
} as const;

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  num, title, body, links,
}: {
  num: number;
  title: string;
  body: string;
  links?: { label: string; href: string }[];
}) {
  return (
    <div className="border border-dl-border bg-dl-bg p-4 space-y-2">
      <div className="flex items-start gap-3">
        <span className="font-dl-mono text-xs text-white bg-dl-navy px-2 py-0.5 shrink-0 mt-0.5">
          {String(num).padStart(2, "0")}
        </span>
        <p className="font-dl-serif text-sm text-dl-navy font-semibold">{title}</p>
      </div>
      <p className="font-dl-mono text-xs text-dl-navy/70 leading-relaxed pl-9">{body}</p>
      {links && links.length > 0 && (
        <div className="pl-9 flex flex-wrap gap-2">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-2.5 py-1 hover:bg-dl-navy hover:text-white transition-colors"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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
          PAXG (Paxos Gold) is the reserve asset backing AXAU. You need PAXG on{" "}
          <strong>Arbitrum One</strong> before minting. PAXG liquidity on Arbitrum is thin
          — the reliable path is to buy on Ethereum mainnet and bridge.
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

      {/* Acquisition steps */}
      <div>
        <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/50 mb-3">
          Acquisition Path
        </p>
        <div className="space-y-2.5">
          <StepCard
            num={1}
            title="Buy PAXG on Ethereum Mainnet"
            body="Purchase PAXG directly from Paxos (paxos.com) or swap on Uniswap V3 using the WETH/PAXG 0.3% pool — which holds the deepest liquidity. CEX options include Coinbase and Kraken."
            links={[
              { label: "Uniswap (Ethereum)",  href: LINKS.uniswapEth },
              { label: "Paxos",               href: LINKS.paxosHome },
              { label: "Coinbase",            href: LINKS.coinbase },
              { label: "Kraken",              href: LINKS.kraken },
            ]}
          />
          <StepCard
            num={2}
            title="Bridge PAXG to Arbitrum One"
            body='Use the official Arbitrum Bridge to transfer your PAXG from Ethereum Mainnet to Arbitrum One. Select PAXG as the token, set destination to "Arbitrum One". Bridging takes ~10–15 minutes.'
            links={[
              { label: "Arbitrum Bridge", href: LINKS.arbBridge },
            ]}
          />
          <StepCard
            num={3}
            title="Mint AXAU"
            body="Once PAXG arrives in your Arbitrum One wallet, return to the Mint tab. Enter your PAXG amount, approve the MintRedeemController, then mint AXAU."
          />
        </div>
      </div>

      {/* Note on DEX liquidity */}
      <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-navy/60 leading-relaxed">
          <strong className="text-dl-navy">Why not swap on Arbitrum?</strong>{" "}
          Only ~8 PAXG tokens exist on Arbitrum One in total. On-chain DEX pools are present
          but have near-zero depth — any swap beyond a trivial amount incurs extreme price
          impact. The bridge route is the only practical acquisition path.
        </p>
      </div>

    </div>
  );
}
