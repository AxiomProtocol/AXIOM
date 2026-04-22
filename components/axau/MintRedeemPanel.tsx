"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";

import { erc20Abi, parseAbi, parseUnits, formatUnits } from "viem";
import GetPaxgPanel from "./GetPaxgPanel";

const ARBITRUM_ONE = 42161;

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTROLLER   = "0x036F05a3fB74d35439c074f25F691b36f5D37792" as `0x${string}`;
const AXAU_TOKEN   = "0xbcCA4D937d427829914498423aE6E04C846dB0Bb" as `0x${string}`;
const PAXG_ADDR    = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" as `0x${string}`;
const XAU_VAULT_ID = "0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b" as `0x${string}`;

const CONTROLLER_ABI = parseAbi([
  "function mintWithAsset(bytes32 vaultId, uint256 tokenAmount) external returns (uint256 axauOut)",
  "function redeemToAsset(bytes32 vaultId, uint256 axauAmount) external returns (uint256 tokenOut)",
  "function mintPaused() view returns (bool)",
  "function redeemPaused() view returns (bool)",
]);

type Tab    = "get" | "mint" | "redeem";
type Status = "idle" | "approving" | "approved" | "submitting" | "confirming" | "success" | "error";

interface Quote {
  axauOutFormatted?: string;
  mintNavFormatted?: string;
  mintPaused?: boolean;
  reserveOutFormatted?: string;
  backingNavFormatted?: string;
  redeemPaused?: boolean;
}

