export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href?: string; children?: NavChild[] };

export function withSection(path: string, section?: string): string {
  if (!section) return path;
  const u = new URL(path, "https://example.local");
  u.searchParams.set("section", section);
  return u.pathname + "?" + u.searchParams.toString();
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "KeyGrow",
    children: [
      { label: "Overview", href: "/keygrow" },
      { label: "Participation Paths", href: withSection("/keygrow", "paths") },
      { label: "Land Projects", href: withSection("/keygrow", "projects") },
      { label: "Stewardship Model", href: withSection("/keygrow", "stewardship") },
      { label: "Get Started", href: withSection("/keygrow", "get-started") }
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
    label: "Lending Fund",
    children: [
      { label: "Overview", href: "/lending-fund" },
      { label: "Invest in Fund", href: "/lending-fund/invest" },
      { label: "Apply for Loan", href: "/lending-fund/apply" },
      { label: "Fund Performance", href: "/lending-fund/performance" },
      { label: "DSCR Rental Loans", href: "/dscr/apply" },
      { label: "DSCR Investor Dashboard", href: "/dscr/investor/dashboard" }
    ]
  },
  {
    label: "Steward Corps",
    children: [
      { label: "Overview", href: "/stewards" },
      { label: "Apply to Join", href: "/stewards/apply" },
      { label: "Activated Land", href: "/stewards/activated-land" },
      { label: "Steward Dashboard", href: "/stewards/dashboard" },
      { label: "Holder Benefits", href: "/holders" }
    ]
  },
  {
    label: "Infrastructure",
    children: [
      { label: "Why Logistics", href: withSection("/infrastructure", "why") },
      { label: "Roadmap", href: withSection("/infrastructure", "roadmap") },
      { label: "Future Authority Plan", href: withSection("/infrastructure", "authority") }
    ]
  },
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
      { label: "Philosophy Primer", href: "/philosophy" },
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
      { label: "The Wealth Practice", href: "/wealth-practice" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "Land Crowdfunding", href: "/land-acquisition/portfolio" },
      { label: "LP Incentives", href: "/liquidity" },
      { label: "Land Marketplace", href: "/land" },
      { label: "Land Reclamation Workbook", href: "/workbook" },
      { label: "Land Pipeline", href: "/admin/land-pipeline" },
      { label: "Staking", href: "/staking" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Governance", href: "/governance" },
      { label: "Tokenomics", href: "/tokenomics" },
      { label: "Launchpad", href: "/launchpad" },
      { label: "Axiom Nodes", href: "/axiom-nodes" },
      { label: "Analytics", href: "/v2-analytics" },
      { label: "PMA Trust", href: "/pma" }
    ]
  }
];
