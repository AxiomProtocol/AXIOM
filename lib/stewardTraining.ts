/**
 * AXIOM STEWARD CORPS TRAINING PROGRAM
 * World-Class Training Curriculum for Land Stewardship
 * 
 * Three Phases: Online → Classroom → Field
 * Three Tiers: Premium ($2,500) | Standard ($1,000) | Scholarship
 * Lifetime Covenant Commitment
 */

export interface TrainingTier {
  id: 'premium' | 'standard' | 'scholarship';
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  benefits: string[];
  axusdReward: number;
  landPriority: 'first' | 'standard' | 'waitlist';
  badge: string;
  color: string;
}

export const trainingTiers: TrainingTier[] = [
  {
    id: 'premium',
    name: 'Premium Steward',
    price: 2500,
    displayPrice: '$2,500',
    description: 'Full certification with maximum benefits and first priority for land stewardship assignments.',
    benefits: [
      'Priority land stewardship assignment',
      '5,000 AXUSD coordination credit upon graduation',
      'Direct mentorship from founding stewards',
      'Lifetime access to steward resources',
      'Premium certification badge',
      'First access to new land opportunities',
      'Exclusive steward council voting rights'
    ],
    axusdReward: 5000,
    landPriority: 'first',
    badge: '🏆',
    color: '#D4AF37'
  },
  {
    id: 'standard',
    name: 'Standard Steward',
    price: 1000,
    displayPrice: '$1,000',
    description: 'Complete certification with full training access and standard stewardship benefits.',
    benefits: [
      'Standard land stewardship assignment',
      '2,000 AXUSD coordination credit upon graduation',
      'Group mentorship sessions',
      'Lifetime access to steward resources',
      'Certified steward badge',
      'Standard access to land opportunities',
      'Community governance participation'
    ],
    axusdReward: 2000,
    landPriority: 'standard',
    badge: '⭐',
    color: '#7B68EE'
  },
  {
    id: 'scholarship',
    name: 'Scholarship Steward',
    price: 250,
    displayPrice: '$250 (Subsidized)',
    description: 'For qualifying applicants who demonstrate genuine need and exceptional commitment to land stewardship.',
    benefits: [
      'Waitlist land stewardship assignment',
      '500 AXUSD coordination credit upon graduation',
      'Group mentorship sessions',
      'Lifetime access to steward resources',
      'Certified steward badge',
      'Waitlist access to land opportunities',
      'Community governance participation'
    ],
    axusdReward: 500,
    landPriority: 'waitlist',
    badge: '🌱',
    color: '#00A389'
  }
];

export interface TrainingPhase {
  id: 'online' | 'classroom' | 'field';
  name: string;
  duration: string;
  description: string;
  icon: string;
  requirements: string[];
}

export const trainingPhases: TrainingPhase[] = [
  {
    id: 'online',
    name: 'Online Foundation',
    duration: '4 Weeks',
    description: 'Self-paced digital curriculum covering Axiom philosophy, land stewardship principles, and coordination protocols.',
    icon: '💻',
    requirements: [
      'Complete all 12 online modules',
      'Pass module assessments (80% minimum)',
      'Submit reflection assignments',
      'Participate in community discussions'
    ]
  },
  {
    id: 'classroom',
    name: 'Classroom Intensive',
    duration: '6 Sessions',
    description: 'Live virtual cohort sessions with mentors featuring case studies, group exercises, and real-world scenarios.',
    icon: '🎓',
    requirements: [
      'Attend 6 live classroom sessions',
      'Complete group project with cohort',
      'Present stewardship plan',
      'Receive mentor approval'
    ]
  },
  {
    id: 'field',
    name: 'Field Training',
    duration: '30 Days',
    description: 'Hands-on practical training at partner properties with experienced stewards supervising your development.',
    icon: '🌾',
    requirements: [
      'Complete 30 field training days',
      'Master all field competencies',
      'Supervisor sign-off on all tasks',
      'Pass final field assessment'
    ]
  }
];