// Tab display config
const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: "get",    label: "Get PAXG" },
  { id: "mint",   label: "Mint" },
  { id: "redeem", label: "Redeem" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MintRedeemPanel() {
  const { address, isConnected } = useAccount();
  const chainId                  = useChainId();
  const isWrongNetwork           = isConnected && chainId !== ARBITRUM_ONE;
  const publicClient             = usePublicClient();
  const { writeContractAsync }   = useWriteContract();

  const [tab, setTab]               = useState<Tab>("get");
  const [amount, setAmount]         = useState("");
  const [balance, setBalance]       = useState("0");
  const [mintPaused, setMintPaused] = useState(true);
  const [redeemPaused, setRedeemPaused] = useState(true);
  const [quote, setQuote]           = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [status, setStatus]         = useState<Status>("idle");
  const [txHash, setTxHash]         = useState<`0x${string}` | null>(null);
  const [errMsg, setErrMsg]         = useState<string | null>(null);

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    if (confirmed && status === "confirming") {
      setStatus("success");
      setAmount("");
      setQuote(null);
      fetchBalance();
    }
  }, [confirmed]);

  // ── Fetch balances ─────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    if (!address || !publicClient || tab === "get") return;
    const tokenAddr = tab === "mint" ? PAXG_ADDR : AXAU_TOKEN;
    try {
      const raw = await publicClient.readContract({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      setBalance(parseFloat(formatUnits(raw as bigint, 18)).toFixed(6));
    } catch { setBalance("0"); }
  }, [address, publicClient, tab]);

  // ── Fetch controller pause state ──────────────────────────────────────────

  const fetchPauseState = useCallback(async () => {
    if (!publicClient) return;
    try {
      const [mp, rp] = await Promise.all([
        publicClient.readContract({ address: CONTROLLER, abi: CONTROLLER_ABI, functionName: "mintPaused" }),
        publicClient.readContract({ address: CONTROLLER, abi: CONTROLLER_ABI, functionName: "redeemPaused" }),
      ]);
      setMintPaused(mp as boolean);
      setRedeemPaused(rp as boolean);
    } catch { /* keep defaults */ }
  }, [publicClient]);

  useEffect(() => { fetchBalance(); fetchPauseState(); }, [fetchBalance, fetchPauseState]);

  // ── Quote via API ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (tab === "get") return;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    const tid = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch(`/api/axau/quote?action=${tab}&amount=${amount}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setQuote(data);
      } catch { setQuote(null); } finally { setQuoteLoading(false); }
    }, 500);
    return () => clearTimeout(tid);
  }, [amount, tab]);

  // ── Transaction handler ───────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isConnected || !address || !amount || !publicClient) return;
    if (status !== "idle" && status !== "error") return;
    if (isWrongNetwork) { setErrMsg("Switch to Arbitrum One to continue."); return; }
    if (tab === "mint" && mintPaused) { setErrMsg("Mint is currently paused."); return; }
    if (tab === "redeem" && redeemPaused) { setErrMsg("Redeem is currently paused."); return; }

    setErrMsg(null);
    setTxHash(null);
    const paused = tab === "mint" ? mintPaused : redeemPaused;

    try {
      const amountWei      = parseUnits(amount, 18);
      const tokenToApprove = tab === "mint" ? PAXG_ADDR : AXAU_TOKEN;

      // ── Step 1: Check and approve ──────────────────────────────────────────
      setStatus("approving");
      const allowance = await publicClient.readContract({
        address: tokenToApprove,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, CONTROLLER],
      }) as bigint;

      if (allowance < amountWei) {
        const approveTx = await writeContractAsync({
          address: tokenToApprove,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTROLLER, amountWei],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      setStatus("approved");

      // ── Step 2: Mint or Redeem ─────────────────────────────────────────────
      setStatus("submitting");
      let hash: `0x${string}`;

      if (tab === "mint") {
        hash = await writeContractAsync({
          address: CONTROLLER,
          abi: CONTROLLER_ABI,
          functionName: "mintWithAsset",
          args: [XAU_VAULT_ID, amountWei],
        });
      } else {
        hash = await writeContractAsync({
          address: CONTROLLER,
          abi: CONTROLLER_ABI,
          functionName: "redeemToAsset",
          args: [XAU_VAULT_ID, amountWei],
        });
      }

      setTxHash(hash);
      setStatus("confirming");

    } catch (e: any) {
      const msg = e?.shortMessage ?? e?.message ?? "Transaction failed";
      setErrMsg(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setErrMsg(null); };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isPaused     = tab === "mint" ? mintPaused : redeemPaused;
  const parsedAmount = parseFloat(amount) || 0;
  const canSubmit    = isConnected && parsedAmount > 0 && !quoteLoading && status === "idle" && !isPaused && !isWrongNetwork;

  const statusLabel: Record<Status, string> = {
    idle:       tab === "mint" ? "Mint AXAU" : "Redeem AXAU",
    approving:  `Approving ${tab === "mint" ? "PAXG" : "AXAU"}…`,
    approved:   "Approval confirmed",
    submitting: "Submitting transaction…",
    confirming: "Confirming on-chain…",
    success:    "Transaction confirmed",
    error:      "Retry",
  };

  return (
    <div className="border border-dl-border">

      {/* Tabs — 3 columns */}
      <div className="flex border-b border-dl-border">
        {TAB_CONFIG.map((t, i) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setAmount("");
              setQuote(null);
              setStatus("idle");
              setErrMsg(null);
            }}
            className={`flex-1 py-3 text-sm font-dl-mono uppercase tracking-widest transition-colors ${
              tab === t.id
                ? "bg-dl-navy text-white"
                : "bg-dl-bg text-dl-navy/60 hover:text-dl-navy"
            } ${i < TAB_CONFIG.length - 1 ? "border-r border-dl-border" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Get PAXG Tab ───────────────────────────────────────────────────── */}
      {tab === "get" && <GetPaxgPanel />}

      {/* ── Mint / Redeem Tabs ─────────────────────────────────────────────── */}
      {tab !== "get" && (
        <>
          {/* Wrong Network Banner */}
          {isWrongNetwork && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-200">
              <p className="font-dl-mono text-xs text-red-800 font-bold">
                WRONG NETWORK — Switch your wallet to Arbitrum One (Chain ID 42161) to continue.
              </p>
            </div>
          )}

          {/* Safety Hold Banner */}
          {!isWrongNetwork && isPaused && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
              <p className="font-dl-mono text-xs text-amber-800">
                <span className="font-bold">SAFETY HOLD — {tab.toUpperCase()} PAUSED.</span>{" "}
                {tab === "mint"
                  ? "Mint transactions activate on governor authorization."
                  : "Redemption is paused pending reserve confirmation."}
              </p>
            </div>
          )}

          <div className="px-5 py-5 space-y-4">

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-dl-mono text-xs uppercase tracking-widest text-dl-navy/60">
                  {tab === "mint" ? "PAXG Amount" : "AXAU Amount"}
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
                  {tab === "mint" ? "PAXG" : "AXAU"}
                </span>
              </div>
            </div>

            {/* Quote Display */}
            <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt min-h-[60px]">
              {quoteLoading ? (
                <p className="font-dl-mono text-xs text-dl-navy/40">Computing quote…</p>
              ) : quote && parsedAmount > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between font-dl-mono text-sm">
                    <span className="text-dl-navy/60">
                      {tab === "mint" ? "AXAU you receive" : "PAXG you receive"}
                    </span>
                    <span className="text-dl-navy font-semibold">
                      {tab === "mint"
                        ? `${quote.axauOutFormatted ?? "—"} AXAU`
                        : `${quote.reserveOutFormatted ?? "—"} PAXG`}
                    </span>
                  </div>
                  {(quote.mintNavFormatted || quote.backingNavFormatted) && (
                    <div className="flex justify-between font-dl-mono text-xs text-dl-navy/50">
                      <span>{tab === "mint" ? "Mint NAV / token" : "Backing NAV / token"}</span>
                      <span>${tab === "mint" ? quote.mintNavFormatted : quote.backingNavFormatted}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-dl-mono text-xs text-dl-navy/30">Enter amount to see quote</p>
              )}
            </div>

            {/* CTA */}
            {!isConnected ? (
              <div className="px-4 py-3 border border-dl-border text-center font-dl-mono text-sm text-dl-navy/50">
                Connect wallet to {tab}
              </div>
            ) : isWrongNetwork ? (
              <div className="px-4 py-3 border border-red-200 text-center font-dl-mono text-sm text-red-700 bg-red-50">
                Switch to Arbitrum One
              </div>
            ) : (
              <button
                onClick={status === "error" ? reset : handleSubmit}
                disabled={!canSubmit && status !== "error"}
                className={`w-full py-3 font-dl-mono text-sm uppercase tracking-widest transition-colors ${
                  isPaused
                    ? "bg-dl-navy/10 text-dl-navy/40 border border-dl-border cursor-not-allowed"
                    : canSubmit || status === "error"
                      ? "bg-dl-navy text-white hover:bg-dl-navy/80"
                      : "bg-dl-navy/30 text-white/60 cursor-not-allowed"
                }`}
              >
                {isPaused ? `${tab.toUpperCase()} PAUSED` : statusLabel[status]}
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
                  Transaction confirmed.{" "}
                  <a
                    href={`https://arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View on Arbiscan
                  </a>
                </p>
              </div>
            )}

            {/* Confirming */}
            {status === "confirming" && txHash && (
              <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
                <p className="font-dl-mono text-xs text-dl-navy/60">
                  Waiting for on-chain confirmation…{" "}
                  <a
                    href={`https://arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-dl-navy"
                  >
                    {txHash.slice(0, 10)}…{txHash.slice(-6)}
                  </a>
                </p>
              </div>
            )}

            {/* Transaction flow indicator */}
            {["approving", "approved", "submitting"].includes(status) && (
              <div className="border border-dl-border px-4 py-3 bg-dl-bg-alt">
                <div className="space-y-1">
                  {[
                    { label: `Step 1: Approve ${tab === "mint" ? "PAXG" : "AXAU"}`, done: ["approved", "submitting"].includes(status), active: status === "approving" },
                    { label: `Step 2: Submit ${tab}`,                                done: false,                                        active: status === "submitting" },
                  ].map(step => (
                    <div key={step.label} className="flex items-center gap-2 font-dl-mono text-xs">
                      <span className={`w-2 h-2 flex-shrink-0 ${step.done ? "bg-dl-forest" : step.active ? "bg-dl-gold animate-pulse" : "bg-dl-border"}`} />
                      <span className={step.done ? "text-dl-forest" : step.active ? "text-dl-navy" : "text-dl-navy/30"}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-dl-border bg-dl-bg-alt">
        <p className="font-dl-mono text-[10px] text-dl-navy/40">
          Contracts on Arbitrum One. Reserve asset: PAXG — Paxos Gold (1 oz/token).
          Mint/redeem subject to coverage ratio and identity compliance.
        </p>
      </div>
    </div>
  );
}
