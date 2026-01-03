import { buildTo } from "./routeHelpers";

export const navItems = [
  { label: "Home", to: "/" },
  {
    label: "KeyGrow",
    children: [
      { label: "Overview", to: "/keygrow" },
      { label: "Participation Paths", to: buildTo("/keygrow", "paths") },
      { label: "Farmland Projects", to: buildTo("/keygrow", "projects") },
      { label: "Stewardship Model", to: buildTo("/keygrow", "stewardship") },
      { label: "Get Started", to: buildTo("/keygrow", "get-started") }
    ]
  },
  { label: "Origin", to: "/origin" },
  {
    label: "How It Works",
    children: [
      { label: "The Model", to: buildTo("/how-it-works", "model") },
      { label: "Participation Structure", to: buildTo("/how-it-works", "participation") },
      { label: "Transparency and Records", to: buildTo("/how-it-works", "transparency") },
      { label: "FAQ", to: buildTo("/how-it-works", "faq") }
    ]
  },
  {
    label: "Infrastructure",
    children: [
      { label: "Why Logistics", to: buildTo("/infrastructure", "why") },
      { label: "Roadmap", to: buildTo("/infrastructure", "roadmap") },
      { label: "Future Authority Plan", to: buildTo("/infrastructure", "authority") }
    ]
  },
  {
    label: "Academy",
    children: [
      { label: "Start Here", to: buildTo("/academy", "start") },
      { label: "Guides", to: buildTo("/academy", "guides") },
      { label: "Lessons", to: buildTo("/academy", "lessons") },
      { label: "Resources", to: buildTo("/academy", "resources") }
    ]
  },
  {
    label: "Axiom Platform",
    children: [
      { label: "Overview", to: "/platform" },
      { label: "Features", to: buildTo("/platform", "features") },
      { label: "Security Approach", to: buildTo("/platform", "security") },
      { label: "Roadmap", to: buildTo("/platform", "roadmap") }
    ]
  },
  {
    label: "AXM",
    children: [
      { label: "Overview", to: "/axm" },
      { label: "Tokenomics", to: buildTo("/axm", "tokenomics") },
      { label: "Utility", to: buildTo("/axm", "utility") },
      { label: "Disclosures", to: buildTo("/axm", "disclosures") }
    ]
  },
  {
    label: "Governance",
    children: [
      { label: "Overview", to: "/governance" },
      { label: "Proposals", to: buildTo("/governance", "proposals") },
      { label: "Community Standards", to: buildTo("/governance", "standards") }
    ]
  },
  {
    label: "Build",
    children: [
      { label: "Documentation", to: "/docs" },
      { label: "Integrations", to: buildTo("/build", "integrations") },
      { label: "Developer Resources", to: buildTo("/build", "resources") }
    ]
  },
  {
    label: "Advanced",
    children: [
      { label: "Treasury Tools", to: buildTo("/advanced", "treasury") },
      { label: "DePIN Network", to: buildTo("/advanced", "depin") },
      { label: "Node Marketplace", to: buildTo("/advanced", "nodes") },
      { label: "Launchpad", to: buildTo("/advanced", "launchpad") },
      { label: "Grants", to: buildTo("/advanced", "grants") }
    ]
  }
];
