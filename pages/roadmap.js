import Layout from "../components/Layout";

const milestones = [
  { 
    phase: "Phase 1", 
    title: "Foundation", 
    date: "Q4 2024 - Q1 2025", 
    status: "completed",
    items: [
      "Core smart contracts deployment on Arbitrum One",
      "AXM token launch and initial distribution",
      "Transparency dashboard and reporting system",
      "DePIN node registration infrastructure"
    ]
  },
  { 
    phase: "Phase 2", 
    title: "Expansion", 
    date: "Q2 2025", 
    status: "in-progress",
    items: [
      "Real estate tokenization framework",
      "Strategic partner onboarding",
      "Cross-chain bridge deployment",
      "Advanced staking mechanisms"
    ]
  },
  { 
    phase: "Phase 3", 
    title: "Adoption", 
    date: "Q3-Q4 2025", 
    status: "upcoming",
    items: [
      "Community rollout and member onboarding",
      "Sovran Bank PMA integration",
      "Full banking product suite launch",
      "Mobile app release"
    ]
  },
  { 
    phase: "Phase 4", 
    title: "Scale", 
    date: "Q1 2026+", 
    status: "upcoming",
    items: [
      "Token Generation Event (TGE) - Q1 2026",
      "Universe Blockchain (L3) deployment",
      "Advanced financial coordination tools",
      "Community IoT infrastructure"
    ]
  },
];

const statusColors = {
  'completed': 'bg-green-100 text-green-700 border-green-200',
  'in-progress': 'bg-amber-100 text-amber-700 border-amber-200',
  'upcoming': 'bg-gray-100 text-gray-600 border-gray-200'
};

const statusLabels = {
  'completed': 'Completed',
  'in-progress': 'In Progress',
  'upcoming': 'Upcoming'
};

export default function RoadmapPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Roadmap</h1>
          <p className="text-lg text-gray-600">Our journey to build a community-first wealth-building platform.</p>
        </div>

        <div className="space-y-8">
          {milestones.map((milestone, i) => (
            <div 
              key={i} 
              className={`bg-white border rounded-2xl p-8 ${
                milestone.status === 'in-progress' ? 'border-amber-300 shadow-lg shadow-amber-100' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  {milestone.phase}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{milestone.title}</h2>
                <span className="text-gray-500">{milestone.date}</span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full border ${statusColors[milestone.status]}`}>
                  {statusLabels[milestone.status]}
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {milestone.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      milestone.status === 'completed' ? 'bg-green-500' : 
                      milestone.status === 'in-progress' ? 'bg-amber-500' : 'bg-gray-300'
                    }`}>
                      {milestone.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
