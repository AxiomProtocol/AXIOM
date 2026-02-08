export const NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products', isDropdown: true },
  { name: 'Lending Fund', href: '/lending-fund', isDropdown: true },
  { name: 'Land', href: '/keygrow', isDropdown: true },
  { name: 'DeFi', href: '/bank', isDropdown: true },
  { name: 'Community', href: '/community', isDropdown: true },
  { name: 'About', href: '/about-us', isDropdown: true },
];

export const MOBILE_NAV_ITEMS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Lending Fund', href: '/lending-fund' },
  { name: 'Land', href: '/keygrow' },
  { name: 'DeFi', href: '/bank' },
  { name: 'Community', href: '/community' },
  { name: 'About', href: '/about-us' },
];

export const PRODUCTS_DROPDOWN = [
  { name: 'All Products', href: '/products' },
  { name: 'Mortgage Notes', href: '/mortgage-notes' },
  { name: 'High Yield Savings', href: '/savings' },
  { name: 'Rent Streams', href: '/rent-streams' },
  { name: 'Community Land Funds', href: '/land-funds' },
  { name: 'AXUSD Credit Lines', href: '/credit-lines' },
  { name: 'Treasury Notes', href: '/treasury-notes' },
  { name: 'Insurance Pools', href: '/insurance-pools' },
  { name: 'Product Roadmap', href: '/roadmap' },
];

export const LENDING_FUND_DROPDOWN = [
  { name: 'Overview', href: '/lending-fund' },
  { name: 'Invest in Fund', href: '/lending-fund/invest' },
  { name: 'Apply for Loan', href: '/lending-fund/apply' },
  { name: 'Fund Performance', href: '/lending-fund/performance' },
  { name: 'DSCR Rental Loans', href: '/dscr/apply' },
  { name: 'Note Pipeline', href: '/notes/pipeline' },
  { name: 'Submit Note', href: '/notes/submit' },
];

export const LAND_DROPDOWN = [
  { name: 'KeyGrow Overview', href: '/keygrow' },
  { name: 'For Landowners', href: '/landowners' },
  { name: 'Submit Property', href: '/landowners/submit' },
  { name: 'Steward Corps', href: '/stewards' },
  { name: 'Activated Land', href: '/stewards/activated-land' },
  { name: 'Land Marketplace', href: '/land' },
  { name: 'Land Crowdfunding', href: '/land-acquisition/portfolio' },
  { name: 'Reclaim Your Land', href: '/reclaim' },
];

export const DEFI_DROPDOWN = [
  { name: 'Treasury', href: '/bank' },
  { name: 'DEX Exchange', href: '/dex' },
  { name: 'Earn Yield', href: '/earn' },
  { name: 'Borrow AXUSD', href: '/borrow' },
  { name: 'AXUSD Stablecoin', href: '/axusd' },
  { name: 'Staking', href: '/staking' },
  { name: 'Governance', href: '/governance' },
  { name: 'Axiom Nodes', href: '/axiom-nodes' },
  { name: 'Launchpad', href: '/launchpad' },
  { name: 'Tokenomics', href: '/tokenomics' },
  { name: 'Analytics', href: '/v2-analytics' },
];

export const COMMUNITY_DROPDOWN = [
  { name: 'Success Stories', href: '/community' },
  { name: 'Community Impact', href: '/impact' },
  { name: 'Transparency', href: '/transparency' },
  { name: 'Infrastructure', href: '/infrastructure' },
];

export const INSTITUTIONAL_DROPDOWN = [
  { name: 'Observer Dashboard', href: '/observer' },
  { name: 'Capital Bridge', href: '/observer/capital-bridge' },
  { name: 'Node Economy', href: '/observer/node-economy' },
  { name: 'Treasury View', href: '/observer/treasury' },
  { name: 'Risk View', href: '/observer/risk' },
  { name: 'Governance View', href: '/observer/governance' },
  { name: 'Assets View', href: '/observer/assets' },
  { name: 'Reports', href: '/observer/reports' },
  { name: 'Operator Portal', href: '/operator' },
  { name: 'Institutional Overview', href: '/institutional' },
  { name: 'Economic Pilot', href: '/pilot' },
];

