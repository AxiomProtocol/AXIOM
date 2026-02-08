export const keygrowCopy = {
  overview: {
    id: "overview",
    headline: "KeyGrow: Shared Ownership for Land, Built With Structure",
    body: `KeyGrow is the primary entry point into Axiom's land-first ownership model.

Shared ownership can work, but informal coordination does not scale. Most groups fail because roles are unclear, decisions are undocumented, and accountability breaks under pressure.

KeyGrow replaces confusion with structure. It coordinates people, contributions, and stewardship into a repeatable system for acquiring, developing, and maintaining land together.

This is not speculation. This is coordination.`,
    whatThisIs: [
      "A structured path into shared land ownership",
      "A coordination system for real projects",
      "A long-term stewardship model"
    ],
    whatThisIsNot: [
      "Not a get-rich scheme",
      "Not a token pitch",
      "Not a casual group buy"
    ],
    primaryCta: { label: "Explore Participation Paths", href: "/keygrow?section=paths" },
    secondaryCta: { label: "View Land Projects", href: "/keygrow?section=projects" }
  },

  paths: {
    id: "paths",
    headline: "Participation Paths",
    body: `KeyGrow is built on defined roles, not vague membership.

People contribute in different ways.
Participation Paths clarify expectations upfront so responsibility, accountability, and contribution are aligned from the start.`,
    roles: [
      { name: "Builder Path", description: "labor, planning, operational execution" },
      { name: "Capital Path", description: "financial contribution under defined terms" },
      { name: "Steward Path", description: "documentation, transparency, accountability" },
      { name: "Resource Path", description: "equipment, materials, logistics, specialized skills" },
      { name: "Local Partner Path", description: "on-site coordination and local execution" }
    ],
    supportingCopy: `Each path has defined responsibilities, time expectations, and participation standards.
Movement between paths is documented.`,
    primaryCta: { label: "Choose a Path", href: "/keygrow?section=get-started" }
  },

  projects: {
    id: "projects",
    headline: "Land Projects",
    body: `KeyGrow organizes Land Projects through a visible, milestone-driven pipeline.

Projects are not ideas.
They are coordinated efforts with defined stages, needs, and accountability.

Land Projects may include agricultural land, homesteads, training sites, or logistics-support land.`
  },

  stewardship: {
    id: "stewardship",
    headline: "Stewardship Model",
    body: `Shared ownership only works when stewardship is defined.

KeyGrow treats stewardship as a system, not a promise.

The Stewardship Model governs how land is used, how decisions are made, how records are kept, and how conflicts are resolved.`,
    corePrinciples: [
      "Land-first decision making",
      "Long-term value over short-term extraction",
      "Transparency by default",
      "Documented governance"
    ],
    decisionFramework: [
      { type: "Operational decisions", handler: "delegated roles" },
      { type: "Strategic decisions", handler: "steward review" },
      { type: "Major decisions", handler: "participant vote with notice" }
    ],
    redLines: [
      "No undocumented land use",
      "No private capture of shared assets",
      "No unrecorded spending",
      "No informal side agreements"
    ]
  },

  getStarted: {
    id: "get-started",
    headline: "Get Started",
    body: `KeyGrow is designed for people who value clarity and commitment.

Start small.
Learn first.
Then participate intentionally.`,
    onboardingSteps: [
      "Review the Foundational Land Project proof",
      "Choose a Participation Path",
      "Complete the onboarding checklist",
      "Join the update channel",
      "Attend the orientation call"
    ],
    primaryCta: { label: "Apply for Participation", href: "#" },
    secondaryCta: { label: "Join the Update List", href: "#" }
  },

  proofStrip: {
    caption: "Foundational Land Project — A real group pooled resources, acquired land, developed it with external support, and produced outcomes.",
    disclaimer: "Proof of execution, not a promise of results."
  }
};

export const landProjects = [
  {
    name: "Foundational Land Project",
    region: "Southeastern United States",
    purpose: "Agricultural land and community food production",
    targetSize: "6 acres",
    status: "Operational",
    milestone: "Ongoing stewardship and expansion planning",
    notes: "Proof-of-concept that informed KeyGrow",
    ctaLabel: "View Proof",
    ctaHref: "/origin"
  },
  {
    name: "Midwest Expansion Site",
    region: "Midwest",
    purpose: "Mixed-use agriculture and training land",
    targetSize: "10–20 acres",
    status: "In Evaluation",
    milestone: "Due diligence and shortlist",
    ctaLabel: "Join Updates",
    ctaHref: "/keygrow?section=get-started"
  },
  {
    name: "Logistics Support Parcel",
    region: "Southern Corridor",
    purpose: "Staging and infrastructure support land",
    targetSize: "5–8 acres",
    status: "Planned",
    milestone: "Site identification",
    ctaLabel: "Express Interest",
    ctaHref: "/keygrow?section=get-started"
  }
];
