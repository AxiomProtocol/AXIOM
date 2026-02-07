/**
 * MIRDT - Main Page
 *
 * Hosts the Market Intelligence & Risk Disclosure Terminal.
 *
 * DESIGN ENFORCEMENT: The page is simple, focused, and professional.
 * It serves as a container for the data-centric Terminal component.
 */

import { Terminal } from '../components/mirdt/Terminal';

const MIRDTPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Market Intelligence & Risk Disclosure Terminal
      </h1>
      <p className="text-gray-600 mb-6">
        A decision-support system for capital allocators. All data is presented for informational and educational purposes only.
      </p>
      <Terminal />
    </div>
  );
};

export default MIRDTPage;