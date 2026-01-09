/**
 * AXIOM STEWARD CORPS TRAINING PROGRAM
 * Comprehensive 12-Month Seasonal Training for Land Stewardship
 * 
 * Structure: Foundations (Month 1) + 4 Seasonal Quarters
 * Three Tiers: Premium ($6,000) | Standard ($3,000) | Scholarship ($750)
 * Lifetime Covenant Commitment after 12-month graduation
 */

export interface TrainingTier {
  id: 'premium' | 'standard' | 'scholarship';
  name: string;
  price: number;
  displayPrice: string;
  monthlyPrice: number;
  quarterlyPrice: number;
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
    price: 6000,
    displayPrice: '$6,000',
    monthlyPrice: 500,
    quarterlyPrice: 1500,
    description: 'Full 12-month certification with maximum benefits, direct mentorship, and first priority for land stewardship assignments.',
    benefits: [
      'Priority land stewardship assignment',
      '12,000 AXUSD coordination credit upon graduation',
      '1-on-1 direct mentorship from founding stewards',
      'Lifetime access to steward resources',
      'Premium certification badge & physical certificate',
      'First access to new land opportunities',
      'Exclusive steward council voting rights',
      'Regional leadership track eligibility',
      'Free annual steward retreat attendance'
    ],
    axusdReward: 12000,
    landPriority: 'first',
    badge: '🏆',
    color: '#D4AF37'
  },
  {
    id: 'standard',
    name: 'Standard Steward',
    price: 3000,
    displayPrice: '$3,000',
    monthlyPrice: 250,
    quarterlyPrice: 750,
    description: 'Complete 12-month certification with full training access, cohort mentorship, and standard stewardship benefits.',
    benefits: [
      'Standard land stewardship assignment',
      '6,000 AXUSD coordination credit upon graduation',
      'Small group mentorship sessions',
      'Lifetime access to steward resources',
      'Certified steward badge',
      'Standard access to land opportunities',
      'Community governance participation',
      'Discounted steward retreat attendance'
    ],
    axusdReward: 6000,
    landPriority: 'standard',
    badge: '⭐',
    color: '#7B68EE'
  },
  {
    id: 'scholarship',
    name: 'Scholarship Steward',
    price: 750,
    displayPrice: '$750 (Subsidized)',
    monthlyPrice: 65,
    quarterlyPrice: 190,
    description: 'For qualifying applicants who demonstrate genuine need and exceptional commitment to land stewardship. Full 12-month program with community support.',
    benefits: [
      'Waitlist land stewardship assignment',
      '1,500 AXUSD coordination credit upon graduation',
      'Group mentorship sessions',
      'Lifetime access to steward resources',
      'Certified steward badge',
      'Waitlist access to land opportunities',
      'Community governance participation',
      'Work-study field placement opportunities'
    ],
    axusdReward: 1500,
    landPriority: 'waitlist',
    badge: '🌱',
    color: '#00A389'
  }
];

export type SeasonId = 'foundations' | 'spring' | 'summer' | 'fall' | 'winter';

export interface TrainingSeason {
  id: SeasonId;
  name: string;
  months: string;
  monthNumbers: number[];
  description: string;
  icon: string;
  color: string;
  focus: string[];
  fieldActivities: string[];
  totalHours: number;
}

