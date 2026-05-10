export const NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products', isDropdown: true },
  { name: 'Lending Fund', href: '/lending-fund', isDropdown: true },
  { name: 'Capital Program', href: '/pilot', isDropdown: true },
  { name: 'DeFi', href: '/dex', isDropdown: true },
  { name: 'Institutional', href: '/institutional', isDropdown: true },
  { name: 'About', href: '/about', isDropdown: true },
];

export const MOBILE_NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Lending Fund', href: '/lending-fund' },
  { name: 'Capital Program', href: '/pilot' },
  { name: 'DeFi', href: '/dex' },
  { name: 'Institutional', href: '/institutional' },
  { name: 'About', href: '/about' },
];

export const PRODUCTS_DROPDOWN = [
  { name: 'All Products', href: '/products' },
  { name: 'Product Roadmap', href: '/roadmap' },
];

export const LENDING_FUND_DROPDOWN = [
  { name: 'Overview', href: '/lending-fund' },
  { name: 'Invest in Fund', href: '/lending-fund/invest' },
  { name: 'Apply for Loan', href: '/lending-fund/apply' },
];

export const DEFI_DROPDOWN = [
  { name: 'DEX Exchange', href: '/dex' },
  { name: 'Earn Yield', href: '/earn' },
  { name: 'Borrow AXUSD', href: '/borrow' },
  { name: 'AXUSD Stablecoin', href: '/axusd' },
  { name: 'Buy AXM', href: '/buy-axm' },
];

export const PILOT_DROPDOWN = [
  { name: 'Overview', href: '/pilot' },
  { name: 'Investors', href: '/pilot/investors' },
  { name: 'Distributions', href: '/pilot/distributions' },
  { name: 'Reports', href: '/pilot/reports' },
  { name: 'Data Room', href: '/pilot/documents' },
  { name: 'Projections', href: '/pilot/projections' },
  { name: 'Performance', href: '/pilot/performance' },
  { name: 'Audit Trail', href: '/pilot/audit' },
];

export const INSTITUTIONAL_DROPDOWN = [
  { name: 'Observer Dashboard', href: '/observer' },
  { name: 'Capital Bridge', href: '/observer/capital-bridge' },
  { name: 'Node Economy', href: '/observer/node-economy' },
  { name: 'Institutional Overview', href: '/institutional' },
  { name: 'Founder Operations', href: '/founder-ops' },
  { name: 'Operational Playbook', href: '/founder-ops/playbook' },
];

export const COMMUNITY_DROPDOWN = [
  { name: 'Community', href: '/community' },
  { name: 'Community Impact', href: '/impact' },
  { name: 'Transparency', href: '/transparency' },
];

export const ABOUT_DROPDOWN = [
  { name: 'About Axiom Protocol', href: '/about' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Team & Entity', href: '/trust/team' },
  { name: 'FAQ', href: '/faq' },
];

export const MIRDT_DROPDOWN = [
  { name: 'Intelligence Terminal', href: '/mirdt' },
];

export const SENTINEL_DROPDOWN = [
  { name: 'Sentinel Dashboard', href: '/sentinel' },
  { name: 'Sentinel Audit Trail', href: '/sentinel/audit' },
];

export const ADVANCED_DROPDOWN = [
  ...PRODUCTS_DROPDOWN,
  ...LENDING_FUND_DROPDOWN,
  ...PILOT_DROPDOWN,
  ...DEFI_DROPDOWN,
  ...COMMUNITY_DROPDOWN,
  ...INSTITUTIONAL_DROPDOWN,
  ...ABOUT_DROPDOWN,
  ...MIRDT_DROPDOWN,
  ...SENTINEL_DROPDOWN,
];

export const APP_DROPDOWN = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Buy AXM', href: '/buy-axm' },
];

export const ADMIN_DROPDOWN = [];

export const FOOTER_ECOSYSTEM = [
  { name: 'Community', href: '/community' },
  { name: 'Community Impact', href: '/impact' },
  { name: 'Transparency', href: '/transparency' },
];

export const FOOTER_PRODUCTS = [
  { name: 'All Products', href: '/products' },
  { name: 'Lending Fund', href: '/lending-fund' },
  { name: 'Product Roadmap', href: '/roadmap' },
];

export const FOOTER_TOOLS = [
  { name: 'DEX Exchange', href: '/dex' },
  { name: 'Earn Yield', href: '/earn' },
  { name: 'Borrow AXUSD', href: '/borrow' },
  { name: 'AXUSD Stablecoin', href: '/axusd' },
];

export const FOOTER_RESOURCES = [
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Institutional Overview', href: '/institutional' },
  { name: 'Transparency', href: '/transparency' },
  { name: 'FAQ', href: '/faq' },
];

export const FOOTER_COMPANY = [
  { name: 'About Axiom Protocol', href: '/about' },
  { name: 'Partner', href: '/partner' },
  { name: 'Team & Entity', href: '/trust/team' },
  { name: 'Terms of Service', href: '/terms-and-conditions' },
];
