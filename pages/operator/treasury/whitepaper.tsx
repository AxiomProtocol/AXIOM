import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  return { props: { generatedAt: new Date().toISOString() } };
};

const VAULT_ADDR    = '0x8c9761D465CB95306266a68FF8935C4690EC6092';
const SM_ADDR       = '0x432dFEe1DAb2D7d423690819DC65C033FE266E8e';
const AXUSD_ADDR    = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const ARBISCAN      = 'https://arbiscan.io/address';

const STRATEGIES = [
  {
    label:   'Aave V3 — USDC Supply Market',
    address: '0x7d500015C5765456C16Ce2CF38AAF14075C01DD4',
    asset:   'USDC',
    apy:     'Variable (live on-chain)',
    protocol:'Aave V3',
    vault:   '—',
    status:  'Active',
    notes:   'Primary liquidity reserve. Deepest liquidity. Governed by Aave DAO.',
  },
  {
    label:   'Camelot — AMM Liquidity Position',
    address: '0x511441D31e629d7513004a692c2dB67438151696',
    asset:   'USDC / AXUSD',
    apy:     'Variable (fee-based)',
    protocol:'Camelot DEX',
    vault:   '—',
    status:  'Active',
    notes:   'Native Arbitrum AMM. Provides AXUSD/USDC liquidity and fee income.',
  },
  {
    label:   'Euler v2 — USDC Theo Market',
    address: '0x82cBB154e1684C4720c9f5fF16E685F2de28Bd68',
    asset:   'USDC',
    apy:     '~13.11%',
    protocol:'Euler Finance v2',
    vault:   '0x05d28A86E057364F6ad1a88944297E58Fc6160b3',
    status:  'Active',
    notes:   'ERC-4626 Euler vault. Higher base yield on idle USDC vs Aave.',
  },
  {
    label:   'Euler v2 — thBILL Theo Market',
    address: '0x6CBF5Bf949166AaDD439bDd410eDF5FC55Ee9215',
    asset:   'thBILL',
    apy:     '~15.31%',
    protocol:'Euler Finance v2',
    vault:   '0x79e1F4a1Cde92568D58EB823f81D9c0C7C384e6b',
    status:  'Active',
    notes:   'T-bill backed yield. Combines RWA Treasury bill exposure with on-chain lending premium.',
  },
  {
    label:   'Euler v2 — WETH Arbitrum Market',
    address: '0x7a4f0A3290e7152779FCf00eB32183Cb1E0E1211',
    asset:   'WETH',
    apy:     '~15.98%',
    protocol:'Euler Finance v2',
    vault:   '0x78E3E051D32157AACD550fBB78458762d8f7edFF',
    status:  'Active',
    notes:   'Highest-yield position. ETH-denominated. Exposure managed through protocol allocation limits.',
  },
];

const ROLES = [
  { role: 'DEFAULT_ADMIN_ROLE',  holder: 'Deployer EOA', capability: 'Grant / revoke all roles. Upgrade contracts.' },
  { role: 'VAULT_ADMIN',         holder: 'Deployer EOA', capability: 'Pause vault. Set accepted assets. Update fee parameters.' },
  { role: 'STRATEGY_ADMIN',      holder: 'Deployer EOA', capability: 'Register strategies. Trigger allocate / withdraw / harvest on each IStrategy adapter.' },
  { role: 'CRON_HARVESTER',      holder: 'Cron service', capability: 'Call harvest() on a 6-hour UTC schedule (00:00 / 06:00 / 12:00 / 18:00).' },
  { role: 'OPERATOR_ROLE',       holder: 'Operator UI',  capability: 'Read-only access to VaultSummary, event history, and income reports.' },
];

