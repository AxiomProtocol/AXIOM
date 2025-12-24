/**
 * Onramp Disclosure - Compliance and legal disclaimers
 */

export default function OnrampDisclosure({ compact = false }) {
  if (compact) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <p className="text-xs text-gray-400">
          Third-party provider handles payments and identity verification. Axiom does not custody funds.
          Not an investment product.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-yellow-500/30">
      <div className="flex items-start gap-3">
        <div className="text-yellow-500 text-xl mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-2">Important Information</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">1.</span>
              <span>Axiom does not custody your funds. Purchases are processed by third-party providers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">2.</span>
              <span>Fees and identity checks (KYC) are set and handled by the provider.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">3.</span>
              <span>This is not an investment product. No profits, returns, or yields are promised.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">4.</span>
              <span>Tokens are delivered directly to your wallet by the provider.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