export interface TrainingModuleContent {
  phase: 'online' | 'classroom' | 'field';
  order: number;
  title: string;
  subtitle: string;
  description: string;
  estimatedMinutes: number;
  isRequired: boolean;
  topics: string[];
}

export const trainingCurriculum: TrainingModuleContent[] = [
  // ONLINE PHASE - 12 Modules
  {
    phase: 'online',
    order: 1,
    title: 'The Axiom Vision',
    subtitle: 'Understanding Our Purpose',
    description: 'Introduction to Axiom Protocol and the vision of community-coordinated land stewardship.',
    estimatedMinutes: 45,
    isRequired: true,
    topics: ['Axiom history and mission', 'Community coordination model', 'The role of stewards', 'Long-horizon thinking']
  },
  {
    phase: 'online',
    order: 2,
    title: 'Land Stewardship Principles',
    subtitle: 'Foundation of Responsibility',
    description: 'Core principles of responsible land stewardship and multi-generational thinking.',
    estimatedMinutes: 60,
    isRequired: true,
    topics: ['Stewardship vs. ownership', 'Multi-generational responsibility', 'Land as living system', 'Ecological awareness']
  },
  {
    phase: 'online',
    order: 3,
    title: 'The Steward Charter',
    subtitle: 'Your Responsibilities & Boundaries',
    description: 'Deep dive into the Steward Corps charter, responsibilities, and ethical boundaries.',
    estimatedMinutes: 45,
    isRequired: true,
    topics: ['Charter principles', 'Authority and limits', 'What stewards do', 'What stewards do NOT do']
  },
  {
    phase: 'online',
    order: 4,
    title: 'Community Coordination',
    subtitle: 'Working With People',
    description: 'How to effectively coordinate with community members, resolve conflicts, and facilitate groups.',
    estimatedMinutes: 60,
    isRequired: true,
    topics: ['Group facilitation', 'Conflict resolution', 'Communication protocols', 'Building trust']
  },
  {
    phase: 'online',
    order: 5,
    title: 'Land Assessment Basics',
    subtitle: 'Evaluating Properties',
    description: 'How to evaluate land for stewardship potential, identify opportunities and challenges.',
    estimatedMinutes: 75,
    isRequired: true,
    topics: ['Property evaluation criteria', 'Due diligence checklist', 'Red flags to watch for', 'Opportunity assessment']
  },
  {
    phase: 'online',
    order: 6,
    title: 'Agricultural Foundations',
    subtitle: 'Understanding Food Systems',
    description: 'Basics of sustainable agriculture, food systems, and land productivity.',
    estimatedMinutes: 90,
    isRequired: true,
    topics: ['Sustainable agriculture principles', 'Soil health basics', 'Water management', 'Seasonal planning']
  },
  {
    phase: 'online',
    order: 7,
    title: 'Governance & Decision Making',
    subtitle: 'How Decisions Are Made',
    description: 'Understanding Axiom governance, proposal processes, and community decision-making.',
    estimatedMinutes: 45,
    isRequired: true,
    topics: ['Governance structure', 'Proposal process', 'Voting mechanics', 'Steward voice in governance']
  },
  {
    phase: 'online',
    order: 8,
    title: 'Financial Stewardship',
    subtitle: 'Resource Responsibility',
    description: 'Managing resources, understanding AXUSD, and responsible financial coordination.',
    estimatedMinutes: 60,
    isRequired: true,
    topics: ['AXUSD fundamentals', 'Resource allocation', 'Budget management', 'Transparency requirements']
  },
  {
    phase: 'online',
    order: 9,
    title: 'Regional Coordination',
    subtitle: 'Managing Your Territory',
    description: 'How to coordinate stewardship activities within your assigned region.',
    estimatedMinutes: 45,
    isRequired: true,
    topics: ['Regional structure', 'Coordination protocols', 'Reporting requirements', 'Inter-region collaboration']
  },
  {
    phase: 'online',
    order: 10,
    title: 'Food Distribution Systems',
    subtitle: 'From Land to Community',
    description: 'Managing produce drops, distribution logistics, and community food access.',
    estimatedMinutes: 60,
    isRequired: true,
    topics: ['Distribution logistics', 'Produce handling', 'Community outreach', 'Drop coordination']
  },
  {
    phase: 'online',
    order: 11,
    title: 'Legal & Compliance Awareness',
    subtitle: 'Staying Within Bounds',
    description: 'Understanding legal considerations, PMA structure, and compliance requirements.',
    estimatedMinutes: 45,
    isRequired: true,
    topics: ['PMA membership structure', 'Legal boundaries', 'What to avoid', 'When to escalate']
  },
  {
    phase: 'online',
    order: 12,
    title: 'The Steward Covenant',
    subtitle: 'Lifetime Commitment',
    description: 'Understanding the covenant you will sign and the lifetime commitment you are making.',
    estimatedMinutes: 30,
    isRequired: true,
    topics: ['Covenant meaning', 'Lifetime commitment', 'Rights and responsibilities', 'Steward legacy']
  },
  
  // CLASSROOM PHASE - 6 Sessions
  {
    phase: 'classroom',
    order: 1,
    title: 'Cohort Introduction',
    subtitle: 'Building Your Network',
    description: 'Meet your cohort, establish relationships, and understand your collective journey.',
    estimatedMinutes: 120,
    isRequired: true,
    topics: ['Cohort introductions', 'Team formation', 'Expectations setting', 'Mentor assignments']
  },
  {
    phase: 'classroom',
    order: 2,
    title: 'Case Study: Successful Stewardship',
    subtitle: 'Learning From Excellence',
    description: 'Analyze real examples of successful land stewardship and extract lessons.',
    estimatedMinutes: 120,
    isRequired: true,
    topics: ['Case analysis', 'Success factors', 'Challenge navigation', 'Replicable patterns']
  },
  {
    phase: 'classroom',
    order: 3,
    title: 'Case Study: When Things Go Wrong',
    subtitle: 'Learning From Failure',
    description: 'Study cases where stewardship failed and understand how to prevent similar outcomes.',
    estimatedMinutes: 120,
    isRequired: true,
    topics: ['Failure analysis', 'Warning signs', 'Recovery strategies', 'Prevention tactics']
  },
  {
    phase: 'classroom',
    order: 4,
    title: 'Group Exercise: Land Evaluation',
    subtitle: 'Practical Application',
    description: 'Work with your cohort to evaluate a real land opportunity using learned frameworks.',
    estimatedMinutes: 180,
    isRequired: true,
    topics: ['Team evaluation', 'Framework application', 'Presentation skills', 'Peer feedback']
  },
  {
    phase: 'classroom',
    order: 5,
    title: 'Stewardship Plan Development',
    subtitle: 'Creating Your Blueprint',
    description: 'Develop a comprehensive stewardship plan for a hypothetical property.',
    estimatedMinutes: 180,
    isRequired: true,
    topics: ['Plan structure', 'Goal setting', 'Resource planning', 'Timeline development']
  },
  {
    phase: 'classroom',
    order: 6,
    title: 'Final Presentations & Mentor Review',
    subtitle: 'Demonstrating Readiness',
    description: 'Present your stewardship plan and receive mentor feedback before field training.',
    estimatedMinutes: 180,
    isRequired: true,
    topics: ['Plan presentation', 'Mentor feedback', 'Improvement areas', 'Field preparation']
  },
  
  // FIELD PHASE - 8 Competency Areas
  {
    phase: 'field',
    order: 1,
    title: 'Site Orientation & Safety',
    subtitle: 'Getting Started Right',
    description: 'Learn the field site, safety protocols, and establish working relationships.',
    estimatedMinutes: 480,
    isRequired: true,
    topics: ['Site tour', 'Safety training', 'Equipment introduction', 'Team integration']
  },
  {
    phase: 'field',
    order: 2,
    title: 'Land Assessment Practicum',
    subtitle: 'Hands-On Evaluation',
    description: 'Apply land assessment skills to real properties under supervisor guidance.',
    estimatedMinutes: 960,
    isRequired: true,
    topics: ['Field assessment', 'Documentation', 'Report writing', 'Supervisor review']
  },
  {
    phase: 'field',
    order: 3,
    title: 'Agricultural Operations',
    subtitle: 'Working the Land',
    description: 'Participate in actual agricultural activities from planting to harvest.',
    estimatedMinutes: 1440,
    isRequired: true,
    topics: ['Planting techniques', 'Cultivation practices', 'Harvest procedures', 'Post-harvest handling']
  },
  {
    phase: 'field',
    order: 4,
    title: 'Community Engagement',
    subtitle: 'Connecting With People',
    description: 'Practice community coordination, facilitate meetings, and build relationships.',
    estimatedMinutes: 480,
    isRequired: true,
    topics: ['Meeting facilitation', 'Outreach activities', 'Relationship building', 'Conflict scenarios']
  },
  {
    phase: 'field',
    order: 5,
    title: 'Distribution Operations',
    subtitle: 'Moving Food to People',
    description: 'Participate in produce distribution from logistics to community delivery.',
    estimatedMinutes: 480,
    isRequired: true,
    topics: ['Logistics coordination', 'Distribution execution', 'Quality control', 'Community interaction']
  },
  {
    phase: 'field',
    order: 6,
    title: 'Regional Coordination Practice',
    subtitle: 'Managing Territory',
    description: 'Shadow experienced stewards in regional coordination activities.',
    estimatedMinutes: 480,
    isRequired: true,
    topics: ['Coordination shadowing', 'Reporting practice', 'Problem solving', 'Decision making']
  },
  {
    phase: 'field',
    order: 7,
    title: 'Emergency Response',
    subtitle: 'Handling Crisis',
    description: 'Learn to respond to emergencies, weather events, and unexpected challenges.',
    estimatedMinutes: 240,
    isRequired: true,
    topics: ['Emergency protocols', 'Weather response', 'Crisis communication', 'Resource mobilization']
  },
  {
    phase: 'field',
    order: 8,
    title: 'Final Assessment',
    subtitle: 'Proving Your Readiness',
    description: 'Complete final field assessment demonstrating all competencies learned.',
    estimatedMinutes: 480,
    isRequired: true,
    topics: ['Competency demonstration', 'Supervisor evaluation', 'Feedback integration', 'Graduation preparation']
  }
];

