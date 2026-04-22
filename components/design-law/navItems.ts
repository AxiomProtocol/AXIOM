export interface NavItem {
  href?: string;
  label: string;
  children?: { href: string; label: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/about-us', label: 'About' },
  {
    label: 'Trust',
    children: [
      { href: '/trust', label: 'Trust Stack' },
      { href: '/trust/security', label: 'Security & Live Controls' },
      { href: '/trust/audits', label: 'Audits & Verification' },
      { href: '/trust/no-bridges', label: 'No-Bridges Allow-List' },
      { href: '/governance/bridge-allowlist', label: 'Bridge Allow-List Governance' },
      { href: '/trust/governance', label: 'Governance & Roles' },
      { href: '/trust/loss-coverage-reserve', label: 'Loss Coverage Reserve' },
      { href: '/trust/team', label: 'Team & Entity' },
    ],
  },
  {
    label: 'Disclosure',
    children: [
      { href: '/disclosure', label: 'Institutional Disclosure' },
      { href: '/disclosure/collateral-risk-policy', label: 'Collateral Risk Policy' },
    ],
  },
  { href: '/infrastructure', label: 'Verify Infrastructure' },
  {
    label: 'Stack',
    children: [
      { href: '/system-map', label: 'System Map' },
      { href: '/axau', label: 'AXAU Reserve' },
      { href: '/axau-early-access', label: 'AXAU Early Access' },
      { href: '/axusd-3643', label: 'AXUSD Settlement Rail' },
      { href: '/earn/axusd', label: 'Earn AXUSD (Bootstrap)' },
      { href: '/dex', label: 'Protocol Exchange' },
      { href: '/banking', label: 'Banking Infrastructure' },
      { href: '/onramp', label: 'On / Off Ramp' },
      { href: '/treasury/fund', label: 'Fund with Card' },
      { href: '/axiom-payment-rails', label: 'Axiom Payment Rails' },
      { href: '/dao-payroll', label: 'DAO Payroll' },
      { href: '/rent-collection', label: 'Rent Collection' },
      { href: '/escrow/new', label: 'Escrow' },
      { href: '/depin/denet', label: 'DePIN Network' },
    ],
  },
  {
    label: 'Capital',
    children: [
      { href: '/pilot', label: 'Capital Program' },
      { href: '/lending-fund', label: 'Lending Fund' },
      { href: '/syndication', label: 'Syndication' },
      { href: '/syndication/portal', label: 'Investor Portal' },
      { href: '/secondary', label: 'Secondary Network' },
    ],
  },
  {
    label: 'Intelligence',
    children: [
      { href: '/mirdt', label: 'Regime Intelligence' },
      { href: '/sentinel', label: 'Sentinel' },
      { href: '/observer', label: 'Observer' },
      { href: '/re', label: 'RE Intelligence' },
      { href: '/deal-intelligence', label: 'Deal Intelligence' },
      { href: '/distressed-feed', label: 'Deal Flow' },
      { href: '/property', label: 'Property Analysis' },
    ],
  },
  {
    label: 'Products',
    children: [
      { href: '/my-card', label: 'Nexus Card' },
      { href: '/banking/my-account', label: 'My Nexus Account' },
      { href: '/banking/dao-account', label: 'DAO Operating Account' },
      { href: '/direct-deposit', label: 'Direct Deposit' },
      { href: '/credit', label: 'Credit Line' },
      { href: '/savings', label: 'Savings' },
      { href: '/lending-fund', label: 'Lending Fund' },
      { href: '/syndication', label: 'Syndication' },
    ],
  },
  {
    label: 'Community',
    children: [
      { href: '/wealth-practice', label: 'Wealth Practice' },
      { href: '/land', label: 'Land Pipeline' },
      { href: '/community-credit', label: 'Community Credit' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { href: '/proof-of-execution', label: 'Proof of Execution' },
      { href: '/cdp-wallets', label: 'CDP Wallets' },
      { href: '/solvency', label: 'Solvency' },
      { href: '/execution-framework', label: 'Execution Framework' },
      { href: '/transparency', label: 'Transparency' },
      { href: '/founder-ops', label: 'Founder Ops' },
      { href: '/operations/cap-infra', label: 'Cap-Infra Console' },
      { href: '/products', label: 'All Products' },
    ],
  },
  { href: '/contact', label: 'Contact' },
];
