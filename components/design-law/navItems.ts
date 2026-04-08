export interface NavItem {
  href?: string;
  label: string;
  children?: { href: string; label: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/about-us', label: 'About' },
  { href: '/disclosure', label: 'Disclosure' },
  { href: '/infrastructure', label: 'Verify Infrastructure' },
  {
    label: 'Stack',
    children: [
      { href: '/system-map', label: 'System Map' },
      { href: '/axau', label: 'AXAU Reserve' },
      { href: '/axau-early-access', label: 'AXAU Early Access' },
      { href: '/axusd-3643', label: 'AXUSD Settlement Rail' },
      { href: '/dex', label: 'Protocol Exchange' },
      { href: '/banking', label: 'Banking Infrastructure' },
      { href: '/axiom-payment-rails', label: 'Axiom Payment Rails' },
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
      { href: '/solvency', label: 'Solvency' },
      { href: '/execution-framework', label: 'Execution Framework' },
      { href: '/transparency', label: 'Transparency' },
      { href: '/founder-ops', label: 'Founder Ops' },
      { href: '/products', label: 'All Products' },
    ],
  },
  { href: '/contact', label: 'Contact' },
];