export const stewardCovenant = {
  version: '1.0',
  title: 'The Steward Covenant',
  preamble: `This Covenant represents a lifetime commitment to the principles, responsibilities, and community of the Axiom Steward Corps. By signing, you are not entering an employment contract or making a financial investment. You are accepting a sacred trust to serve the land, the community, and future generations.`,
  
  commitments: [
    {
      id: 'responsibility',
      title: 'I Accept Responsibility',
      text: 'I accept responsibility for coordinating people, resources, and land opportunities with integrity. I understand that this role grants access and trust, not ownership or entitlement.'
    },
    {
      id: 'service',
      title: 'I Commit to Service',
      text: 'I commit to serving the community, the land, and future stewards. My actions will prioritize the long-term wellbeing of the land and community over personal gain.'
    },
    {
      id: 'transparency',
      title: 'I Uphold Transparency',
      text: 'I will be transparent in my actions, decisions, and communications. I will not conceal information that the community has a right to know.'
    },
    {
      id: 'boundaries',
      title: 'I Respect Boundaries',
      text: 'I understand that as a Steward, I do not own land by virtue of my role, control treasury funds, receive profit participation, or act as a legal representative of Axiom Protocol.'
    },
    {
      id: 'continuity',
      title: 'I Embrace Continuity',
      text: 'I recognize that stewardship is multi-generational. I will work to ensure that what I help build can continue long after my time as an active steward.'
    },
    {
      id: 'lifetime',
      title: 'I Make a Lifetime Commitment',
      text: 'I understand this is a lifetime commitment to the Steward Corps. While my level of active participation may change over time, my commitment to the principles and community remains.'
    }
  ],
  
  acknowledgments: [
    'I have completed all phases of Steward Corps training.',
    'I understand the responsibilities and limitations of the Steward role.',
    'I am making this commitment voluntarily and without coercion.',
    'I understand this is not an employment contract or investment agreement.',
    'I accept that violation of this Covenant may result in removal from the Steward Corps.'
  ],
  
  signature: {
    prompt: 'By signing below, I solemnly commit to uphold this Covenant for life:',
    fields: ['Full Legal Name', 'Wallet Address', 'Date']
  }
};