export const trainingSeasons: TrainingSeason[] = [
  {
    id: 'foundations',
    name: 'Foundations',
    months: 'Month 1',
    monthNumbers: [1],
    description: 'Intensive orientation covering Axiom philosophy, steward responsibilities, land stewardship principles, and community coordination fundamentals.',
    icon: '📚',
    color: '#6366F1',
    focus: [
      'Axiom vision and mission',
      'Steward Charter deep dive',
      'Land stewardship principles',
      'Community coordination basics',
      'AXUSD and governance overview'
    ],
    fieldActivities: [
      'Site visit to active steward property',
      'Meet your mentor and cohort',
      'Regional orientation tour'
    ],
    totalHours: 40
  },
  {
    id: 'spring',
    name: 'Spring Quarter',
    months: 'Months 2-4',
    monthNumbers: [2, 3, 4],
    description: 'Focus on soil preparation, planting logistics, crop planning, and infrastructure setup. Learn to manage the beginning of the growing season.',
    icon: '🌱',
    color: '#10B981',
    focus: [
      'Soil health assessment and preparation',
      'Seed selection and sourcing',
      'Planting schedules and succession planning',
      'Water system setup and irrigation',
      'Tool and equipment management',
      'Frost protection strategies',
      'Cover crop management'
    ],
    fieldActivities: [
      'Soil testing and amendment application',
      'Bed preparation and direct seeding',
      'Transplant production and hardening',
      'Irrigation system installation',
      'Cold frame and row cover management',
      'Early season pest scouting'
    ],
    totalHours: 100
  },
  {
    id: 'summer',
    name: 'Summer Quarter',
    months: 'Months 5-7',
    monthNumbers: [5, 6, 7],
    description: 'Master crop management, irrigation optimization, pest resilience, and heat stress mitigation. Peak growing season requires daily attention and problem-solving.',
    icon: '☀️',
    color: '#F59E0B',
    focus: [
      'Integrated pest management',
      'Irrigation scheduling and water conservation',
      'Heat stress management',
      'Weed control strategies',
      'Pollinator and beneficial insect support',
      'Crop rotation principles',
      'Succession planting execution'
    ],
    fieldActivities: [
      'Daily crop monitoring and care',
      'Pest identification and treatment',
      'Drip irrigation management',
      'Mulching and weed control',
      'First harvests and quality grading',
      'Community produce distribution'
    ],
    totalHours: 120
  },
  {
    id: 'fall',
    name: 'Fall Quarter',
    months: 'Months 8-10',
    monthNumbers: [8, 9, 10],
    description: 'Learn harvest operations, post-harvest handling, food preservation, storage systems, and market coordination. Prepare the land for winter dormancy.',
    icon: '🍂',
    color: '#DC2626',
    focus: [
      'Harvest timing and techniques',
      'Post-harvest handling and storage',
      'Food preservation methods',
      'Market coordination and distribution',
      'Fall planting for overwintering',
      'Cover crop establishment',
      'End-of-season cleanup'
    ],
    fieldActivities: [
      'Main crop harvesting',
      'Produce sorting, grading, and storage',
      'Canning, drying, and preservation',
      'Community harvest festival coordination',
      'Garlic and perennial planting',
      'Composting and soil building',
      'Equipment maintenance and storage'
    ],
    totalHours: 100
  },
  {
    id: 'winter',
    name: 'Winter Quarter',
    months: 'Months 11-12',
    monthNumbers: [11, 12],
    description: 'Annual review, data analysis, infrastructure planning, seed ordering, and preparation for the coming year. Complete capstone project and covenant signing.',
    icon: '❄️',
    color: '#3B82F6',
    focus: [
      'Season data review and analysis',
      'Financial and resource planning',
      'Seed and supply ordering',
      'Infrastructure improvement planning',
      'Regional coordination meetings',
      'Annual report preparation',
      'Capstone project completion'
    ],
    fieldActivities: [
      'Winter greenhouse management',
      'Infrastructure repairs and building',
      'Tool sharpening and maintenance',
      'Soil testing and amendment planning',
      'Community planning sessions',
      'Mentor evaluation and feedback',
      'Graduation ceremony preparation'
    ],
    totalHours: 60
  }
];

export interface TrainingModule {
  id: string;
  season: SeasonId;
  week: number;
  title: string;
  subtitle: string;
  description: string;
  type: 'lesson' | 'workshop' | 'field' | 'assessment' | 'capstone';
  estimatedMinutes: number;
  topics: string[];
  fieldComponent?: string;
  isRequired: boolean;
}