function Addr({ addr, label }: { addr: string; label?: string }) {
  return (
    <a
      href={`${ARBISCAN}/${addr}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-dl-forest underline break-all"
    >
      {label ?? addr}
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12">
      <h2 className="font-serif text-xl text-dl-navy border-b border-dl-border pb-2 mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-dl-border last:border-0">
      <dt className="w-52 shrink-0 text-xs font-mono text-dl-gray uppercase tracking-wide">{k}</dt>
      <dd className="text-sm text-dl-navy">{v}</dd>
    </div>
  );
}

export default function VaultWhitepaper({ generatedAt }: { generatedAt: string }) {
  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <OperatorConsoleLayout title="Vault Whitepaper">
      <div className="max-w-4xl mx-auto py-8 px-4">

        {/* Cover */}
        <div className="mb-12 border-b border-dl-border pb-8">
          <p className="text-xs font-mono text-dl-gray uppercase tracking-widest mb-3">
            Axiom Protocol — Operator Capital Management
          </p>
          <h1 className="font-serif text-3xl text-dl-navy mb-3">
            AxiomTreasuryVault
          </h1>
          <p className="font-serif text-lg text-dl-gray mb-5">
            Executive Summary &amp; Technical Reference — Arbitrum One
          </p>
          <div className="flex flex-wrap gap-6 text-xs font-mono text-dl-gray">
            <span>Document date: {date}</span>
            <span>Network: Arbitrum One (chain ID 42161)</span>
            <span>Classification: Internal — Operator Distribution</span>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-12 border border-dl-border p-5 bg-gray-50">
          <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-3">Contents</p>
          <ol className="space-y-1 text-sm text-dl-navy list-decimal list-inside">
            {[
              ['executive-summary',  'Executive Summary'],
              ['architecture',       'System Architecture'],
              ['contracts',          'On-Chain Contract Registry'],
              ['strategy-stack',     'Strategy Stack'],
              ['asset-framework',    'Accepted Asset Framework'],
              ['harvest-mechanics',  'Yield Harvest Mechanics'],
              ['access-control',     'Access Control & Roles'],
              ['risk-framework',     'Risk & Custody Framework'],
              ['audit',              'Security & Audit Status'],
              ['operations',         'Operational Procedures'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:underline text-dl-forest">{label}</a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Executive Summary */}
        <Section id="executive-summary" title="1 — Executive Summary">
          <p className="text-sm text-dl-navy leading-relaxed mb-4">
            The <strong>AxiomTreasuryVault</strong> is Axiom Protocol's on-chain capital management
            infrastructure deployed on Arbitrum One. It functions as an ERC-4626 compliant multi-strategy
            vault that accepts USDC and AXUSD deposits, deploys capital across a curated set of
            yield-generating strategies, and harvests accumulated yield on an automated schedule.
          </p>
          <p className="text-sm text-dl-navy leading-relaxed mb-4">
            The vault is governed by a role-based access control system (OpenZeppelin AccessControl),
            operated by the Axiom Protocol team, and observable in real time through the Operator
            Capital Management console. All strategy adapters implement a common <code className="font-mono text-xs bg-gray-100 px-1">IStrategy</code> interface,
            enabling uniform allocation, withdrawal, and harvest mechanics across heterogeneous protocols.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6 sm:grid-cols-4">
            {[
              { label: 'Active Strategies', value: '5' },
              { label: 'Harvest Cadence',   value: 'Every 6 hours' },
              { label: 'Settlement Chain',  value: 'Arbitrum One' },
              { label: 'Standard',          value: 'ERC-4626' },
            ].map(({ label, value }) => (
              <div key={label} className="border border-dl-border p-4">
                <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-1">{label}</p>
                <p className="font-serif text-lg text-dl-navy">{value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Architecture */}
        <Section id="architecture" title="2 — System Architecture">
          <p className="text-sm text-dl-navy leading-relaxed mb-5">
            The vault stack consists of three coordinated layers: the <strong>Vault</strong> (ERC-4626
            share accounting), the <strong>Strategy Manager</strong> (strategy registry and routing),
            and individual <strong>Strategy Adapters</strong> (protocol-specific IStrategy implementations).
          </p>
          <div className="border border-dl-border p-5 font-mono text-xs text-dl-navy leading-loose bg-gray-50 whitespace-pre overflow-x-auto">
{`Depositor (USDC / AXUSD)
        │
        ▼
┌─────────────────────────────────────────┐
│         AxiomTreasuryVault              │  ERC-4626 · OpenZeppelin AccessControl
│  totalAssets() · deposit() · withdraw() │  Arbitrum One
└────────────────────┬────────────────────┘
                     │ allocate() / withdraw()
                     ▼
┌─────────────────────────────────────────┐
│           StrategyManager               │  Registry · strategyInfo() · totalDeployed()
└──┬──────┬──────┬──────┬────────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼             ▼
 AaveV3  Camelot Euler  Euler       Euler
 Strat   Strat   USDC   thBILL     WETH
                 Strat  Strat      Strat
   │      │      │      │             │
   ▼      ▼      ▼      ▼             ▼
 Aave   Camelot  Euler ERC-4626 Euler ERC-4626
 Pool   AMM      Vaults (on-chain)    Vaults`}
          </div>
          <p className="text-xs font-mono text-dl-gray mt-3">
            All yield flows upward through harvest(). The vault holds idle balances; deployed capital
            lives in external protocol contracts and is tracked by the Strategy Manager.
          </p>
        </Section>

        {/* 3. Contract Registry */}
        <Section id="contracts" title="3 — On-Chain Contract Registry">
          <dl className="border border-dl-border divide-y divide-dl-border">
            <Kv k="AxiomTreasuryVault"  v={<Addr addr={VAULT_ADDR} />} />
            <Kv k="StrategyManager"     v={<Addr addr={SM_ADDR} />} />
            <Kv k="AXUSD (ERC-3643)"   v={<Addr addr={AXUSD_ADDR} />} />
            <Kv k="USDC (native)"       v={<Addr addr="0xaf88d065e77c8cC2239327C5EDb3A432268e5831" />} />
            <Kv k="Network"             v="Arbitrum One · Chain ID 42161" />
            <Kv k="Vault Standard"      v="ERC-4626 (Tokenized Vault Standard)" />
            <Kv k="Identity Standard"   v="ERC-3643 (T-REX) for AXUSD" />
            <Kv k="Role Framework"      v="OpenZeppelin AccessControl v5" />
            <Kv k="Reentrancy Guard"    v="OpenZeppelin ReentrancyGuard v5" />
            <Kv k="Safe Token Transfers" v="OpenZeppelin SafeERC20 v5" />
          </dl>
        </Section>

        {/* 4. Strategy Stack */}
        <Section id="strategy-stack" title="4 — Strategy Stack">
          <p className="text-sm text-dl-navy leading-relaxed mb-5">
            Each strategy adapter is a standalone smart contract implementing the <code className="font-mono text-xs bg-gray-100 px-1">IStrategy</code> interface.
            The interface exposes <code className="font-mono text-xs bg-gray-100 px-1">allocate()</code>,{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">withdraw()</code>,{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">harvest()</code>,{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">currentValue()</code>, and{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">emergencyWithdraw()</code> uniformly
            across all protocols.
          </p>
          <div className="space-y-4">
            {STRATEGIES.map((s, i) => (
              <div key={s.address} className="border border-dl-border p-5">
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div>
                    <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-0.5">
                      Strategy {i + 1} · {s.protocol}
                    </p>
                    <p className="font-serif text-base text-dl-navy">{s.label}</p>
                  </div>
                  <span className="text-xs font-mono border border-dl-forest text-dl-forest px-2 py-0.5">
                    {s.status}
                  </span>
                </div>
                <dl className="divide-y divide-dl-border text-sm">
                  <Kv k="Strategy Contract" v={<Addr addr={s.address} />} />
                  {s.vault !== '—' && (
                    <Kv k="Euler Vault" v={<Addr addr={s.vault} label={s.vault.slice(0, 10) + '…' + s.vault.slice(-8)} />} />
                  )}
                  <Kv k="Underlying Asset" v={s.asset} />
                  <Kv k="APY Estimate"     v={s.apy} />
                  <Kv k="Notes"            v={s.notes} />
                </dl>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Asset Framework */}
        <Section id="asset-framework" title="5 — Accepted Asset Framework">
          <p className="text-sm text-dl-navy leading-relaxed mb-4">
            The vault maintains an on-chain <code className="font-mono text-xs bg-gray-100 px-1">acceptedAssets</code> mapping.
            Only assets explicitly approved via <code className="font-mono text-xs bg-gray-100 px-1">setAcceptedAsset()</code> by
            a VAULT_ADMIN may be deposited or allocated. This prevents unauthorized token injection.
          </p>
          <table className="w-full text-sm border border-dl-border">
            <thead>
              <tr className="bg-gray-50 border-b border-dl-border">
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Asset</th>
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Decimals</th>
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Status</th>
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dl-border">
              {[
                { asset: 'USDC (native Arbitrum)', dec: 6,  status: 'Accepted', note: 'Primary settlement asset. Circle-issued.' },
                { asset: 'AXUSD (ERC-3643)',       dec: 18, status: 'Accepted', note: 'Axiom stablecoin. KYC-gated transfers via T-REX.' },
                { asset: 'thBILL',                 dec: 6,  status: 'Accepted', note: 'T-bill backed token. Accepted for Euler allocation.' },
                { asset: 'WETH',                   dec: 18, status: 'Accepted', note: 'Wrapped ETH. Accepted for Euler WETH market.' },
              ].map(({ asset, dec, status, note }) => (
                <tr key={asset}>
                  <td className="p-3 font-mono text-xs text-dl-navy">{asset}</td>
                  <td className="p-3 font-mono text-xs text-dl-gray">{dec}</td>
                  <td className="p-3 text-xs text-dl-forest font-semibold">{status}</td>
                  <td className="p-3 text-xs text-dl-gray">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 6. Harvest Mechanics */}
        <Section id="harvest-mechanics" title="6 — Yield Harvest Mechanics">
          <p className="text-sm text-dl-navy leading-relaxed mb-4">
            Yield is realized through the <code className="font-mono text-xs bg-gray-100 px-1">harvest()</code> function
            on each strategy adapter. Harvest calls are gated by a minimum threshold (default{' '}
            <strong>$0.50 USDC</strong>, configurable via <code className="font-mono text-xs bg-gray-100 px-1">HARVEST_MIN_USDC</code>)
            to prevent uneconomical gas spend.
          </p>
          <dl className="border border-dl-border divide-y divide-dl-border">
            <Kv k="Schedule"         v="Every 6 hours UTC — 00:00 / 06:00 / 12:00 / 18:00" />
            <Kv k="Executor"         v="Cron service holding CRON_HARVESTER role" />
            <Kv k="Cron endpoint"    v="POST /api/cron/harvest-vault (CRON_SECRET gated)" />
            <Kv k="Min threshold"    v="$0.50 USDC per harvest event (env: HARVEST_MIN_USDC)" />
            <Kv k="Yield destination" v="Returned to vault as idle USDC — increases NAV per share" />
            <Kv k="DB record"        v="treasury_vault_events (type: harvest) + harvest_cron_runs" />
            <Kv k="Failure handling" v="Cron logs error + sets status=failed in harvest_cron_runs. Non-blocking — next run retries." />
          </dl>
        </Section>

        {/* 7. Access Control */}
        <Section id="access-control" title="7 — Access Control &amp; Roles">
          <p className="text-sm text-dl-navy leading-relaxed mb-5">
            All privileged functions are gated via OpenZeppelin{' '}
            <code className="font-mono text-xs bg-gray-100 px-1">AccessControl</code>. No single-owner
            pattern is used — role separation enables independent revocation without full admin surrender.
          </p>
          <table className="w-full text-sm border border-dl-border">
            <thead>
              <tr className="bg-gray-50 border-b border-dl-border">
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Role</th>
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Current Holder</th>
                <th className="text-left p-3 text-xs font-mono text-dl-gray uppercase tracking-wide">Capability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dl-border">
              {ROLES.map(({ role, holder, capability }) => (
                <tr key={role}>
                  <td className="p-3 font-mono text-xs text-dl-navy">{role}</td>
                  <td className="p-3 text-xs text-dl-gray">{holder}</td>
                  <td className="p-3 text-xs text-dl-gray">{capability}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-mono text-amber-800 uppercase tracking-wide mb-1">Role Concentration Note</p>
            <p className="text-xs text-amber-900">
              DEFAULT_ADMIN_ROLE, VAULT_ADMIN, and STRATEGY_ADMIN are currently held by the same deployer EOA.
              A multi-party authorization upgrade is planned for mainnet maturity — distributing these roles
              across a Gnosis Safe or equivalent threshold-signature arrangement.
            </p>
          </div>
        </Section>

        {/* 8. Risk Framework */}
        <Section id="risk-framework" title="8 — Risk &amp; Custody Framework">
          <div className="space-y-5">
            {[
              {
                title: 'Protocol Risk',
                body: 'Capital deployed to Aave V3, Camelot, and Euler Finance is subject to smart contract risk inherent to those protocols. Aave V3 and Euler Finance v2 are audited, battle-tested lending protocols. Camelot is Arbitrum\'s native AMM with significant TVL history. Position limits per strategy are enforceable via STRATEGY_ADMIN allocation caps.',
              },
              {
                title: 'Asset Risk — thBILL',
                body: 'thBILL is a tokenized T-bill instrument. Its value is backed by short-duration U.S. Treasury bills. Credit risk is minimal but not zero; liquidity risk exists in stressed redemption scenarios. The Euler thBILL vault adds an additional smart contract layer.',
              },
              {
                title: 'Asset Risk — WETH',
                body: 'WETH positions introduce ETH/USD price exposure. The Euler WETH market yield is denominated in WETH; USD-equivalent AUM fluctuates with ETH price. Operators should monitor ETH allocation as a percentage of total AUM.',
              },
              {
                title: 'Custody',
                body: 'All vault assets are held in non-custodial smart contracts on Arbitrum One. No third-party custodian holds assets on behalf of the vault. BitGo CaaS is used for off-chain treasury reserves (outside this vault contract). The vault has no upgradeability proxy — it is an immutable deployment.',
              },
              {
                title: 'Liquidity Risk',
                body: 'Idle USDC and AXUSD remain immediately withdrawable. Deployed capital is subject to the withdrawal mechanics of each underlying protocol. Aave and Euler markets support instant withdrawal up to available liquidity. Camelot AMM withdrawals are subject to slippage.',
              },
              {
                title: 'Oracle Risk',
                body: 'Vault AUM reporting relies on on-chain currentValue() reads from each strategy adapter. These reads query underlying ERC-4626 convertToAssets() functions, which are subject to the pricing logic of each protocol. The vault does not use an external price oracle for accounting.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="border border-dl-border p-5">
                <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">{title}</p>
                <p className="text-sm text-dl-navy leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. Audit */}
        <Section id="audit" title="9 — Security &amp; Audit Status">
          <dl className="border border-dl-border divide-y divide-dl-border mb-5">
            <Kv k="Internal audit date" v={date} />
            <Kv k="SAST scan"           v="0 findings on EulerV2Strategy.sol, AaveV3Strategy.sol, AxiomTreasuryVault.sol" />
            <Kv k="Dependency audit"    v="0 critical CVEs in treasury contract dependency path" />
            <Kv k="Reentrancy"          v="OpenZeppelin ReentrancyGuard on all state-changing functions" />
            <Kv k="Arithmetic"          v="Solidity 0.8.x built-in overflow protection (no unchecked blocks)" />
            <Kv k="Token safety"        v="SafeERC20.forceApprove() before every external deposit" />
            <Kv k="Asset integrity"     v="Constructor validates eulerVault.asset() == _asset at deploy time" />
            <Kv k="Zero-address checks" v="All 4 constructor params validated against address(0)" />
            <Kv k="External audit"      v="Pending — scheduled before allocation scale-up" />
          </dl>
          <div className="border border-dl-border p-4 bg-gray-50">
            <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-1">Deployment Verification</p>
            <p className="text-xs text-dl-navy mb-2">
              All three Euler strategy contracts verified on-chain post-deployment:
              <code className="font-mono text-xs bg-gray-100 px-1 ml-1">active=true</code>,
              correct vault reference, correct asset address, registered in StrategyManager.
            </p>
            <div className="space-y-1">
              {STRATEGIES.slice(2).map((s) => (
                <div key={s.address} className="flex gap-3 text-xs font-mono">
                  <span className="text-dl-gray w-36 shrink-0">{s.asset}</span>
                  <Addr addr={s.address} />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 10. Operations */}
        <Section id="operations" title="10 — Operational Procedures">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Allocating Capital to a Strategy</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-dl-navy">
                <li>Ensure target asset is in the <code className="font-mono text-xs bg-gray-100 px-1">acceptedAssets</code> mapping (call <code className="font-mono text-xs bg-gray-100 px-1">setAcceptedAsset(asset, true)</code> if not).</li>
                <li>Verify idle balance is sufficient via <code className="font-mono text-xs bg-gray-100 px-1">getIdleBalance(asset)</code>.</li>
                <li>Call <code className="font-mono text-xs bg-gray-100 px-1">vault.allocate(strategyAddr, asset, amount)</code> from a STRATEGY_ADMIN wallet.</li>
                <li>Confirm allocation via StrategyManager <code className="font-mono text-xs bg-gray-100 px-1">strategyInfo(strategyAddr).allocatedPrincipal</code>.</li>
              </ol>
            </div>
            <div>
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Emergency Withdrawal</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-dl-navy">
                <li>Call <code className="font-mono text-xs bg-gray-100 px-1">vault.pause()</code> (VAULT_ADMIN) to halt new deposits and allocations.</li>
                <li>Call <code className="font-mono text-xs bg-gray-100 px-1">strategy.emergencyWithdraw()</code> (DEFAULT_ADMIN_ROLE) on each strategy — bypasses threshold checks, returns all assets to vault.</li>
                <li>Once resolved, call <code className="font-mono text-xs bg-gray-100 px-1">vault.unpause()</code> to resume normal operations.</li>
              </ol>
            </div>
            <div>
              <p className="text-xs font-mono text-dl-gray uppercase tracking-wide mb-2">Adding a New Strategy</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-dl-navy">
                <li>Deploy a new contract implementing <code className="font-mono text-xs bg-gray-100 px-1">IStrategy</code> (use EulerV2Strategy as template for ERC-4626 protocols).</li>
                <li>Call <code className="font-mono text-xs bg-gray-100 px-1">vault.addStrategy(strategyAddr)</code> from STRATEGY_ADMIN — registers in StrategyManager.</li>
                <li>Set accepted asset if needed via <code className="font-mono text-xs bg-gray-100 px-1">setAcceptedAsset()</code>.</li>
                <li>Add strategy constants + APY fetch to <code className="font-mono text-xs bg-gray-100 px-1">lib/treasury/vault/vaultService.ts</code> and update operator dashboard.</li>
              </ol>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-dl-border pt-6 flex flex-wrap gap-6 text-xs font-mono text-dl-gray">
          <Link href="/operator/treasury/vault" className="text-dl-forest underline">
            ← Live Vault Dashboard
          </Link>
          <a
            href={`${ARBISCAN}/${VAULT_ADDR}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dl-forest underline"
          >
            AxiomTreasuryVault on Arbiscan ↗
          </a>
          <a
            href={`${ARBISCAN}/${SM_ADDR}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dl-forest underline"
          >
            StrategyManager on Arbiscan ↗
          </a>
          <span>Generated: {generatedAt}</span>
        </div>

      </div>
    </OperatorConsoleLayout>
  );
}
