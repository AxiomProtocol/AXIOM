import Layout from "../components/Layout";

export default function Pricing() {
  const tiers = [
    { 
      name: "Community", 
      price: "Free", 
      description: "For individuals exploring Axiom",
      features: [
        "View Transparency Reports",
        "Basic Analytics Dashboard",
        "Community Forum Access",
        "Public Governance Voting"
      ],
      cta: "Get Started",
      highlighted: false
    },
    { 
      name: "Node Operator", 
      price: "Stake Required", 
      description: "For DePIN infrastructure operators",
      features: [
        "All Community Features",
        "Register Infrastructure Nodes",
        "Earn Network Rewards",
        "Priority Support",
        "Operator Dashboard Access"
      ],
      cta: "Become Operator",
      highlighted: true
    },
    { 
      name: "Institutional", 
      price: "Custom", 
      description: "For enterprises and institutions",
      features: [
        "All Operator Features",
        "Custom Integrations",
        "Full Audit Data Access",
        "Dedicated Account Manager",
        "White-glove Onboarding",
        "SLA Guarantees"
      ],
      cta: "Contact Sales",
      highlighted: false
    },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Pricing</h1>
          <p className="text-lg text-gray-600">Choose the right plan for your participation in Axiom Smart City.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <div 
              key={i} 
              className={`rounded-2xl p-8 text-center ${
                tier.highlighted 
                  ? 'bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 shadow-lg shadow-amber-100' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {tier.highlighted && (
                <span className="inline-block px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full mb-4">
                  MOST POPULAR
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
              <p className="text-3xl font-bold text-amber-600 my-4">{tier.price}</p>
              <p className="text-gray-500 text-sm mb-6">{tier.description}</p>
              <ul className="text-gray-600 space-y-3 text-left mb-8">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                className={`w-full py-3 rounded-lg font-bold transition-colors ${
                  tier.highlighted
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gray-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Need a Custom Solution?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            For large-scale deployments, custom integrations, or unique requirements, 
            our team will work with you to create a tailored solution.
          </p>
          <a 
            href="/contact" 
            className="inline-block px-8 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