export const ABOUT_DROPDOWN = [
  { name: 'About Us', href: '/about-us' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Origin Story', href: '/origin' },
  { name: 'Philosophy', href: '/philosophy' },
  { name: 'Whitepaper', href: '/whitepaper' },
  { name: 'Team', href: '/team' },
  { name: 'Contact', href: '/contact' },
  { name: 'FAQ', href: '/faq' },
];

export const ADVANCED_DROPDOWN = [
  ...PRODUCTS_DROPDOWN,
  ...LENDING_FUND_DROPDOWN,
  ...LAND_DROPDOWN,
  ...DEFI_DROPDOWN,
  ...COMMUNITY_DROPDOWN,
  ...INSTITUTIONAL_DROPDOWN,
  ...ABOUT_DROPDOWN,
];

export const APP_DROPDOWN = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Wealth Practice', href: '/wealth-practice' },
  { name: 'PMA Trust', href: '/pma' },
  { name: 'Credit Builder', href: '/credit-builder' },
  { name: 'Rewards', href: '/rewards' },
  { name: 'Referrals', href: '/referrals' },
  { name: 'Yield Vault', href: '/yield-vault' },
  { name: 'Buy AXM', href: '/buy-axm' },
  { name: 'Holder Benefits', href: '/holders' },
  { name: 'Steward Dashboard', href: '/stewards/dashboard' },
  { name: 'DSCR Investor Dashboard', href: '/dscr/investor/dashboard' },
];

export const ADMIN_DROPDOWN = [
  { name: 'Admin Dashboard', href: '/admin' },
  { name: 'Capital Bridge Admin', href: '/admin/capital-bridge' },
  { name: 'Investor Management', href: '/admin/investors' },
  { name: 'Whitelist', href: '/admin/whitelist' },
];

export const FOOTER_ECOSYSTEM = [
  { name: 'KeyGrow Program', href: '/keygrow' },
  { name: 'For Landowners', href: '/landowners' },
  { name: 'Steward Corps', href: '/stewards' },
  { name: 'Activated Land', href: '/stewards/activated-land' },
  { name: 'Community Impact', href: '/impact' },
  { name: 'Infrastructure', href: '/infrastructure' },
];

export const FOOTER_PRODUCTS = [
  { name: 'All Products', href: '/products' },
  { name: 'Mortgage Notes', href: '/mortgage-notes' },
  { name: 'High Yield Savings', href: '/savings' },
  { name: 'Lending Fund', href: '/lending-fund' },
  { name: 'DSCR Loans', href: '/dscr/apply' },
  { name: 'Product Roadmap', href: '/roadmap' },
];

export const FOOTER_TOOLS = [
  { name: 'Treasury', href: '/bank' },
  { name: 'DEX Exchange', href: '/dex' },
  { name: 'Earn Yield', href: '/earn' },
  { name: 'Borrow AXUSD', href: '/borrow' },
  { name: 'Staking', href: '/staking' },
  { name: 'Governance', href: '/governance' },
  { name: 'Tokenomics', href: '/tokenomics' },
];

export const FOOTER_RESOURCES = [
  { name: 'Origin Story', href: '/origin' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Whitepaper', href: '/whitepaper' },
  { name: 'Institutional Overview', href: '/institutional' },
  { name: 'Transparency', href: '/transparency' },
  { name: 'FAQ', href: '/faq' },
];

export const FOOTER_COMPANY = [
  { name: 'About Us', href: '/about-us' },
  { name: 'Team', href: '/team' },
  { name: 'Contact', href: '/contact' },
  { name: 'Terms of Service', href: '/terms-and-conditions' },
  { name: 'Privacy Policy', href: '/privacy-policy' },
];