export const trainingCurriculum: TrainingModule[] = [
  // FOUNDATIONS - Month 1 (Weeks 1-4)
  {
    id: 'foundations-1',
    season: 'foundations',
    week: 1,
    title: 'Welcome to the Steward Corps',
    subtitle: 'Orientation and Vision',
    description: 'Introduction to Axiom Protocol and the sacred responsibility of land stewardship across generations.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['Axiom history and mission', 'What stewardship means', 'Your role in the community', 'Program overview'],
    isRequired: true
  },
  {
    id: 'foundations-2',
    season: 'foundations',
    week: 1,
    title: 'The Steward Charter',
    subtitle: 'Responsibilities and Boundaries',
    description: 'Deep dive into the Steward Corps charter, understanding what stewards do and importantly, what they do NOT do.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Charter principles', 'Authority and limits', 'Ethical boundaries', 'Accountability structures'],
    isRequired: true
  },
  {
    id: 'foundations-3',
    season: 'foundations',
    week: 2,
    title: 'Land Stewardship Philosophy',
    subtitle: 'Multi-Generational Thinking',
    description: 'Understanding land as a living system to be nurtured across generations, not exploited for short-term gain.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['Stewardship vs ownership', 'Regenerative principles', 'Long-horizon thinking', 'Indigenous wisdom'],
    isRequired: true
  },
  {
    id: 'foundations-4',
    season: 'foundations',
    week: 2,
    title: 'Community Coordination',
    subtitle: 'Working With People',
    description: 'Essential skills for group facilitation, conflict resolution, and community building.',
    type: 'workshop',
    estimatedMinutes: 120,
    topics: ['Facilitation techniques', 'Conflict resolution', 'Building trust', 'Communication protocols'],
    isRequired: true
  },
  {
    id: 'foundations-5',
    season: 'foundations',
    week: 3,
    title: 'AXUSD and Financial Stewardship',
    subtitle: 'Resource Responsibility',
    description: 'Understanding AXUSD, treasury operations, and responsible resource coordination.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['AXUSD fundamentals', 'Treasury structure', 'Budget planning', 'Transparency requirements'],
    isRequired: true
  },
  {
    id: 'foundations-6',
    season: 'foundations',
    week: 3,
    title: 'Governance and Decision Making',
    subtitle: 'How Decisions Are Made',
    description: 'Understanding proposal processes, voting mechanics, and the steward voice in governance.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['Governance structure', 'Proposal creation', 'Voting participation', 'Steward council'],
    isRequired: true
  },
  {
    id: 'foundations-7',
    season: 'foundations',
    week: 4,
    title: 'Land Assessment Basics',
    subtitle: 'Evaluating Properties',
    description: 'How to evaluate land for stewardship potential and identify opportunities and challenges.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Property evaluation', 'Due diligence checklist', 'Red flags', 'Opportunity assessment'],
    isRequired: true
  },
  {
    id: 'foundations-8',
    season: 'foundations',
    week: 4,
    title: 'Meet Your Cohort',
    subtitle: 'Site Visit and Orientation',
    description: 'In-person orientation at an active steward property, meet your mentor and cohort members.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Property tour', 'Mentor introduction', 'Cohort bonding', 'Regional context'],
    fieldComponent: 'Active property site visit with mentor',
    isRequired: true
  },
  {
    id: 'foundations-9',
    season: 'foundations',
    week: 4,
    title: 'Foundations Assessment',
    subtitle: 'Knowledge Check',
    description: 'Comprehensive assessment covering all foundation concepts before advancing to seasonal training.',
    type: 'assessment',
    estimatedMinutes: 60,
    topics: ['Written exam', 'Scenario analysis', 'Cohort discussion'],
    isRequired: true
  },

  // SPRING QUARTER - Months 2-4 (Weeks 5-16)
  {
    id: 'spring-1',
    season: 'spring',
    week: 5,
    title: 'Soil Science Fundamentals',
    subtitle: 'Understanding Your Foundation',
    description: 'Deep understanding of soil biology, chemistry, and the foundation of productive land.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Soil biology', 'Nutrient cycles', 'Soil testing', 'Amendment selection'],
    isRequired: true
  },
  {
    id: 'spring-2',
    season: 'spring',
    week: 5,
    title: 'Soil Assessment Field Day',
    subtitle: 'Hands-On Testing',
    description: 'Practical soil testing, interpretation, and amendment application at your training site.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Soil sampling', 'Test interpretation', 'Amendment application', 'Bed preparation'],
    fieldComponent: 'Soil testing and amendment workshop',
    isRequired: true
  },
  {
    id: 'spring-3',
    season: 'spring',
    week: 6,
    title: 'Crop Planning and Rotation',
    subtitle: 'Strategic Growing',
    description: 'Creating comprehensive crop plans that maximize production while building soil health.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Crop families', 'Rotation principles', 'Companion planting', 'Succession planning'],
    isRequired: true
  },
  {
    id: 'spring-4',
    season: 'spring',
    week: 7,
    title: 'Seed Selection and Starting',
    subtitle: 'Beginning the Cycle',
    description: 'Choosing appropriate varieties, seed starting techniques, and nursery management.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Variety selection', 'Germination requirements', 'Indoor starting', 'Hardening off'],
    isRequired: true
  },
  {
    id: 'spring-5',
    season: 'spring',
    week: 8,
    title: 'Transplant Production',
    subtitle: 'Nursery Management',
    description: 'Producing healthy transplants for field planting, timing, and quality control.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Greenhouse management', 'Potting up', 'Fertility for starts', 'Pest prevention'],
    fieldComponent: 'Greenhouse transplant production',
    isRequired: true
  },
  {
    id: 'spring-6',
    season: 'spring',
    week: 9,
    title: 'Water Systems and Irrigation',
    subtitle: 'Essential Infrastructure',
    description: 'Designing and installing water systems for efficient crop production.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Water sources', 'Drip irrigation', 'Overhead systems', 'Water conservation'],
    isRequired: true
  },
  {
    id: 'spring-7',
    season: 'spring',
    week: 10,
    title: 'Irrigation Installation',
    subtitle: 'Hands-On Systems',
    description: 'Practical installation of drip irrigation, timers, and water management tools.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Drip layout', 'Timer programming', 'Pressure regulation', 'Troubleshooting'],
    fieldComponent: 'Irrigation system installation',
    isRequired: true
  },
  {
    id: 'spring-8',
    season: 'spring',
    week: 11,
    title: 'Season Extension Techniques',
    subtitle: 'Working With Weather',
    description: 'Using cold frames, row covers, and other tools to extend the growing season.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Cold frames', 'Row covers', 'Low tunnels', 'Frost protection'],
    isRequired: true
  },
  {
    id: 'spring-9',
    season: 'spring',
    week: 12,
    title: 'Direct Seeding Workshop',
    subtitle: 'Planting in Place',
    description: 'Techniques for direct seeding, bed preparation, and early season planting.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Bed preparation', 'Seeding techniques', 'Depth and spacing', 'Germination care'],
    fieldComponent: 'Direct seeding field workshop',
    isRequired: true
  },
  {
    id: 'spring-10',
    season: 'spring',
    week: 13,
    title: 'Tool and Equipment Management',
    subtitle: 'Your Working Partners',
    description: 'Proper selection, use, and maintenance of hand tools and small equipment.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Tool selection', 'Proper use', 'Maintenance', 'Safety protocols'],
    isRequired: true
  },
  {
    id: 'spring-11',
    season: 'spring',
    week: 14,
    title: 'Early Season Pest Scouting',
    subtitle: 'Prevention First',
    description: 'Identifying common early season pests and implementing preventive strategies.',
    type: 'field',
    estimatedMinutes: 240,
    topics: ['Pest identification', 'Scouting protocols', 'Prevention strategies', 'Record keeping'],
    fieldComponent: 'Field scouting practice',
    isRequired: true
  },
  {
    id: 'spring-12',
    season: 'spring',
    week: 15,
    title: 'Transplanting Day',
    subtitle: 'Field Establishment',
    description: 'Large-scale transplanting operations, timing, and establishment care.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Transplant timing', 'Planting technique', 'Water-in protocols', 'Early care'],
    fieldComponent: 'Full transplanting operation',
    isRequired: true
  },
  {
    id: 'spring-13',
    season: 'spring',
    week: 16,
    title: 'Spring Quarter Review',
    subtitle: 'Assessment and Reflection',
    description: 'Comprehensive review of spring skills with mentor evaluation and feedback.',
    type: 'assessment',
    estimatedMinutes: 180,
    topics: ['Skills demonstration', 'Written assessment', 'Mentor feedback', 'Goal setting'],
    isRequired: true
  },

  // SUMMER QUARTER - Months 5-7 (Weeks 17-28)
  {
    id: 'summer-1',
    season: 'summer',
    week: 17,
    title: 'Integrated Pest Management',
    subtitle: 'Ecosystem Approach',
    description: 'Comprehensive approach to managing pests through prevention, biological controls, and targeted intervention.',
    type: 'lesson',
    estimatedMinutes: 150,
    topics: ['IPM principles', 'Beneficial insects', 'Biological controls', 'Intervention thresholds'],
    isRequired: true
  },
  {
    id: 'summer-2',
    season: 'summer',
    week: 17,
    title: 'Pest Identification Field Lab',
    subtitle: 'Know Your Challenges',
    description: 'Hands-on identification of common pests, their life cycles, and damage patterns.',
    type: 'field',
    estimatedMinutes: 240,
    topics: ['Insect identification', 'Disease recognition', 'Damage assessment', 'Documentation'],
    fieldComponent: 'Field pest identification walk',
    isRequired: true
  },
  {
    id: 'summer-3',
    season: 'summer',
    week: 18,
    title: 'Heat Stress Management',
    subtitle: 'Protecting Crops in Summer',
    description: 'Strategies for protecting crops during heat waves and extended hot periods.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['Heat stress signs', 'Shade strategies', 'Watering adjustments', 'Variety selection'],
    isRequired: true
  },
  {
    id: 'summer-4',
    season: 'summer',
    week: 19,
    title: 'Advanced Irrigation Management',
    subtitle: 'Water Wisdom',
    description: 'Optimizing water use, scheduling, and conservation during peak demand.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Scheduling techniques', 'Soil moisture monitoring', 'Deficit irrigation', 'Conservation'],
    isRequired: true
  },
  {
    id: 'summer-5',
    season: 'summer',
    week: 20,
    title: 'Weed Management Systems',
    subtitle: 'Staying Ahead',
    description: 'Comprehensive weed control strategies including mechanical, mulching, and cultivation.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Weed biology', 'Mechanical control', 'Mulching strategies', 'Cultivation timing'],
    isRequired: true
  },
  {
    id: 'summer-6',
    season: 'summer',
    week: 21,
    title: 'Cultivation and Weeding Day',
    subtitle: 'Hands-On Practice',
    description: 'Full day of cultivation techniques, wheel hoe use, and hand weeding strategies.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Wheel hoe technique', 'Hand weeding', 'Timing strategies', 'Record keeping'],
    fieldComponent: 'Cultivation practice day',
    isRequired: true
  },
  {
    id: 'summer-7',
    season: 'summer',
    week: 22,
    title: 'Pollinator and Beneficial Habitat',
    subtitle: 'Supporting the Ecosystem',
    description: 'Creating and maintaining habitat for pollinators and beneficial insects.',
    type: 'lesson',
    estimatedMinutes: 90,
    topics: ['Pollinator needs', 'Habitat creation', 'Native plantings', 'Beneficial corridors'],
    isRequired: true
  },
  {
    id: 'summer-8',
    season: 'summer',
    week: 23,
    title: 'First Harvest Operations',
    subtitle: 'The Reward Begins',
    description: 'Proper harvesting techniques, timing, and initial post-harvest handling.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Harvest timing', 'Cutting techniques', 'Field handling', 'Quality grading'],
    fieldComponent: 'Harvest operations practice',
    isRequired: true
  },
  {
    id: 'summer-9',
    season: 'summer',
    week: 24,
    title: 'Produce Distribution Basics',
    subtitle: 'From Field to Community',
    description: 'Organizing community produce drops, packing, and distribution logistics.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Distribution planning', 'Packing techniques', 'Food safety', 'Community coordination'],
    isRequired: true
  },
  {
    id: 'summer-10',
    season: 'summer',
    week: 25,
    title: 'Community Produce Drop',
    subtitle: 'Serving the Community',
    description: 'Lead or assist with a full community produce distribution event.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Event setup', 'Distribution management', 'Community interaction', 'Cleanup'],
    fieldComponent: 'Community produce distribution',
    isRequired: true
  },
  {
    id: 'summer-11',
    season: 'summer',
    week: 26,
    title: 'Succession Planting Execution',
    subtitle: 'Continuous Production',
    description: 'Planning and executing succession plantings for continuous harvest.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Planting schedules', 'Bed turnover', 'Quick crops', 'Fall planning'],
    fieldComponent: 'Succession planting day',
    isRequired: true
  },
  {
    id: 'summer-12',
    season: 'summer',
    week: 27,
    title: 'Daily Operations Management',
    subtitle: 'Running the Show',
    description: 'Managing daily operations, crew coordination, and task prioritization during peak season.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Daily planning', 'Crew management', 'Task prioritization', 'Problem solving'],
    isRequired: true
  },
  {
    id: 'summer-13',
    season: 'summer',
    week: 28,
    title: 'Summer Quarter Review',
    subtitle: 'Assessment and Celebration',
    description: 'Review of summer accomplishments with skills assessment and cohort celebration.',
    type: 'assessment',
    estimatedMinutes: 240,
    topics: ['Skills demonstration', 'Harvest evaluation', 'Mentor assessment', 'Mid-year reflection'],
    isRequired: true
  },

  // FALL QUARTER - Months 8-10 (Weeks 29-40)
  {
    id: 'fall-1',
    season: 'fall',
    week: 29,
    title: 'Harvest Operations Excellence',
    subtitle: 'Peak Production',
    description: 'Managing high-volume harvest operations with quality and efficiency.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Volume management', 'Quality standards', 'Efficiency techniques', 'Team coordination'],
    isRequired: true
  },
  {
    id: 'fall-2',
    season: 'fall',
    week: 29,
    title: 'Main Season Harvest',
    subtitle: 'Full Harvest Operations',
    description: 'Lead harvest operations for main season crops with quality grading.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Multi-crop harvest', 'Quality grading', 'Pack out', 'Storage preparation'],
    fieldComponent: 'Full harvest operations day',
    isRequired: true
  },
  {
    id: 'fall-3',
    season: 'fall',
    week: 30,
    title: 'Post-Harvest Handling',
    subtitle: 'Maintaining Quality',
    description: 'Proper washing, cooling, and preparation of produce for storage or distribution.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Washing stations', 'Cooling methods', 'Packing standards', 'Food safety'],
    isRequired: true
  },
  {
    id: 'fall-4',
    season: 'fall',
    week: 31,
    title: 'Root Cellar and Storage',
    subtitle: 'Keeping the Harvest',
    description: 'Storage techniques for long-term preservation of roots, squash, and other storage crops.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Storage conditions', 'Curing techniques', 'Root cellar management', 'Quality monitoring'],
    isRequired: true
  },
  {
    id: 'fall-5',
    season: 'fall',
    week: 32,
    title: 'Storage Crop Processing',
    subtitle: 'Preparing for Winter',
    description: 'Curing, sorting, and storing crops for winter distribution.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Squash curing', 'Root storage', 'Onion drying', 'Quality selection'],
    fieldComponent: 'Storage crop processing day',
    isRequired: true
  },
  {
    id: 'fall-6',
    season: 'fall',
    week: 33,
    title: 'Food Preservation Methods',
    subtitle: 'Traditional Skills',
    description: 'Canning, drying, fermenting, and other preservation techniques for community food security.',
    type: 'workshop',
    estimatedMinutes: 240,
    topics: ['Water bath canning', 'Dehydration', 'Fermentation basics', 'Freezing techniques'],
    isRequired: true
  },
  {
    id: 'fall-7',
    season: 'fall',
    week: 34,
    title: 'Community Preservation Day',
    subtitle: 'Working Together',
    description: 'Organize and lead a community food preservation event.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Event organization', 'Teaching preservation', 'Safety protocols', 'Community building'],
    fieldComponent: 'Community canning and preservation',
    isRequired: true
  },
  {
    id: 'fall-8',
    season: 'fall',
    week: 35,
    title: 'Fall Planting for Spring',
    subtitle: 'Thinking Ahead',
    description: 'Planting garlic, perennials, and overwintering crops for next season.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Garlic planting', 'Perennial establishment', 'Overwintering crops', 'Mulching'],
    fieldComponent: 'Fall planting operations',
    isRequired: true
  },
  {
    id: 'fall-9',
    season: 'fall',
    week: 36,
    title: 'Cover Crop Establishment',
    subtitle: 'Protecting the Soil',
    description: 'Selecting and establishing cover crops for soil protection and building.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Cover crop selection', 'Seeding rates', 'Establishment timing', 'Termination planning'],
    isRequired: true
  },
  {
    id: 'fall-10',
    season: 'fall',
    week: 37,
    title: 'Cover Crop Seeding',
    subtitle: 'Soil Protection',
    description: 'Large-scale cover crop seeding and establishment operations.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Seeding techniques', 'Equipment use', 'Irrigation for establishment', 'Record keeping'],
    fieldComponent: 'Cover crop seeding day',
    isRequired: true
  },
  {
    id: 'fall-11',
    season: 'fall',
    week: 38,
    title: 'Harvest Festival Planning',
    subtitle: 'Celebrating the Season',
    description: 'Planning and executing a community harvest celebration.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Event planning', 'Community engagement', 'Food coordination', 'Gratitude practices'],
    isRequired: true
  },
  {
    id: 'fall-12',
    season: 'fall',
    week: 39,
    title: 'End of Season Cleanup',
    subtitle: 'Closing Down',
    description: 'Proper field cleanup, composting, and preparation for winter dormancy.',
    type: 'field',
    estimatedMinutes: 480,
    topics: ['Field clearing', 'Composting', 'Infrastructure storage', 'Tool maintenance'],
    fieldComponent: 'End of season cleanup day',
    isRequired: true
  },
  {
    id: 'fall-13',
    season: 'fall',
    week: 40,
    title: 'Fall Quarter Review',
    subtitle: 'Assessment and Planning',
    description: 'Comprehensive fall review with focus on harvest metrics and winter planning.',
    type: 'assessment',
    estimatedMinutes: 180,
    topics: ['Harvest totals', 'Skills assessment', 'Mentor evaluation', 'Winter planning'],
    isRequired: true
  },

  // WINTER QUARTER - Months 11-12 (Weeks 41-52)
  {
    id: 'winter-1',
    season: 'winter',
    week: 41,
    title: 'Season Data Analysis',
    subtitle: 'Learning from Numbers',
    description: 'Analyzing production data, tracking metrics, and identifying improvements.',
    type: 'lesson',
    estimatedMinutes: 180,
    topics: ['Data collection', 'Yield analysis', 'Cost tracking', 'Efficiency metrics'],
    isRequired: true
  },
  {
    id: 'winter-2',
    season: 'winter',
    week: 42,
    title: 'Annual Planning Workshop',
    subtitle: 'Designing Next Year',
    description: 'Comprehensive planning for the coming season based on lessons learned.',
    type: 'workshop',
    estimatedMinutes: 240,
    topics: ['Crop planning', 'Infrastructure needs', 'Resource budgeting', 'Goal setting'],
    isRequired: true
  },
  {
    id: 'winter-3',
    season: 'winter',
    week: 43,
    title: 'Seed and Supply Ordering',
    subtitle: 'Preparation is Key',
    description: 'Strategic ordering of seeds, supplies, and materials for the coming year.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Seed selection', 'Supplier relationships', 'Bulk ordering', 'Budget management'],
    isRequired: true
  },
  {
    id: 'winter-4',
    season: 'winter',
    week: 44,
    title: 'Infrastructure Assessment',
    subtitle: 'Building Better',
    description: 'Evaluating infrastructure needs and planning improvements.',
    type: 'lesson',
    estimatedMinutes: 120,
    topics: ['Infrastructure audit', 'Improvement priorities', 'Cost estimation', 'Project planning'],
    isRequired: true
  },
  {
    id: 'winter-5',
    season: 'winter',
    week: 45,
    title: 'Winter Greenhouse Operations',
    subtitle: 'Year-Round Production',
    description: 'Managing greenhouse production during winter months.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Heating systems', 'Light management', 'Winter crops', 'Pest control'],
    fieldComponent: 'Winter greenhouse management',
    isRequired: true
  },
  {
    id: 'winter-6',
    season: 'winter',
    week: 46,
    title: 'Tool and Equipment Maintenance',
    subtitle: 'Caring for Your Partners',
    description: 'Comprehensive maintenance, sharpening, and repair of tools and equipment.',
    type: 'field',
    estimatedMinutes: 360,
    topics: ['Tool sharpening', 'Equipment repair', 'Preventive maintenance', 'Inventory management'],
    fieldComponent: 'Tool maintenance workshop',
    isRequired: true
  },
  {
    id: 'winter-7',
    season: 'winter',
    week: 47,
    title: 'Regional Coordination Meeting',
    subtitle: 'Building Networks',
    description: 'Participating in regional steward coordination and planning sessions.',
    type: 'workshop',
    estimatedMinutes: 240,
    topics: ['Regional updates', 'Collaborative planning', 'Resource sharing', 'Network building'],
    isRequired: true
  },
  {
    id: 'winter-8',
    season: 'winter',
    week: 48,
    title: 'Annual Report Preparation',
    subtitle: 'Documenting Impact',
    description: 'Creating comprehensive annual reports on stewardship activities and outcomes.',
    type: 'workshop',
    estimatedMinutes: 180,
    topics: ['Report structure', 'Data presentation', 'Narrative writing', 'Impact documentation'],
    isRequired: true
  },
  {
    id: 'winter-9',
    season: 'winter',
    week: 49,
    title: 'Capstone Project Work',
    subtitle: 'Your Contribution',
    description: 'Dedicated time for completing your capstone stewardship project.',
    type: 'capstone',
    estimatedMinutes: 480,
    topics: ['Project development', 'Mentor guidance', 'Community benefit', 'Documentation'],
    isRequired: true
  },
  {
    id: 'winter-10',
    season: 'winter',
    week: 50,
    title: 'Capstone Presentation',
    subtitle: 'Sharing Your Work',
    description: 'Present your capstone project to mentors, cohort, and community members.',
    type: 'capstone',
    estimatedMinutes: 120,
    topics: ['Presentation skills', 'Project defense', 'Community feedback', 'Celebration'],
    isRequired: true
  },
  {
    id: 'winter-11',
    season: 'winter',
    week: 51,
    title: 'Final Assessment',
    subtitle: 'Demonstrating Mastery',
    description: 'Comprehensive final assessment covering all four seasons of training.',
    type: 'assessment',
    estimatedMinutes: 240,
    topics: ['Written comprehensive', 'Skills demonstration', 'Mentor evaluation', 'Cohort feedback'],
    isRequired: true
  },
  {
    id: 'winter-12',
    season: 'winter',
    week: 52,
    title: 'Graduation Ceremony',
    subtitle: 'Covenant Signing',
    description: 'Formal graduation ceremony with Steward Covenant signing and community celebration.',
    type: 'capstone',
    estimatedMinutes: 240,
    topics: ['Covenant review', 'Signing ceremony', 'Certificate presentation', 'Celebration'],
    isRequired: true
  }
];

