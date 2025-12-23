import Link from 'next/link';

const STEPS = [
  { id: 'learn', label: 'Learn', href: '/academy', description: 'Financial education & discipline' },
  { id: 'connect', label: 'Connect', href: '/susu', description: 'Join interest groups by location/goal' },
  { id: 'save', label: 'Save Together', href: '/susu', description: 'SUSU savings circles with clear rules' },
];

export default function StepProgressBanner({ currentStep = null, isAdvanced = false }) {
  if (isAdvanced) {
    return (
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">Advanced Module</span>
              <span className="text-sm text-gray-600">Part of Axiom's long-term buildout</span>
            </div>
            <Link href="/susu" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
              Start with Learn → Connect → Save Together →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-white border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-center gap-1 sm:gap-4 overflow-x-auto">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isPast = STEPS.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <Link 
                  href={step.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-amber-500 text-white' 
                      : isPast 
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive 
                      ? 'bg-white text-amber-600' 
                      : isPast 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isPast ? '✓' : index + 1}
                  </span>
                  {step.label}
                </Link>
                {index < STEPS.length - 1 && (
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 ${
                    isPast ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function JourneyIntro({ step, title, subtitle }) {
  const stepMessages = {
    learn: {
      emoji: '📚',
      message: 'Step 1: Build your financial foundation through education and discipline.'
    },
    connect: {
      emoji: '🤝',
      message: 'Step 2: Find your community. No money required — just connect with people who share your goals.'
    },
    save: {
      emoji: '💰',
      message: 'Step 3: Save together with clear rules and transparency. Start small, build consistency.'
    },
    grow: {
      emoji: '🌱',
      message: 'After you build consistency, explore opportunities to grow your wealth.'
    }
  };

  const info = stepMessages[step] || stepMessages.learn;

  return (
    <div className="bg-white border-b border-gray-100 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="text-3xl mb-2">{info.emoji}</div>
        {title && <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>}
        {subtitle && <p className="text-lg text-amber-600 font-medium mb-2">{subtitle}</p>}
        <p className="text-gray-600">{info.message}</p>
      </div>
    </div>
  );
}
