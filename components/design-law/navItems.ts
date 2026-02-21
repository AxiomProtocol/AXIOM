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
      { href: '/pilot', label: 'Capital Program' },
      { href: '/lending-fund', label: 'Lending Fund' },
      { href: '/dex', label: 'Exchange' },
      { href: '/depin/denet', label: 'DePIN' },
    ],
  },
  {
    label: 'Intelligence',
    children: [
      { href: '/mirdt', label: 'MIRDT' },
      { href: '/sentinel', label: 'Sentinel' },
      { href: '/observer', label: 'Observer' },
      { href: '/re', label: 'RE Intelligence' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { href: '/founder-ops', label: 'Founder Ops' },
      { href: '/founder-ops/proof-of-execution', label: 'Proof of Execution' },
      { href: '/solvency', label: 'Solvency' },
      { href: '/products', label: 'All Products' },
    ],
  },
  { href: '/contact', label: 'Contact' },
];