export interface SeasonalMilestone {
  id: string;
  season: SeasonId;
  week: number;
  title: string;
  description: string;
  requirements: string[];
  icon: string;
}

export const seasonalMilestones: SeasonalMilestone[] = [
  {
    id: 'milestone-foundations',
    season: 'foundations',
    week: 4,
    title: 'Foundations Complete',
    description: 'Successfully completed the foundations orientation with passing assessment.',
    requirements: ['Complete all foundation modules', 'Pass foundations assessment (80%+)', 'Complete site visit', 'Meet mentor'],
    icon: '📚'
  },
  {
    id: 'milestone-spring',
    season: 'spring',
    week: 16,
    title: 'Spring Quarter Complete',
    description: 'Demonstrated competency in soil preparation, planting, and early season management.',
    requirements: ['Complete all spring modules', 'Pass spring assessment', 'Complete transplanting operations', 'Mentor sign-off'],
    icon: '🌱'
  },
  {
    id: 'milestone-summer',
    season: 'summer',
    week: 28,
    title: 'Summer Quarter Complete',
    description: 'Proven ability to manage peak season operations, pest management, and community distribution.',
    requirements: ['Complete all summer modules', 'Pass summer assessment', 'Lead produce distribution', 'Mentor sign-off'],
    icon: '☀️'
  },
  {
    id: 'milestone-fall',
    season: 'fall',
    week: 40,
    title: 'Fall Quarter Complete',
    description: 'Mastered harvest operations, food preservation, and end-of-season management.',
    requirements: ['Complete all fall modules', 'Pass fall assessment', 'Lead preservation event', 'Mentor sign-off'],
    icon: '🍂'
  },
  {
    id: 'milestone-graduation',
    season: 'winter',
    week: 52,
    title: 'Graduation',
    description: 'Completed full 12-month training, passed final assessment, and signed Steward Covenant.',
    requirements: ['Complete all modules', 'Pass final assessment', 'Present capstone', 'Sign covenant'],
    icon: '🎓'
  }
];

