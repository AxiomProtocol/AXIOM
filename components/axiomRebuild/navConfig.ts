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
      { label: "Farmland Projects", href: withSection("/keygrow", "projects") },
      { label: "Stewardship Model", href: withSection("/keygrow", "stewardship") },
      { label: "Get Started", href: withSection("/keygrow", "get-started") }
    ]
  },
  { label: "Origin", href: "/origin" },
  {
    label: "How It Works",
    children: [
      { label: "The Model", href: withSection("/how-it-works", "model") },
      { label: "Participation Structure", href: withSection("/how-it-works", "participation") },
      { label: "Transparency and Records", href: withSection("/how-it-works", "transparency") },
      { label: "FAQ", href: withSection("/how-it-works", "faq") }
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
    label: "Academy",
    children: [
      { label: "Start Here", href: withSection("/academy", "start") },
      { label: "Guides", href: withSection("/academy", "guides") },
      { label: "Lessons", href: withSection("/academy", "lessons") },
      { label: "Resources", href: withSection("/academy", "resources") }
    ]
  },
  {
    label: "Tools",
    children: [
      { label: "Treasury", href: "/bank" },
      { label: "SUSU Savings", href: "/susu" },
      { label: "Staking", href: "/staking" },
      { label: "DEX Exchange", href: "/dex" },
      { label: "Governance", href: "/governance" },
      { label: "Axiom Nodes", href: "/axiom-nodes" }
    ]
  }
];
