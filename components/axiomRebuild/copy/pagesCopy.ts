export type PageSection = { 
  id: string; 
  title: string; 
  body: string; 
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export type PageCopy = { 
  title: string; 
  intro: string; 
  sections: PageSection[];
  hero?: {
    kicker: string;
    headline: string;
    secondary: string;
    subheadline: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    microcopy?: string;
  };
};

export const pagesCopy: Record<string, PageCopy> = {
  keygrow: {
    title: "KeyGrow",
    intro:
      "KeyGrow is the primary entry point for shared farmland ownership participation inside the Axiom ecosystem. Start here to understand the paths, projects, and stewardship model.",
    sections: [
      {
        id: "paths",
        title: "Participation Paths",
        body:
          "KeyGrow supports structured participation paths. Each path clarifies intent, expectations, and how coordination is managed over time.",
        bullets: [
          "Explore participation roles and responsibilities",
          "Align on timelines and stewardship expectations",
          "Track progress with transparent records"
        ]
      },
      {
        id: "projects",
        title: "Farmland Projects",
        body:
          "KeyGrow is designed to coordinate farmland acquisition and development projects over time. Project pages can include location, milestones, needs, and updates."
      },
      {
        id: "stewardship",
        title: "Stewardship Model",
        body:
          "Stewardship protects the land and the participants. KeyGrow centers long-term thinking, responsible management, and clear coordination boundaries.",
        bullets: [
          "Defined stewardship commitments",
          "Transparent updates and accountability",
          "Sustainable development priorities"
        ]
      },
      {
        id: "get-started",
        title: "Get Started",
        body:
          "Start by learning the model, reviewing the origin, and joining the community onboarding path. Participation should be intentional."
      }
    ]
  },
  origin: {
    title: "Origin Story",
    intro:
      "Axiom was not created in a lab. It was born from real-world execution: a community land purchase, USDA-supported development, and the founder's ongoing commitment to building infrastructure for shared ownership.",
    hero: {
      kicker: "Our Story",
      headline: "From Six Acres to a Movement",
      secondary: "Real Land. Real People. Real Proof.",
      subheadline: "Before Axiom was software, it was a community of people who pooled resources, bought farmland, and built something real together.",
      primaryCta: { label: "Explore KeyGrow", href: "/products" },
      secondaryCta: { label: "How It Works", href: "/how-it-works" },
      microcopy: "The origin of Axiom is not a pitch deck. It's a story of execution."
    },
    sections: [
      {
        id: "proof",
        title: "The Farmland Proof",
        body:
          "Before Axiom existed as software, a real community came together, pooled funds, acquired six acres of farmland, and developed it into a working farm with USDA support. Real people. Real land. Real outcomes.\n\nThat experience proved shared ownership works. It also proved most groups fail because coordination breaks down. Axiom exists to turn what already worked into a repeatable system that can scale responsibly.",
        image: "/generated/origin_story_farmland_sunrise.png",
        imageAlt: "Sunrise over farmland representing the origin of Axiom",
        primaryCta: { label: "See KeyGrow", href: "/products" }
      },
      {
        id: "why",
        title: "Why This Matters",
        body:
          "Most shared ownership efforts rely on personal trust, informal agreements, scattered records, and manual coordination. That works at small scale until it does not.\n\nAxiom replaces fragile coordination with structure: clear participation paths, transparent records, and systems designed to reduce confusion, conflict, and dependency on personalities.",
        image: "/generated/seeds_to_wealth_transformation.png",
        imageAlt: "Seeds transforming into growth representing wealth building",
        bullets: [
          "Structure over informal trust",
          "Transparent records over scattered notes",
          "Repeatable systems over personality dependencies"
        ]
      }
    ]
  },
  "how-it-works": {
    title: "How It Works",
    intro:
      "Axiom coordinates shared ownership through structure, transparency, and long-term intent. Here is how the model functions.",
    hero: {
      kicker: "The Model",
      headline: "Structure That Scales",
      secondary: "From Confusion to Coordination",
      subheadline: "Axiom provides the framework for communities to own real assets together without the chaos that usually destroys shared projects.",
      primaryCta: { label: "Start with KeyGrow", href: "/products" },
      secondaryCta: { label: "Read Origin Story", href: "/about-us" },
      microcopy: "Built from real experience, not theoretical frameworks."
    },
    sections: [
      {
        id: "model",
        title: "The Model",
        body:
          "Axiom is built on a simple premise: real asset ownership requires real coordination. The platform provides the structure, records, and mechanisms to make shared ownership work at scale.",
        bullets: [
          "Clear participation pathways",
          "Transparent recordkeeping",
          "Governance mechanisms for decision-making",
          "Long-term stewardship focus"
        ],
        image: "/generated/how_it_works_pathway_visualization.png",
        imageAlt: "Structured pathways visualization"
      },
      {
        id: "participation",
        title: "Participation Structure",
        body:
          "Participation in Axiom is intentional. Each participant understands their role, responsibilities, and how their contribution fits into the larger coordination effort.",
        bullets: [
          "Defined roles and responsibilities",
          "Progress tracking and accountability",
          "Community coordination for land-based projects"
        ],
        image: "/generated/community_overlooking_farmland.png",
        imageAlt: "Community working together toward shared goals"
      },
      {
        id: "transparency",
        title: "Transparency and Records",
        body:
          "All participation, contributions, and decisions are recorded transparently. This reduces confusion, prevents disputes, and builds trust through verifiable records rather than personal relationships.",
        image: "/generated/blockchain_network_3d_visualization.png",
        imageAlt: "Transparent blockchain records visualization"
      },
      {
        id: "faq",
        title: "Frequently Asked Questions",
        body:
          "Q: Do I need to understand blockchain to participate?\nA: No. The technology exists to make coordination stronger, not more complicated.\n\nQ: How do I get started?\nA: Start by reading the Origin Story, then explore KeyGrow to understand participation paths.\n\nQ: Is this an investment?\nA: Axiom is a coordination platform for shared ownership. Review all disclosures and make informed decisions.",
        primaryCta: { label: "Explore KeyGrow", href: "/products" },
        secondaryCta: { label: "View Transparency", href: "/transparency" }
      }
    ]
  },
  infrastructure: {
    title: "Infrastructure",
    intro:
      "Real assets require real operations. Farmland development depends on materials, equipment, timing, and transportation. This is why infrastructure is central to Axiom's mission.",
    hero: {
      kicker: "Real Operations",
      headline: "Building the Full Stack",
      secondary: "Acquisition. Development. Movement.",
      subheadline: "Land ownership is only the beginning. Axiom is building the infrastructure to develop and support real assets at scale.",
      primaryCta: { label: "See the Roadmap", href: "/infrastructure?section=roadmap" },
      secondaryCta: { label: "Why This Matters", href: "/infrastructure?section=why" },
      microcopy: "The founder holds a commercial driver's license and operates as an over-the-road contractor."
    },
    sections: [
      {
        id: "why",
        title: "Why Logistics Matters",
        body:
          "Land acquisition is only the beginning. Developing farmland requires moving materials, equipment, and resources. Without reliable transportation infrastructure, development stalls.\n\nThis is why the founder obtained a commercial driver's license, operates as an over-the-road contractor, and is building toward his own authority.",
        image: "/generated/infrastructure_trucking_highway_scene.png",
        imageAlt: "Commercial truck on highway representing logistics infrastructure"
      },
      {
        id: "roadmap",
        title: "Infrastructure Roadmap",
        body:
          "The infrastructure roadmap includes:\n\n1. Current: CDL operation as an over-the-road contractor\n2. Near-term: Building toward own operating authority\n3. Future: Internalizing transportation as a support layer for KeyGrow farmland development",
        bullets: [
          "Direct experience in logistics operations",
          "Building toward independent authority",
          "Future integration with farmland development"
        ],
        image: "/generated/futuristic_logistics_hub_visualization.png",
        imageAlt: "Futuristic logistics hub representing future infrastructure"
      },
      {
        id: "authority",
        title: "Future Authority Plan",
        body:
          "Operating authority means independence. It means Axiom can support its own farmland development without relying on third-party transportation. This is a commitment to building the full stack of real asset ownership: acquisition, development, and movement.",
        primaryCta: { label: "Join the Journey", href: "/join" },
        secondaryCta: { label: "Read Origin Story", href: "/about-us" }
      }
    ]
  },
  academy: {
    title: "Academy",
    intro:
      "The Axiom Academy provides educational resources for understanding shared ownership, farmland coordination, and the Axiom model. Start here to learn before you participate.",
    sections: [
      {
        id: "start",
        title: "Start Here",
        body:
          "New to Axiom? Begin with these foundational resources:\n\n1. Read the Origin Story to understand where Axiom came from\n2. Explore KeyGrow to see how participation works\n3. Review How It Works to understand the model"
      },
      {
        id: "guides",
        title: "Guides",
        body:
          "Step-by-step guides for participating in the Axiom ecosystem. Each guide covers a specific topic in detail.",
        bullets: [
          "Understanding shared ownership",
          "How KeyGrow participation works",
          "Reading and interpreting records",
          "Governance and decision-making"
        ]
      },
      {
        id: "lessons",
        title: "Lessons",
        body:
          "In-depth lessons covering the principles and practices of shared ownership. These lessons draw from real experience building and coordinating community land projects."
      },
      {
        id: "resources",
        title: "Resources",
        body:
          "Additional resources including documentation, disclosures, and external references for further learning.",
        bullets: [
          "Platform documentation",
          "Legal and compliance disclosures",
          "External resources on shared ownership",
          "Community channels"
        ]
      }
    ]
  },
  learn: {
    title: "Learn",
    intro:
      "Build your knowledge foundation with courses designed for the journey from financial basics to Web3 mastery.",
    hero: {
      kicker: "Education",
      headline: "Knowledge Is Power",
      secondary: "From Basics to Blockchain",
      subheadline: "Free courses covering financial literacy, cryptocurrency, blockchain fundamentals, and the path to homeownership through KeyGrow.",
      primaryCta: { label: "Start Learning", href: "/learn#courses" },
      secondaryCta: { label: "View Academy", href: "/academy" },
      microcopy: "9 courses. Free forever. Learn at your own pace."
    },
    sections: [
      {
        id: "foundations",
        title: "Financial Foundations",
        body:
          "Before diving into Web3, build a strong foundation in personal finance. Learn budgeting, saving, credit basics, and how to build stability for your future.",
        image: "/generated/learning_and_knowledge_visualization.png",
        imageAlt: "Open book with glowing knowledge visualization",
        bullets: [
          "Budgeting and saving fundamentals",
          "Credit building and management",
          "Building financial stability"
        ]
      },
      {
        id: "blockchain",
        title: "Blockchain and Crypto",
        body:
          "Understand what cryptocurrency is, how blockchain works, and how to safely set up and manage your own digital wallet. No prior experience required.",
        image: "/generated/blockchain_network_3d_visualization.png",
        imageAlt: "Blockchain network visualization",
        bullets: [
          "Cryptocurrency basics explained simply",
          "Wallet setup and security best practices",
          "Understanding blockchain technology"
        ]
      },
      {
        id: "keygrow-path",
        title: "The KeyGrow Path",
        body:
          "Our flagship course on the path to homeownership through shared ownership. Learn how KeyGrow works, what participation means, and how to build toward property ownership.",
        image: "/generated/floating_farmland_island_3d.png",
        imageAlt: "Farmland visualization representing property ownership",
        primaryCta: { label: "Explore KeyGrow", href: "/products" }
      }
    ]
  },
  "about-us": {
    title: "About Axiom Protocol",
    intro:
      "Axiom Protocol is a coordination-first economic infrastructure designed to enable disciplined, community-led wealth formation grounded in real-world resources and structured participation.",
    hero: {
      kicker: "About Axiom Protocol",
      headline: "Coordination-First Economic Infrastructure",
      secondary: "Structure Over Speculation",
      subheadline: "Axiom is inspired by principles of group economics, resource stewardship, and long-term structural durability. We prioritize discipline over impulse and coordination over hype.",
      primaryCta: { label: "Read Our Philosophy", href: "/philosophy" },
      secondaryCta: { label: "See Our Origin", href: "/about-us" },
      microcopy: "Built on structure, transparency, and community-led participation."
    },
    sections: [
      {
        id: "mission",
        title: "Our Mission",
        body:
          "Axiom Protocol is a coordination-first economic infrastructure designed to enable disciplined, community-led wealth formation grounded in real-world resources and structured participation.\n\nAxiom is inspired by principles of group economics, resource stewardship, and long-term structural durability. We emphasize structure over speculation and discipline over impulse.",
        image: "/generated/about_us_office_building.png",
        imageAlt: "Modern building representing structured coordination",
        bullets: [
          "Coordination before capitalization",
          "Structure as care made repeatable",
          "Long-term stewardship over short-term gains",
          "Discipline and accountability in all operations"
        ]
      },
      {
        id: "design",
        title: "Design Priorities",
        body:
          "Axiom is designed around clear priorities that guide every decision and feature we build. These are not marketing terms. They are operational requirements.",
        image: "/generated/transparency_glass_architecture.png",
        imageAlt: "Glass architecture representing transparency",
        bullets: [
          "Transparent recordkeeping for all activities",
          "Structured participation paths with clear expectations",
          "Community governance with defined rules and processes",
          "Educational resources before participation",
          "Evidence-based decision making",
          "Privacy by default for sensitive information"
        ]
      },
      {
        id: "participation",
        title: "How Participation Works",
        body:
          "Participation in Axiom is facilitated through education, structured systems, governance, and transparency. We do not promise outcomes. We provide the coordination tools and structure for communities to work together intentionally.\n\nEvery participant is expected to understand the model, engage with the educational materials, and participate with intention rather than impulse.",
        image: "/generated/community_collaboration_around_data.png",
        imageAlt: "Community collaboration representing structured participation",
        primaryCta: { label: "Explore Philosophy", href: "/philosophy" },
        secondaryCta: { label: "View How It Works", href: "/how-it-works" }
      },
      {
        id: "disclaimer",
        title: "Important Notice",
        body:
          "Axiom Protocol provides educational resources and coordination infrastructure. Nothing on this platform constitutes legal, financial, or investment advice. No outcomes are guaranteed. Users are responsible for their own decisions and should consult qualified professionals for specific guidance.\n\nAxiom is inspired by established principles of group economics and cooperative coordination. We do not claim endorsement by or affiliation with any authors, institutions, or organizations.",
        image: "/generated/infrastructure_trucking_highway_scene.png",
        imageAlt: "Infrastructure representing long-term commitment"
      }
    ]
  },
  community: {
    title: "Community",
    intro:
      "Real stories from Axiom members building wealth together through community savings circles and shared ownership.",
    hero: {
      kicker: "Success Stories",
      headline: "Wealth Built Together",
      secondary: "Real Members. Real Results.",
      subheadline: "Join thousands of members saving together, learning together, and building generational wealth through community coordination.",
      primaryCta: { label: "Join the Community", href: "/register" },
      secondaryCta: { label: "Learn About SUSU", href: "/susu" },
      microcopy: "2,500+ active members across 45 cities."
    },
    sections: [
      {
        id: "stories",
        title: "Member Success Stories",
        body:
          "From down payment savings to business expansion, our members are achieving real financial goals through the power of community coordination and mutual accountability.",
        image: "/generated/community_collaboration_around_data.png",
        imageAlt: "Community members collaborating together"
      },
      {
        id: "circles",
        title: "Savings Circles",
        body:
          "SUSU circles modernize the traditional rotating savings model with on-chain transparency and community insurance. Join or start a circle with people who share your goals.",
        image: "/generated/hands_planting_together_unity.png",
        imageAlt: "Hands coming together representing unity and collaboration",
        bullets: [
          "Automated contributions and distributions",
          "Insurance fund for circle protection",
          "Reputation building through participation"
        ],
        primaryCta: { label: "Start a Circle", href: "/susu" }
      },
      {
        id: "impact",
        title: "Community Impact",
        body:
          "Together, our community has saved over $1.2M, formed 150+ savings groups, and reached 45 cities across 8 countries. The movement is growing.",
        image: "/generated/sustainable_impact_farmland_aerial.png",
        imageAlt: "Aerial view of sustainable farmland representing impact",
        primaryCta: { label: "See Full Impact", href: "/impact" }
      }
    ]
  },
  impact: {
    title: "Impact",
    intro:
      "Real-time metrics showing the measurable impact of the Axiom community across savings, ownership, and sustainability.",
    hero: {
      kicker: "Our Progress",
      headline: "Impact You Can Measure",
      secondary: "Transparent. Verifiable. Growing.",
      subheadline: "Every metric is real-time, on-chain verifiable, and represents actual community activity — not projections or promises.",
      primaryCta: { label: "Join the Movement", href: "/register" },
      secondaryCta: { label: "View Transparency", href: "/transparency" },
      microcopy: "Updated in real-time. Verified on-chain."
    },
    sections: [
      {
        id: "metrics",
        title: "Key Metrics",
        body:
          "Track the growth and impact of the Axiom ecosystem through verified metrics including total members, savings accumulated, properties in KeyGrow, and more.",
        image: "/generated/transparency_dashboard_metrics.png",
        imageAlt: "Dashboard showing real-time metrics and data"
      },
      {
        id: "sustainability",
        title: "Sustainability Impact",
        body:
          "From carbon credits to renewable energy infrastructure, Axiom tracks and reports on environmental sustainability as a core operational metric.",
        image: "/generated/sustainable_impact_farmland_aerial.png",
        imageAlt: "Sustainable farmland with solar panels",
        bullets: [
          "Carbon credits generated",
          "Renewable energy integration",
          "Sustainable development priorities"
        ]
      },
      {
        id: "growth",
        title: "Community Growth",
        body:
          "The Axiom community continues to expand across cities and countries. Real growth driven by real outcomes and word-of-mouth from satisfied members.",
        image: "/generated/community_collaboration_around_data.png",
        imageAlt: "Community growth visualization",
        primaryCta: { label: "Join Today", href: "/register" }
      }
    ]
  },
  transparency: {
    title: "Transparency",
    intro:
      "Complete visibility into Axiom's smart contracts, security infrastructure, token allocation, and governance. Trust through verification, not promises.",
    hero: {
      kicker: "Trust Through Verification",
      headline: "Everything On-Chain",
      secondary: "29 Verified Smart Contracts",
      subheadline: "Every contract is verified on Arbiscan. Every transaction is visible. Every decision is recorded. This is what real transparency looks like.",
      primaryCta: { label: "View Contracts", href: "/transparency#contracts" },
      secondaryCta: { label: "See Security", href: "/transparency#security" },
      microcopy: "Verified on Arbitrum One. Audited security standards."
    },
    sections: [
      {
        id: "contracts",
        title: "Smart Contracts",
        body:
          "29 verified smart contracts on Arbitrum One covering identity, treasury, staking, land registry, DePIN nodes, governance, and more. All built on OpenZeppelin security standards.",
        image: "/generated/blockchain_network_3d_visualization.png",
        imageAlt: "Blockchain network representing smart contracts"
      },
      {
        id: "security",
        title: "Security Infrastructure",
        body:
          "Multi-signature wallets, role-based access control, pausable contracts, reentrancy guards, and SafeERC20 transfers. Security is not a feature — it's the foundation.",
        image: "/generated/transparency_glass_architecture.png",
        imageAlt: "Glass architecture representing transparency and security",
        bullets: [
          "OpenZeppelin security standards",
          "Multi-signature treasury wallets",
          "Emergency pause capabilities",
          "Anti-whale protection"
        ]
      },
      {
        id: "governance",
        title: "Governance",
        body:
          "AXM token holders govern the protocol through proposals and voting. veAXM staking provides voting power proportional to lock duration. Community-driven decision making.",
        image: "/generated/how_it_works_pathway_visualization.png",
        imageAlt: "Governance pathway visualization",
        primaryCta: { label: "View Governance", href: "/governance" }
      }
    ]
  }
};
