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
    label: "Products",
    children: [
      { label: "All Products", href: "/products" },
      { label: "Mortgage Notes", href: "/mortgage-notes" },
      { label: "High Yield Savings", href: "/savings" },
      { label: "Rent Streams", href: "/rent-streams" },
      { label: "Community Land Funds", href: "/land-funds" },
      { label: "Builder & Farmer Credit", href: "/builder-credit" },
      { label: "AXUSD Credit Lines", href: "/credit-lines" },
      { label: "Insurance Pools", href: "/insurance-pools" },
      { label: "Treasury Notes", href: "/treasury-notes" },
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
      { label: "DSCR Investor Dashboard", href: "/dscr/investor/dashboard" },
      { label: "Note Acquisition Pipeline", href: "/notes/pipeline" },
      { label: "Submit Note", href: "/notes/submit" }
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
      { label: "Treasury Operations", href: "/treasury-ops" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Earn Yield", href: "/earn" },
      { label: "Borrow AXUSD", href: "/borrow" },
      { label: "AXUSD Stablecoin", href: "/axusd" },
      { label: "The Wealth Practice", href: "/wealth-practice" },
      { label: "Land Crowdfunding", href: "/land-acquisition/portfolio" },
      { label: "Land Marketplace", href: "/land" },
      { label: "Reclaim Your Land", href: "/reclaim" },
      { label: "Land Reclamation Workbook", href: "/workbook" },
<<<<<<< HEAD
      { label: "Land Pipeline", href: "/stewards/dashboard/land" },
=======
      { label: "Land Pipeline", href: "/admin/land-pipeline" },
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
      { label: "Capital Bridge Admin", href: "/admin/capital-bridge" },
      { label: "Governance", href: "/governance" },
      { label: "Tokenomics", href: "/tokenomics" },
      { label: "Launchpad", href: "/launchpad" },
      { label: "Axiom Nodes", href: "/axiom-nodes" },
      { label: "Analytics", href: "/v2-analytics" },
      { label: "PMA Trust", href: "/pma" },
      { label: "Observer Dashboard", href: "/observer" }
    ]
  },
  {
    label: "Institutional",
    children: [
      { label: "Observer Dashboard", href: "/observer" },
      { label: "Capital Bridge", href: "/observer/capital-bridge" },
      { label: "Node Economy", href: "/observer/node-economy" },
      { label: "Node Operator Portal", href: "/operator" },
      { label: "Treasury View", href: "/observer/treasury" },
      { label: "Governance View", href: "/observer/governance" },
      { label: "Risk View", href: "/observer/risk" },
      { label: "Assets View", href: "/observer/assets" },
      { label: "Reports", href: "/observer/reports" }
    ]
  }
];
