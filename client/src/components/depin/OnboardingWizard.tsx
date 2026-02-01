import React, { useState } from 'react';
import { UserResources } from '../../types/depin';
import { HARDWARE_TIERS, NODE_TYPES } from '../../data/depinTiers';
import toast from 'react-hot-toast';

interface OnboardingWizardProps {
  onComplete: (resources: UserResources) => void;
  onClose: () => void;
}

export function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [resources, setResources] = useState<UserResources>({
    hasSmartphone: false,
    hasTablet: false,
    hasLaptop: false,
    hasDesktopPC: false,
    hasServerRack: false,
    availableStorage: 0,
    availableBandwidth: 0,
    monthlyBudget: 0,
    technicalExperience: 'beginner'
  });

  const totalSteps = 4;

  const updateResources = (updates: Partial<UserResources>) => {
    setResources(prev => ({ ...prev, ...updates }));
  };

  const getRecommendedTier = (): UserResources => {
    let tier: 'mobile' | 'desktop' | 'professional' | 'enterprise' = 'mobile';

    // Logic to determine tier based on resources
    if (resources.hasServerRack && resources.availableStorage >= 2000 && resources.monthlyBudget >= 200) {
      tier = 'enterprise';
    } else if (resources.hasDesktopPC && resources.availableStorage >= 500 && resources.monthlyBudget >= 40) {
      tier = 'professional';
    } else if ((resources.hasLaptop || resources.hasDesktopPC) && resources.availableStorage >= 128) {
      tier = 'desktop';
    } else if (resources.hasSmartphone || resources.hasTablet) {
      tier = 'mobile';
    }

    return { ...resources, recommendedTier: tier };
  };

  const handleComplete = () => {
    const finalResources = getRecommendedTier();
    toast.success(`🎉 Perfect! We recommend starting with ${finalResources.recommendedTier?.toUpperCase()} tier nodes!`);
    onComplete(finalResources);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">What devices do you have available?</h3>
            <p className="text-gray-400 mb-6">Select all that apply. Don't worry - you can start with what you have and upgrade later!</p>
            
            <div className="space-y-3">
              {[
                { key: 'hasSmartphone', label: '📱 Smartphone (Android/iOS)', sublabel: 'Perfect for getting started!' },
                { key: 'hasTablet', label: '📱 Tablet (iPad, Android)', sublabel: 'Great for light operations' },
                { key: 'hasLaptop', label: '💻 Laptop (Windows/Mac/Linux)', sublabel: 'Recommended for most users' },
                { key: 'hasDesktopPC', label: '🖥️ Desktop PC', sublabel: 'Excellent for dedicated nodes' },
                { key: 'hasServerRack', label: '🗄️ Server/Rack Equipment', sublabel: 'Enterprise-level infrastructure' }
              ].map(({ key, label, sublabel }) => (
                <button
                  key={key}
                  onClick={() => updateResources({ [key]: !resources[key as keyof UserResources] })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    resources[key as keyof UserResources]
                      ? 'bg-yellow-500/20 border-yellow-500 shadow-lg'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-lg">{label}</div>
                      <div className="text-gray-400 text-sm mt-1">{sublabel}</div>
                    </div>
                    {resources[key as keyof UserResources] && (
                      <span className="text-2xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">Storage & Bandwidth Resources</h3>
            <p className="text-gray-400 mb-6">Tell us about your available resources</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">
                  💾 Available Storage Space (GB)
                </label>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={resources.availableStorage}
                  onChange={(e) => updateResources({ availableStorage: parseInt(e.target.value) })}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400 text-sm">0 GB</span>
                  <span className="text-yellow-400 font-bold text-lg">{resources.availableStorage} GB</span>
                  <span className="text-gray-400 text-sm">5000 GB</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {resources.availableStorage < 50 && "⚠️ Consider freeing up more space"}
                  {resources.availableStorage >= 50 && resources.availableStorage < 200 && "✓ Good for mobile nodes"}
                  {resources.availableStorage >= 200 && resources.availableStorage < 500 && "✓✓ Great for desktop nodes"}
                  {resources.availableStorage >= 500 && "🌟 Excellent for professional/enterprise nodes"}
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">
                  📡 Internet Bandwidth (Mbps)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={resources.availableBandwidth}
                  onChange={(e) => updateResources({ availableBandwidth: parseInt(e.target.value) })}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400 text-sm">0 Mbps</span>
                  <span className="text-yellow-400 font-bold text-lg">{resources.availableBandwidth} Mbps</span>
                  <span className="text-gray-400 text-sm">1000 Mbps</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {resources.availableBandwidth < 10 && "⚠️ Minimum 10 Mbps recommended"}
                  {resources.availableBandwidth >= 10 && resources.availableBandwidth < 50 && "✓ Suitable for light nodes"}
                  {resources.availableBandwidth >= 50 && resources.availableBandwidth < 100 && "✓✓ Good for standard operations"}
                  {resources.availableBandwidth >= 100 && "🌟 Perfect for high-performance nodes"}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">Budget & Experience Level</h3>
            <p className="text-gray-400 mb-6">Help us recommend the best starting point for you</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">
                  💰 Monthly Operating Budget (USD)
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={resources.monthlyBudget}
                  onChange={(e) => updateResources({ monthlyBudget: parseInt(e.target.value) })}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400 text-sm">$0</span>
                  <span className="text-green-400 font-bold text-lg">${resources.monthlyBudget}/mo</span>
                  <span className="text-gray-400 text-sm">$500</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Covers electricity, internet, and hardware wear & tear
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">
                  🎓 Technical Experience Level
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'beginner', label: '🌱 Beginner', desc: 'New to crypto/nodes' },
                    { value: 'intermediate', label: '📚 Intermediate', desc: 'Some crypto experience' },
                    { value: 'advanced', label: '🚀 Advanced', desc: 'Run nodes before' },
                    { value: 'expert', label: '💎 Expert', desc: 'DevOps/Infrastructure pro' }
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => updateResources({ technicalExperience: value as any })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        resources.technicalExperience === value
                          ? 'bg-yellow-500/20 border-yellow-500 shadow-lg'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-white font-semibold mb-1">{label}</div>
                      <div className="text-gray-400 text-xs">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        const recommended = getRecommendedTier();
        const tierInfo = HARDWARE_TIERS.find(t => t.tier === recommended.recommendedTier);
        const compatibleNodes = NODE_TYPES.filter(n => n.requiredHardwareTier === recommended.recommendedTier);

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-2">Your Perfect Match!</h3>
              <p className="text-gray-400">Based on your resources, here's what we recommend:</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mb-4">
                  <span className="text-black font-bold text-xl">{tierInfo?.tierName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-2">✓ Your Devices</div>
                  <div className="text-white text-sm space-y-1">
                    {tierInfo?.devices.map((device, i) => (
                      <div key={i}>• {device}</div>
                    ))}
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-2">📊 Expected Earnings</div>
                  <div className="text-white text-sm space-y-1">
                    {compatibleNodes.map(node => (
                      <div key={node.id}>
                        • {node.name}: <span className="text-green-400 font-bold">
                          ${node.monthlyEarnings.min}-${node.monthlyEarnings.max}/mo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-2">💰 Setup Cost</div>
                  <div className="text-white font-bold text-lg">{tierInfo?.estimatedSetupCost}</div>
                </div>

                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-yellow-400 font-semibold mb-2">⚡ Monthly Operating</div>
                  <div className="text-white font-bold text-lg">{tierInfo?.monthlyOperatingCost}</div>
                </div>
              </div>

              {tierInfo?.upgradeFrom && (
                <div className="mt-6 bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
                  <div className="text-blue-400 font-semibold mb-2">🚀 Upgrade Path</div>
                  <div className="text-white text-sm">
                    As you grow, upgrade to higher tiers for increased earnings!
                  </div>
                </div>
              )}
            </div>

            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <span className="text-4xl">💡</span>
                <div>
                  <div className="text-green-400 font-bold text-lg mb-2">Pro Tip</div>
                  <div className="text-white text-sm">
                    Start with {compatibleNodes[0]?.name} ({compatibleNodes[0]?.priceUSD}) and scale up as you earn!
                    ROI in just {compatibleNodes[0]?.roi}.
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-yellow-500/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-black border-b border-yellow-500/30 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-transparent bg-clip-text">
              DePIN Node Setup Wizard
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full transition-all ${
                  s <= step ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-700'
                }`} />
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Step {step} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-900 to-black border-t border-yellow-500/30 p-6">
          <div className="flex justify-between">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            
            <button
              onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-bold transition-all shadow-lg"
            >
              {step === totalSteps ? 'Start Earning!' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
