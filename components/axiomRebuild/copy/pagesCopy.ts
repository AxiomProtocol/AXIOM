export type PageSection = { id: string; title: string; body: string; bullets?: string[] };
export type PageCopy = { title: string; intro: string; sections: PageSection[] };

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
    sections: [
      {
        id: "proof",
        title: "The Farmland Proof",
        body:
          "Before Axiom existed as software, a real community came together, pooled funds, acquired six acres of farmland, and developed it into a working farm with USDA support. Real people. Real land. Real outcomes.\n\nThat experience proved shared ownership works. It also proved most groups fail because coordination breaks down. Axiom exists to turn what already worked into a repeatable system that can scale responsibly."
      },
      {
        id: "why",
        title: "Why This Matters",
        body:
          "Most shared ownership efforts rely on personal trust, informal agreements, scattered records, and manual coordination. That works at small scale until it does not.\n\nAxiom replaces fragile coordination with structure: clear participation paths, transparent records, and systems designed to reduce confusion, conflict, and dependency on personalities."
      }
    ]
  },
  "how-it-works": {
    title: "How It Works",
    intro:
      "Axiom coordinates shared ownership through structure, transparency, and long-term intent. Here is how the model functions.",
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
        ]
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
        ]
      },
      {
        id: "transparency",
        title: "Transparency and Records",
        body:
          "All participation, contributions, and decisions are recorded transparently. This reduces confusion, prevents disputes, and builds trust through verifiable records rather than personal relationships."
      },
      {
        id: "faq",
        title: "Frequently Asked Questions",
        body:
          "Q: Do I need to understand blockchain to participate?\nA: No. The technology exists to make coordination stronger, not more complicated.\n\nQ: How do I get started?\nA: Start by reading the Origin Story, then explore KeyGrow to understand participation paths.\n\nQ: Is this an investment?\nA: Axiom is a coordination platform for shared ownership. Review all disclosures and make informed decisions."
      }
    ]
  },
  infrastructure: {
    title: "Infrastructure",
    intro:
      "Real assets require real operations. Farmland development depends on materials, equipment, timing, and transportation. This is why infrastructure is central to Axiom's mission.",
    sections: [
      {
        id: "why",
        title: "Why Logistics Matters",
        body:
          "Land acquisition is only the beginning. Developing farmland requires moving materials, equipment, and resources. Without reliable transportation infrastructure, development stalls.\n\nThis is why the founder obtained a commercial driver's license, operates as an over-the-road contractor, and is building toward his own authority."
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
        ]
      },
      {
        id: "authority",
        title: "Future Authority Plan",
        body:
          "Operating authority means independence. It means Axiom can support its own farmland development without relying on third-party transportation. This is a commitment to building the full stack of real asset ownership: acquisition, development, and movement."
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
