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
    label: "KeyGrow",
    children: [
      { label: "Overview", href: "/keygrow" },
      { label: "Participation Paths", href: "/keygrow?section=paths" },
      { label: "Land Projects", href: "/keygrow?section=projects" },
      { label: "Stewardship Model", href: "/keygrow?section=stewardship" },
      { label: "Get Started", href: "/keygrow?section=get-started" }
    ]
  },
  {
    label: "Landowners",
    children: [
      { label: "Overview", href: "/landowners" },
      { label: "How It Works", href: "/landowners#how-it-works" },
      { label: "Submit Property", href: "/landowners/submit" },
      { label: "FAQ", href: "/landowners/faq" },
      { label: "Apply", href: "/landowners/apply" }
    ]
  },
  {
    label: "Steward Corps",
    children: [
      { label: "Overview", href: "/stewards" },
      { label: "Apply to Join", href: "/stewards/apply" },
      { label: "Activated Land", href: "/stewards/activated-land" },
      { label: "Steward Dashboard", href: "/stewards/dashboard", visibility: 'app' }
    ]
  },
  { label: "Infrastructure", href: "/infrastructure" },
  {
    label: "Community",
    children: [
      { label: "Success Stories", href: "/community" },
      { label: "Community Impact", href: "/impact" },
      { label: "Transparency", href: "/transparency" }
    ]
  },
  {
    label: "About",
    children: [
      { label: "About Us", href: "/about-us" },
      { label: "Origin Story", href: "/origin" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Team", href: "/team" },
      { label: "Contact", href: "/contact" }
    ]
  },
  {
    label: "Tools",
    children: [
      { label: "Treasury", href: "/bank" },
      { label: "SUSU Savings", href: "/susu-start" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "Land Acquisition", href: "/land-acquisition" },
      { label: "Land Pipeline", href: "/admin/land-pipeline", visibility: 'admin' },
      { label: "Governance", href: "/governance" },
      { label: "Tokenomics", href: "/tokenomics" },
      { label: "Staking", href: "/staking" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Launchpad", href: "/launchpad" },
      { label: "Axiom Nodes", href: "/axiom-nodes" },
      { label: "Analytics", href: "/v2-analytics" }
    ]
  },
  {
    label: "Advanced",
    visibility: 'app',
    children: [
      { label: "PMA Trust", href: "/pma" },
      { label: "Yield Vault", href: "/yield-vault" },
      { label: "Credit Builder", href: "/credit-builder" },
      { label: "Rewards", href: "/rewards" },
      { label: "Referrals", href: "/referrals" },
      { label: "Buy AXM", href: "/buy-axm" },
      { label: "Admin Dashboard", href: "/admin/whitelist", visibility: 'admin' }
    ]
  }
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Ecosystem",
    links: [
      { label: "KeyGrow Program", href: "/keygrow" },
      { label: "For Landowners", href: "/landowners" },
      { label: "Submit Property", href: "/landowners/submit" },
      { label: "Steward Corps", href: "/stewards" },
      { label: "Activated Land", href: "/stewards/activated-land" },
      { label: "Infrastructure", href: "/infrastructure" },
      { label: "Community Impact", href: "/impact" }
    ]
  },
  {
    title: "Tools",
    links: [
      { label: "Treasury", href: "/bank" },
      { label: "SUSU Savings", href: "/susu-start" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "Land Acquisition", href: "/land-acquisition" },
      { label: "Land Pipeline", href: "/admin/land-pipeline" },
      { label: "Governance", href: "/governance" },
      { label: "Staking", href: "/staking" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Origin Story", href: "/origin" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Whitepaper", href: "/whitepaper" },
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