export const stewardCovenant = {
  version: '2.0',
  title: 'The Steward Covenant',
  preamble: `This Covenant represents a lifetime commitment to the principles, responsibilities, and community of the Axiom Steward Corps. By signing after completing your 12-month training journey through all four seasons, you are not entering an employment contract or making a financial investment. You are accepting a sacred trust to serve the land, the community, and future generations. You have proven your dedication through a full year of training, and now commit to a lifetime of stewardship.`,
  
  commitments: [
    {
      id: 'responsibility',
      title: 'I Accept Responsibility',
      text: 'I accept responsibility for coordinating people, resources, and land opportunities with integrity. I understand that this role grants access and trust, not ownership or entitlement. I have trained through all seasons and understand the weight of this commitment.'
    },
    {
      id: 'service',
      title: 'I Commit to Service',
      text: 'I commit to serving the community, not myself. My role is to facilitate, coordinate, and support—never to control, profit personally, or act against community interests. I have witnessed the needs of each season and commit to meeting them.'
    },
    {
      id: 'transparency',
      title: 'I Embrace Transparency',
      text: 'I embrace full transparency in all my actions as a Steward. I will document my activities, share information openly, and never operate in secrecy or for hidden purposes. I have kept records through my training year and will continue this practice.'
    },
    {
      id: 'boundaries',
      title: 'I Respect Boundaries',
      text: 'I respect the boundaries of my role. I will not overstep my authority, make promises I cannot keep, or represent myself as having powers or resources beyond what has been granted. I understand the limits learned through practical experience.'
    },
    {
      id: 'continuity',
      title: 'I Honor Continuity',
      text: 'I honor the continuity of stewardship. I understand that I am part of a multi-generational effort, and I will train successors, document my learnings, and prepare for smooth transitions. I have experienced a full year and will share this knowledge.'
    },
    {
      id: 'lifetime',
      title: 'I Accept This as My Calling',
      text: 'I accept this as my calling, not a job. This is not a position I can resign from when inconvenient. While life circumstances may require stepping back from active duties, I remain bound to these principles for life. Having trained through spring planting, summer growth, fall harvest, and winter planning, I understand the full cycle of stewardship.'
    }
  ],

  affirmation: 'I have completed 12 months of training through all four seasons. I have planted, cultivated, harvested, and planned. I have worked alongside my cohort, learned from my mentors, and served the community. I am ready to commit my life to land stewardship.'
};

