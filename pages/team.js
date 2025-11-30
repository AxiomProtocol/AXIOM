import Layout from "../components/Layout";

const team = [
  { 
    name: "Clarence Fuqua Bey", 
    role: "Founder & Visionary", 
    description: "Leading the vision for America's first on-chain smart city",
    icon: "👤"
  },
  { 
    name: "Advisory Council", 
    role: "Strategic Advisors", 
    description: "Experts in blockchain, real estate, fintech, and regulatory compliance",
    icon: "👥"
  },
];

export default function Team() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Our Team</h1>
          <p className="text-lg text-gray-600">The people building Axiom Smart City.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {team.map((member, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{member.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{member.name}</h2>
              <p className="text-amber-600 font-medium mb-4">{member.role}</p>
              <p className="text-gray-600">{member.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Our Team</h2>
            <p className="text-gray-600 mb-6">
              We're always looking for talented individuals passionate about blockchain, 
              smart cities, and financial innovation.
            </p>
            <a 
              href="/contact" 
              className="inline-block px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
