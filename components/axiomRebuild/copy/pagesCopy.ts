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
      primaryCta: { label: "Explore KeyGrow", href: "/keygrow" },
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
        primaryCta: { label: "See KeyGrow", href: "/keygrow" }
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
      primaryCta: { label: "Start with KeyGrow", href: "/keygrow" },
      secondaryCta: { label: "Read Origin Story", href: "/origin" },
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
        primaryCta: { label: "Explore KeyGrow", href: "/keygrow" },
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
        primaryCta: { label: "Join the Journey", href: "/contact" },
        secondaryCta: { label: "Read Origin Story", href: "/origin" }
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
  }
};