export const fieldCompetencies = [
  {
    season: 'spring',
    category: 'Soil and Planting',
    tasks: [
      'Collect and interpret soil samples',
      'Apply amendments based on test results',
      'Prepare beds to standard specifications',
      'Successfully germinate seeds indoors',
      'Harden off transplants properly',
      'Install and program irrigation systems',
      'Direct seed with proper spacing and depth',
      'Manage cold frames and row covers'
    ]
  },
  {
    season: 'summer',
    category: 'Crop Management',
    tasks: [
      'Identify common pests and diseases',
      'Implement IPM strategies effectively',
      'Manage irrigation during peak demand',
      'Execute effective weed control',
      'Support pollinator populations',
      'Harvest crops at proper maturity',
      'Grade produce to quality standards',
      'Coordinate community distribution events'
    ]
  },
  {
    season: 'fall',
    category: 'Harvest and Preservation',
    tasks: [
      'Lead high-volume harvest operations',
      'Execute proper post-harvest handling',
      'Cure and store crops correctly',
      'Demonstrate food preservation skills',
      'Plant garlic and perennials',
      'Establish cover crops successfully',
      'Coordinate harvest festival',
      'Complete end-of-season cleanup'
    ]
  },
  {
    season: 'winter',
    category: 'Planning and Development',
    tasks: [
      'Analyze season data accurately',
      'Create comprehensive annual plan',
      'Manage seed and supply ordering',
      'Assess and plan infrastructure',
      'Manage winter greenhouse production',
      'Maintain tools and equipment',
      'Complete annual stewardship report',
      'Present capstone project successfully'
    ]
  }
];

