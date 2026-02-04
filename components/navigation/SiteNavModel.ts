export interface NavChild {
  label: string;
  href: string;
  visibility?: 'public' | 'app' | 'admin';
}

export interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
  visibility?: 'public' | 'app' | 'admin';
}

export interface FooterSection {
  title: string;
  links: NavChild[];
}

export const SITE_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Products",
    children: [
      { label: "All Products", href: "/products" },
      { label: "Mortgage Notes", href: "/mortgage-notes" },
      { label: "High Yield Savings", href: "/savings" },
      { label: "Rent Streams", href: "/rent-streams" },
      { label: "Community Land Funds", href: "/land-funds" },
      { label: "AXUSD Credit Lines", href: "/credit-lines" },
      { label: "Treasury Notes", href: "/treasury-notes" },
      { label: "Insurance Pools", href: "/insurance-pools" },
      { label: "Product Roadmap", href: "/roadmap" }
    ]
  },
  {
    label: "Lending Fund",
    children: [
      { label: "Overview", href: "/lending-fund" },
      { label: "Invest in Fund", href: "/lending-fund/invest" },
      { label: "Apply for Loan", href: "/lending-fund/apply" },
      { label: "Fund Performance", href: "/lending-fund/performance" },
      { label: "DSCR Rental Loans", href: "/dscr/apply" },
      { label: "DSCR Investor Dashboard", href: "/dscr/investor/dashboard", visibility: 'app' },
      { label: "Note Pipeline", href: "/notes/pipeline" },
      { label: "Submit Note", href: "/notes/submit" }
    ]
  },
  {
    label: "Land",
    children: [
      { label: "KeyGrow Overview", href: "/keygrow" },
      { label: "For Landowners", href: "/landowners" },
      { label: "Submit Property", href: "/landowners/submit" },
      { label: "Steward Corps", href: "/stewards" },
      { label: "Steward Dashboard", href: "/stewards/dashboard", visibility: 'app' },
      { label: "Activated Land", href: "/stewards/activated-land" },
      { label: "Land Marketplace", href: "/land" },
      { label: "Land Crowdfunding", href: "/land-acquisition/portfolio" },
      { label: "Reclaim Your Land", href: "/reclaim" }
    ]
  },
  {
    label: "DeFi",
    children: [
      { label: "Treasury", href: "/bank" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Earn Yield", href: "/earn" },
      { label: "Borrow AXUSD", href: "/borrow" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "Staking", href: "/staking" },
      { label: "Governance", href: "/governance" },
      { label: "Axiom Nodes", href: "/axiom-nodes" },
      { label: "Launchpad", href: "/launchpad" },
      { label: "Tokenomics", href: "/tokenomics" },
      { label: "Analytics", href: "/v2-analytics" }
    ]
  },
  {
    label: "Institutional",
    children: [
      { label: "Observer Dashboard", href: "/observer" },
      { label: "Capital Bridge", href: "/observer/capital-bridge" },
      { label: "Node Economy", href: "/observer/node-economy" },
      { label: "Treasury View", href: "/observer/treasury" },
      { label: "Risk View", href: "/observer/risk" },
      { label: "Governance View", href: "/observer/governance" },
      { label: "Assets View", href: "/observer/assets" },
      { label: "Reports", href: "/observer/reports" },
      { label: "Operator Portal", href: "/operator", visibility: 'app' },
      { label: "Institutional Overview", href: "/institutional" }
    ]
  },
  {
    label: "Community",
    children: [
      { label: "Success Stories", href: "/community" },
      { label: "Community Impact", href: "/impact" },
      { label: "Transparency", href: "/transparency" },
      { label: "Infrastructure", href: "/infrastructure" }
    ]
  },
  {
    label: "About",
    children: [
      { label: "About Us", href: "/about-us" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Origin Story", href: "/origin" },
      { label: "Philosophy", href: "/philosophy" },
      { label: "Whitepaper", href: "/whitepaper" },
      { label: "Team", href: "/team" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" }
    ]
  },
  {
    label: "App",
    visibility: 'app',
    children: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Wealth Practice", href: "/wealth-practice" },
      { label: "PMA Trust", href: "/pma" },
      { label: "Credit Builder", href: "/credit-builder" },
      { label: "Rewards", href: "/rewards" },
      { label: "Referrals", href: "/referrals" },
      { label: "Yield Vault", href: "/yield-vault" },
      { label: "Buy AXM", href: "/buy-axm" },
      { label: "Holder Benefits", href: "/holders" }
    ]
  },
  {
    label: "Admin",
    visibility: 'admin',
    children: [
      { label: "Admin Dashboard", href: "/admin", visibility: 'admin' },
      { label: "Capital Bridge Admin", href: "/admin/capital-bridge", visibility: 'admin' },
      { label: "Investor Management", href: "/admin/investors", visibility: 'admin' },
      { label: "Whitelist", href: "/admin/whitelist", visibility: 'admin' }
    ]
  }
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Ecosystem",
    links: [
      { label: "KeyGrow Program", href: "/keygrow" },
      { label: "For Landowners", href: "/landowners" },
      { label: "Steward Corps", href: "/stewards" },
      { label: "Activated Land", href: "/stewards/activated-land" },
      { label: "Community Impact", href: "/impact" },
      { label: "Infrastructure", href: "/infrastructure" }
    ]
  },
  {
    title: "Products",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Mortgage Notes", href: "/mortgage-notes" },
      { label: "High Yield Savings", href: "/savings" },
      { label: "Lending Fund", href: "/lending-fund" },
      { label: "DSCR Loans", href: "/dscr/apply" },
      { label: "Product Roadmap", href: "/roadmap" }
    ]
  },
  {
    title: "DeFi Tools",
    links: [
      { label: "Treasury", href: "/bank" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Earn Yield", href: "/earn" },
      { label: "Borrow AXUSD", href: "/borrow" },
      { label: "Staking", href: "/staking" },
      { label: "Governance", href: "/governance" },
      { label: "Tokenomics", href: "/tokenomics" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Origin Story", href: "/origin" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Whitepaper", href: "/whitepaper" },
      { label: "Institutional Overview", href: "/institutional" },
      { label: "Transparency", href: "/transparency" },
      { label: "FAQ", href: "/faq" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Team", href: "/team" },
      { label: "Contact", href: "/contact" },
      { label: "Terms of Service", href: "/terms-and-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" }
    ]
  }
];

export function filterNavByVisibility(items: NavItem[], userRole: 'public' | 'app' | 'admin' = 'public'): NavItem[] {
  return items
    .filter(item => {
      if (!item.visibility) return true;
      if (userRole === 'admin') return true;
      if (userRole === 'app') return item.visibility !== 'admin';
      return item.visibility === 'public';
    })
    .map(item => ({
      ...item,
      children: item.children?.filter(child => {
        if (!child.visibility) return true;
        if (userRole === 'admin') return true;
        if (userRole === 'app') return child.visibility !== 'admin';
        return child.visibility === 'public';
      })
    }));
}