export interface FieldCompetency {
  category: string;
  tasks: string[];
}

export const fieldCompetencies: FieldCompetency[] = [
  {
    category: 'Site Safety',
    tasks: [
      'Demonstrate proper use of safety equipment',
      'Identify and report hazards',
      'Complete emergency response drill',
      'Know location of first aid and emergency supplies'
    ]
  },
  {
    category: 'Land Assessment',
    tasks: [
      'Complete independent property evaluation',
      'Document findings in proper format',
      'Present assessment to supervisor',
      'Identify at least 3 opportunities and 3 challenges'
    ]
  },
  {
    category: 'Agricultural Skills',
    tasks: [
      'Demonstrate proper planting technique',
      'Perform soil health assessment',
      'Execute irrigation system operation',
      'Complete harvest and post-harvest handling'
    ]
  },
  {
    category: 'Community Coordination',
    tasks: [
      'Facilitate a community meeting',
      'Resolve a simulated conflict scenario',
      'Complete successful outreach to new participant',
      'Receive positive feedback from community member'
    ]
  },
  {
    category: 'Distribution Operations',
    tasks: [
      'Coordinate a produce drop event',
      'Manage distribution logistics independently',
      'Handle quality control inspection',
      'Complete distribution reporting'
    ]
  },
  {
    category: 'Regional Coordination',
    tasks: [
      'Submit weekly activity report',
      'Coordinate with adjacent region steward',
      'Escalate issue through proper channels',
      'Participate in regional planning session'
    ]
  },
  {
    category: 'Documentation & Reporting',
    tasks: [
      'Maintain accurate daily logs',
      'Complete all required documentation',
      'Submit reports on schedule',
      'Demonstrate proper record-keeping'
    ]
  },
  {
    category: 'Leadership & Judgment',
    tasks: [
      'Make independent decision under supervision',
      'Demonstrate ethical reasoning in scenario',
      'Receive mentor endorsement',
      'Show initiative on improvement project'
    ]
  }
];

export function calculateTotalTrainingHours(): { online: number; classroom: number; field: number; total: number } {
  const onlineMinutes = trainingCurriculum
    .filter(m => m.phase === 'online')
    .reduce((sum, m) => sum + m.estimatedMinutes, 0);
  
  const classroomMinutes = trainingCurriculum
    .filter(m => m.phase === 'classroom')
    .reduce((sum, m) => sum + m.estimatedMinutes, 0);
  
  const fieldMinutes = trainingCurriculum
    .filter(m => m.phase === 'field')
    .reduce((sum, m) => sum + m.estimatedMinutes, 0);
  
  return {
    online: Math.round(onlineMinutes / 60),
    classroom: Math.round(classroomMinutes / 60),
    field: Math.round(fieldMinutes / 60),
    total: Math.round((onlineMinutes + classroomMinutes + fieldMinutes) / 60)
  };
}

export function getTierById(tierId: string): TrainingTier | undefined {
  return trainingTiers.find(t => t.id === tierId);
}

export function getModulesByPhase(phase: 'online' | 'classroom' | 'field'): TrainingModuleContent[] {
  return trainingCurriculum
    .filter(m => m.phase === phase)
    .sort((a, b) => a.order - b.order);
}