export function calculateTotalTrainingHours(): { byseason: Record<SeasonId, number>; total: number } {
  const bySeason: Record<SeasonId, number> = {
    foundations: 0,
    spring: 0,
    summer: 0,
    fall: 0,
    winter: 0
  };
  
  trainingCurriculum.forEach(module => {
    bySeason[module.season] += module.estimatedMinutes;
  });
  
  const total = Object.values(bySeason).reduce((sum, mins) => sum + mins, 0);
  
  return {
    byseason: Object.fromEntries(
      Object.entries(bySeason).map(([k, v]) => [k, Math.round(v / 60)])
    ) as Record<SeasonId, number>,
    total: Math.round(total / 60)
  };
}

export function getTierById(tierId: string): TrainingTier | undefined {
  return trainingTiers.find(t => t.id === tierId);
}

export function getModulesBySeason(season: SeasonId): TrainingModule[] {
  return trainingCurriculum
    .filter(m => m.season === season)
    .sort((a, b) => a.week - b.week);
}

export function getSeasonById(seasonId: SeasonId): TrainingSeason | undefined {
  return trainingSeasons.find(s => s.id === seasonId);
}

export function getMilestonesBySeason(season: SeasonId): SeasonalMilestone[] {
  return seasonalMilestones.filter(m => m.season === season);
}

export function getCompetenciesBySeason(season: SeasonId) {
  return fieldCompetencies.filter(c => c.season === season);
}

export function getModulesByPhase(phase: 'online' | 'classroom' | 'field'): TrainingModule[] {
  const typeMapping: Record<string, TrainingModule['type'][]> = {
    online: ['lesson'],
    classroom: ['workshop', 'assessment', 'capstone'],
    field: ['field']
  };
  return trainingCurriculum.filter(m => typeMapping[phase]?.includes(m.type));
}
