export interface NavItem {
  href?: string;
  label: string;
  children?: { href: string; label: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/about', label: 'About' },
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
      { href: '/real-assets', label: 'Real Assets (Overview)' },
      { href: '/axau', label: 'AXAU — Gold Reserve' },
      { href: '/commodities', label: 'Commodities Hub' },
      { href: '/commodities/kag', label: 'Silver Reserve (KAG)' },
      { href: '/commodities/insights', label: 'Commodity Insights' },
      { href: '/assets', label: 'Supported Assets' },
      { href: '/assets/dashboard', label: 'Asset Dashboard' },
      { href: '/axau-early-access', label: 'AXAU Early Access' },
      { href: '/axau-buy', label: 'AXAU Mint Terminal' },
      { href: '/axusd-3643', label: 'AXUSD Settlement Rail' },
      { href: '/earn/axusd', label: 'Earn AXUSD (Bootstrap)' },
      { href: '/dex', label: 'Protocol Exchange' },
      { href: '/onramp', label: 'Card Onramp (Buy AXUSD / AXAU)' },
      { href: '/treasury/fund/card', label: 'Fund Treasury (Card → On-Chain)' },
      { href: '/escrow/new', label: 'Escrow' },
      { href: '/depin/denet', label: 'DePIN Network' },
      { href: '/commodity-framework', label: 'Commodity Expansion Framework' },
    ],
  },
  {
    label: 'Capital',
    children: [
      { href: '/capital/protocol-intelligence', label: 'Protocol Intelligence' },
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
      { href: '/nft', label: 'NFT Utility Collection' },
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
  { href: '/partner', label: 'Partner' },
  { href: '/contact', label: 'Contact' },
];
