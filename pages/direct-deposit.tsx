import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

interface DirectDepositInfo {
  participantRef: string;
  fullName: string;
  status: string;
  virtualRoutingNumber: string | null;
  virtualAccountNumber: string | null;
  hasVirtualAccount: boolean;
}

export default function DirectDepositPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [mounted, setMounted] = useState(false);
  const [info, setInfo] = useState<DirectDepositInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotFound(false);
    setNeedsSignIn(false);
    try {
      const res = await fetch('/api/banking/participant/direct-deposit');
      if (res.status === 401) { setNeedsSignIn(true); setLoading(false); return; }
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to load direct deposit info');
        setLoading(false);
        return;
      }
      const d = await res.json();
      setInfo(d);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignIn = async () => {
    if (!address || typeof window === 'undefined') return;
    setSigningIn(true);
    setSignInError('');
    try {
      const { siweService } = await import('../lib/services/SIWEService');
      siweService.resetSigningState();

      let signer: { signMessage: (msg: string) => Promise<string> } | null = null;
      let chainId = 42161;

      if (walletClient) {
        chainId = walletClient.chain?.id ?? 42161;
        signer = {
          signMessage: (msg: string) => walletClient.signMessage({ message: msg }),
        };
      }

      if (!signer) {
        try {
          const { WalletService } = await import('../lib/services/WalletService');
          signer = WalletService.getInstance().getSigner() as { signMessage: (msg: string) => Promise<string> } | null;
        } catch {}
      }

      if (!signer) {
        const win = window as Window & { ethereum?: unknown };
        if (win.ethereum) {
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(win.ethereum as Parameters<typeof ethers.BrowserProvider>[0]);
          signer = await provider.getSigner();
          const network = await provider.getNetwork();
          chainId = Number(network.chainId) || 42161;
        }
      }

      if (!signer) {
        setSignInError('No wallet signer available. Please reconnect your wallet and try again.');
        return;
      }

      const result = await siweService.signIn(signer, address, chainId);
      if (result.success) {
        setNeedsSignIn(false);
        fetchInfo();
      } else {
        setSignInError(result.error || 'Sign-in failed. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSignInError(msg || 'Sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) fetchInfo();
  }, [isConnected, address, fetchInfo]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg(`${label} copied`);
    setTimeout(() => setCopyMsg(''), 2000);
  };

  const openForm = () => {
    window.open('/api/banking/participant/direct-deposit/form', '_blank');
  };

  const PAYROLL_GUIDES = [
    {
      name: 'ADP',
      steps: [
        "Log in to ADP Employee Self Service (myadp.com) or your company's ADP portal.",
        'Navigate to Myself → Pay → Direct Deposit.',
        'Click "Add Account" and select Checking.',
        `Enter routing number and account number from above.`,
        'Set the allocation to 100% of net pay (or a fixed dollar amount).',
        'Save and allow 1–2 pay cycles to take effect.',
      ],
    },
    {
      name: 'Gusto',
      steps: [
        'Log in to Gusto (gusto.com) and go to your Employee Dashboard.',
        'Click "Personal Info" → "Payment Method".',
        'Select "Bank Account" and choose Checking.',
        'Enter the routing and account numbers above.',
        'Verify your account if prompted (Gusto may send a micro-deposit).',
        'Changes apply to the next payroll run after verification.',
      ],
    },
    {
      name: 'Paychex',
      steps: [
        'Log in to Paychex Flex (paychexflex.com).',
        'Navigate to Profile → Direct Deposit.',
        'Click "Add New Account" and choose Checking.',
        'Enter the routing and account numbers above.',
        'Submit and allow 1 pay cycle for activation.',
      ],
    },
    {
      name: 'Rippling',
      steps: [
        'Log in to Rippling (rippling.com) and open your Employee Portal.',
        'Go to Profile → Pay → Direct Deposit Settings.',
        'Click "Add bank account" and select Checking.',
        'Enter the routing and account numbers above.',
        'Confirm changes and allow 1–2 pay cycles.',
      ],
    },
    {
      name: 'Manual HR / Paper Form',
      steps: [
        'Download the pre-filled Direct Deposit Authorization Form using the button above.',
        'Print the form or save it as a PDF.',
        'Sign the authorization section.',
        'Submit to your HR or payroll department as instructed by your employer.',
        'Allow 1–2 pay cycles after HR processes the form.',
      ],
    },
  ];

  const [openGuide, setOpenGuide] = useState<string | null>(null);

  return (
    <DesignLawLayout>
      <div className="mb-5">
        <div className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Axiom Nexus Banking / Get Paid Early</div>
        <h1 className="font-dl-serif text-3xl text-dl-navy font-bold mb-2">Direct Deposit</h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed">
          Your Axiom Nexus Account supports direct deposit through your employer or payroll provider.
          Funds typically arrive 1–2 business days before your official pay date — the same early-access infrastructure used by leading neobanks.
        </p>
      </div>

      {/* Info banner */}
      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="px-5 py-3 border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Institution</p>
            <p className="font-dl-mono text-xs text-dl-forest font-semibold">First Internet Bank</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">FDIC-insured · ACH rails via Increase</p>
          </div>
          <div className="px-5 py-3 border-r border-dl-border">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Timing</p>
            <p className="font-dl-mono text-xs text-dl-navy">1–2 Business Days Early</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">Credited when ACH file is received</p>
          </div>
          <div className="px-5 py-3">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-1">Notification</p>
            <p className="font-dl-mono text-xs text-dl-navy">Email on Receipt</p>
            <p className="font-dl-mono text-xs text-dl-gray mt-0.5">Amount, sender, and new balance</p>
          </div>
        </div>
      </div>

      {!mounted && (
        <div className="border border-dl-border p-8 text-center mb-8">
          <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading...</p>
        </div>
      )}

      {mounted && !isConnected && (
        <div className="border border-dl-border p-8 text-center mb-8">
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Required</p>
          <p className="text-dl-gray text-sm mb-4">Connect your wallet to view your direct deposit details.</p>
          <p className="text-dl-gray text-xs">Use the Connect Wallet button in the top navigation.</p>
        </div>
      )}

      {isConnected && loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-mono text-xs text-dl-gray animate-pulse">Loading your account details...</p>
        </div>
      )}

      {isConnected && !loading && needsSignIn && (
        <div className="border border-dl-navy p-6 mb-8">
          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-2">Wallet Verification Required</p>
          <p className="text-dl-gray text-sm mb-4 leading-relaxed">
            To protect your account, Axiom requires a one-time wallet signature to verify ownership before displaying
            your banking details. This does not cost gas and does not move any funds.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="border border-dl-navy bg-dl-navy text-white px-5 py-2.5 text-xs font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy disabled:opacity-50"
          >
            {signingIn ? 'Waiting for signature...' : 'Sign In with Wallet'}
          </button>
          {signInError && <p className="mt-3 text-xs text-red-700 font-dl-mono">{signInError}</p>}
        </div>
      )}

      {isConnected && !loading && error && (
        <div className="border border-red-300 p-4 mb-6">
          <p className="text-sm text-red-700 font-dl-mono">{error}</p>
        </div>
      )}

      {isConnected && !loading && notFound && (
        <div className="border border-dl-gold p-6 mb-8">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Not Registered</p>
          <p className="text-dl-gray text-sm mb-4">
            You do not have an Axiom Nexus Account yet. Register through any product to receive your dedicated routing and account numbers.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="/wealth-practice" className="border border-dl-navy bg-dl-navy text-white px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy">
              Wealth Practice
            </a>
            <a href="/lending-fund/invest" className="border border-dl-navy text-dl-navy px-4 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-navy hover:text-white">
              Lending Fund
            </a>
          </div>
        </div>
      )}

      {isConnected && !loading && info && (
        <>
          {copyMsg && (
            <div className="mb-4 px-4 py-2 border border-dl-forest text-dl-forest text-xs font-dl-mono inline-block">
              {copyMsg}
            </div>
          )}

          {/* Account numbers */}
          <div className="border border-dl-border mb-8">
            <div className="px-5 py-3 border-b border-dl-border bg-dl-bg flex items-center justify-between">
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Your Direct Deposit Details</p>
              <div className="flex items-center gap-3">
                {info.hasVirtualAccount && (
                  <span className="text-xs font-dl-mono px-2 py-0.5 border border-dl-forest text-dl-forest">PROVISIONED</span>
                )}
                <button
                  onClick={openForm}
                  className="border border-dl-navy bg-dl-navy text-white px-4 py-1.5 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy"
                >
                  Download Form
                </button>
              </div>
            </div>

            {info.hasVirtualAccount ? (
              <div className="divide-y divide-dl-border">
                {[
                  {
                    label: 'Routing Number',
                    value: info.virtualRoutingNumber!,
                    note: 'ABA routing — First Internet Bank',
                    copyable: true,
                  },
                  {
                    label: 'Account Number',
                    value: info.virtualAccountNumber!,
                    note: 'Your dedicated account number — unique to you',
                    copyable: true,
                  },
                  {
                    label: 'Account Type',
                    value: 'Checking',
                    note: 'Select "Checking" in all payroll portals',
                    copyable: false,
                  },
                  {
                    label: 'Bank Name',
                    value: 'First Internet Bank',
                    note: 'FDIC-insured custodian',
                    copyable: false,
                  },
                  {
                    label: 'Account Holder',
                    value: info.fullName,
                    note: 'As registered with Axiom Nexus',
                    copyable: true,
                  },
                  {
                    label: 'Reference Code',
                    value: info.participantRef,
                    note: 'Backup identifier — include in memo only if using shared account',
                    copyable: true,
                  },
                ].map(row => (
                  <div key={row.label} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">{row.label}</p>
                      <p className="font-dl-mono text-dl-navy font-bold text-base">{row.value}</p>
                      <p className="text-dl-gray text-xs mt-0.5">{row.note}</p>
                    </div>
                    {row.copyable && (
                      <button
                        onClick={() => copy(row.value, row.label)}
                        className="border border-dl-border text-dl-gray px-3 py-1.5 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-6">
                <p className="text-dl-gold text-sm font-dl-mono mb-2">Account provisioning in progress</p>
                <p className="text-dl-gray text-sm leading-relaxed mb-4">
                  Your dedicated routing and account numbers are being provisioned. In the meantime, use the shared routing number
                  below and include your reference code in the memo field.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
                  <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Routing Number</p>
                    <p className="font-dl-mono text-dl-navy font-bold">071006486</p>
                    <p className="text-dl-gray text-xs mt-0.5">First Internet Bank</p>
                  </div>
                  <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-dl-border">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Account Type</p>
                    <p className="font-dl-mono text-dl-navy font-bold">Checking</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Memo Field (Required)</p>
                    <p className="font-dl-mono text-dl-navy font-bold">{info.participantRef}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Why this is faster */}
          <div className="border border-dl-border mb-8">
            <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">Why You Get Paid Early</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-dl-gray text-sm leading-relaxed">
                Most banks wait until the official ACH settlement date to post funds to your account — even though the
                ACH file containing your payment arrives 1–2 business days earlier. Axiom Nexus credits your account
                as soon as the ACH file is received, not when it "settles."
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
                <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-2">Traditional Banks</p>
                  <p className="text-dl-navy text-sm font-semibold">Post on settlement date</p>
                  <p className="text-dl-gray text-xs mt-1">Wait the full 1–2 business days after payroll runs</p>
                </div>
                <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border bg-dl-bg">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-2">Axiom Nexus</p>
                  <p className="text-dl-forest text-sm font-bold">Post on file receipt</p>
                  <p className="text-dl-gray text-xs mt-1">Funds available when ACH file arrives — up to 2 days early</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-2">Infrastructure</p>
                  <p className="text-dl-navy text-sm font-semibold">Increase + First Internet Bank</p>
                  <p className="text-dl-gray text-xs mt-1">Same rails powering Chime, Current, and other neobanks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Setup guides */}
          <div className="border border-dl-border mb-8">
            <div className="px-5 py-3 border-b border-dl-border bg-dl-bg">
              <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider">How to Set Up Direct Deposit</p>
            </div>
            <div className="divide-y divide-dl-border">
              {PAYROLL_GUIDES.map(guide => (
                <div key={guide.name}>
                  <button
                    onClick={() => setOpenGuide(openGuide === guide.name ? null : guide.name)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-dl-bg text-left"
                  >
                    <p className="font-dl-mono text-sm text-dl-navy font-bold">{guide.name}</p>
                    <span className="font-dl-mono text-xs text-dl-gray">{openGuide === guide.name ? '▲ Hide' : '▼ Show'}</span>
                  </button>
                  {openGuide === guide.name && (
                    <div className="px-5 pb-5 border-t border-dl-border">
                      <ol className="space-y-3 mt-4">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-dl-gray leading-relaxed">
                            <span className="font-dl-mono text-dl-gold shrink-0 font-bold">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Download CTA */}
          <div className="border border-dl-border p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-1">Pre-Filled Authorization Form</p>
                <p className="text-dl-gray text-sm leading-relaxed max-w-lg">
                  Download a ready-to-sign direct deposit authorization form pre-filled with your name, routing number,
                  and account number. Print and submit to your HR department or upload to your payroll portal.
                </p>
              </div>
              <button
                onClick={openForm}
                className="border border-dl-navy bg-dl-navy text-white px-6 py-3 text-xs font-bold font-dl-mono uppercase tracking-wider hover:bg-dl-bg hover:text-dl-navy shrink-0"
              >
                Download Direct Deposit Form →
              </button>
            </div>
          </div>

          {/* Link back */}
          <div className="flex items-center gap-4">
            <a
              href="/banking/my-account"
              className="border border-dl-border text-dl-gray px-4 py-2 text-xs font-dl-mono uppercase hover:border-dl-navy hover:text-dl-navy"
            >
              ← My Nexus Account
            </a>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
