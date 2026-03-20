export interface NavItem {
  href?: string;
  label: string;
  children?: { href: string; label: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/about-us', label: 'About' },
  { href: '/disclosure', label: 'Disclosure' },
  {
    label: 'Community',
    children: [
      { href: '/wealth-practice', label: 'Wealth Practice' },
      { href: '/land', label: 'Land' },
    ],
  },
  {
    label: 'Products',
    children: [
      { href: '/property', label: 'Property Analysis' },
      { href: '/deal-intelligence', label: 'Deal Intelligence' },
      { href: '/distressed-feed', label: 'Deal Flow' },
      { href: '/pilot', label: 'Capital Program' },
      { href: '/lending-fund', label: 'Lending Fund' },
      { href: '/dex', label: 'Exchange' },
      { href: '/axusd-3643', label: 'Unified AXUSD' },
      { href: '/depin/denet', label: 'DePIN' },
      { href: '/banking', label: 'Banking' },
    ],
  },
  {
    label: 'Intelligence',
    children: [
      { href: '/sentinel', label: 'Sentinel' },
      { href: '/observer', label: 'Observer' },
      { href: '/re', label: 'RE Intelligence' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { href: '/founder-ops', label: 'Founder Ops' },
      { href: '/capital', label: 'Capital Accounting' },
      { href: '/solvency', label: 'Solvency' },
      { href: '/syndication', label: 'Syndication' },
      { href: '/syndication/portal', label: 'Investor Portal' },
      { href: '/products', label: 'All Products' },
    ],
  },
  { href: '/contact', label: 'Contact' },
];
