/**
 * DEPRECATED — superseded by /hardhat.avalanche.config.mts at the workspace root.
 *
 * Hardhat 3 sets the project root to the directory containing the config file.
 * Because the workspace root already has "type":"module" and all Solidity
 * contracts / tests live under paths relative to the workspace root, the active
 * config MUST live there.  This file is kept only as a breadcrumb.
 *
 * All Avalanche Hardhat commands use:
 *   --config hardhat.avalanche.config.mts   (from workspace root)
 *
 * npm scripts:
 *   npm run compile:avalanche
 *   npm run test:avalanche
 *   npm run deploy:avalanche:fuji
 */

// Re-export the canonical root config so that accidental direct invocations
// (e.g. `cd hardhat-avalanche && npx hardhat compile`) still resolve correctly.
export { default } from '../hardhat.avalanche.config.mts';
