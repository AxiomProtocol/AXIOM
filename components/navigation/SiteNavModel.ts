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
      { label: "Product Roadmap", href: "/roadmap" }
    ]
  },
  {
    label: "Lending Fund",
    children: [
      { label: "Overview", href: "/lending-fund" },
      { label: "Invest in Fund", href: "/lending-fund/invest" },
      { label: "Apply for Loan", href: "/lending-fund/apply" }
    ]
  },
  {
    label: "DeFi",
    children: [
      { label: "DEX Exchange", href: "/dex" },
      { label: "Earn Yield", href: "/earn" },
      { label: "Borrow AXUSD", href: "/borrow" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "Buy AXM", href: "/buy-axm" }
    ]
  },
  {
    label: "Capital Program",
    children: [
      { label: "Overview", href: "/pilot" },
      { label: "Investors", href: "/pilot/investors" },
      { label: "Distributions", href: "/pilot/distributions" },
      { label: "Reports", href: "/pilot/reports" },
      { label: "Data Room", href: "/pilot/documents" },
      { label: "Projections", href: "/pilot/projections" },
      { label: "Performance", href: "/pilot/performance" },
      { label: "Audit Trail", href: "/pilot/audit" }
    ]
  },
  {
    label: "Intelligence Terminal",
    href: "/mirdt"
  },
  {
    label: "Sentinel",
    children: [
      { label: "Dashboard", href: "/sentinel" },
      { label: "Audit Trail", href: "/sentinel/audit" }
    ]
  },
  {
    label: "Institutional",
    children: [
      { label: "Observer Dashboard", href: "/observer" },
      { label: "Capital Bridge", href: "/observer/capital-bridge" },
      { label: "Node Economy", href: "/observer/node-economy" },
      { label: "Institutional Overview", href: "/institutional" }
    ]
  },
  {
    label: "Community",
    children: [
      { label: "Community", href: "/community" },
      { label: "Community Impact", href: "/impact" },
      { label: "Transparency", href: "/transparency" }
    ]
  },
  {
    label: "About",
    children: [
      { label: "About Us", href: "/about-us" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Team", href: "/team" },
      { label: "FAQ", href: "/faq" }
    ]
  },
  {
    label: "App",
    visibility: 'app',
    children: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Buy AXM", href: "/buy-axm" }
    ]
  }
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Ecosystem",
    links: [
      { label: "Community", href: "/community" },
      { label: "Community Impact", href: "/impact" },
      { label: "Transparency", href: "/transparency" }
    ]
  },
  {
    title: "Products",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Lending Fund", href: "/lending-fund" },
      { label: "Product Roadmap", href: "/roadmap" }
    ]
  },
  {
    title: "DeFi Tools",
    links: [
      { label: "DEX Exchange", href: "/dex" },
      { label: "Earn Yield", href: "/earn" },
      { label: "Borrow AXUSD", href: "/borrow" },
      { label: "AXUSD Stablecoin", href: "/axusd" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "How It Works", href: "/how-it-works" },
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
      { label: "Terms of Service", href: "/terms-and-conditions" }
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
