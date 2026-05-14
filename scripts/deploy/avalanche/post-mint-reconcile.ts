/**
 * Post-mint read-only reconciliation for Avalanche mainnet.
 * Run after every mint to confirm on-chain state matches ledger.
 */
import { ethers } from 'ethers';
const RPC = process.env.AVALANCHE_MAINNET_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc';
const STABLE  = '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8';
const IR      = '0x75ed20d260292D869f9Ec4F035Db4B93072D7963';
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const PILOT_CAP = 2_500_000_000n;
const TOKEN_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function paused() view returns (bool)',
];
const IR_ABI = [
  'function isVerified(address) view returns (bool)',
  'function contains(address) view returns (bool)',
  'function investorCountry(address) view returns (uint16)',
];
async function main() {
  const p = new ethers.JsonRpcProvider(RPC);
  const { chainId } = await p.getNetwork();
  const block = await p.getBlockNumber();
  const token = new ethers.Contract(STABLE,  TOKEN_ABI, p);
  const ir    = new ethers.Contract(IR,       IR_ABI,   p);
  const [supply, balance, paused, verified, inReg, country] = await Promise.all([
    token.totalSupply(), token.balanceOf(DEPLOYER), token.paused(),
    ir.isVerified(DEPLOYER), ir.contains(DEPLOYER),
    ir.investorCountry(DEPLOYER),
  ]);
  const capUsed      = Number(supply) / 1e6;
  const capRemaining = Number(PILOT_CAP - supply) / 1e6;
  const pct          = (capUsed / 2500 * 100).toFixed(2);
  console.log('══════════════════════════════════════════════');
  console.log(' Avalanche Pilot — Post-Mint Reconciliation');
  console.log('══════════════════════════════════════════════');
  console.log(`ChainId          : ${chainId}`);
  console.log(`Block            : ${block}`);
  console.log(`Timestamp        : ${new Date().toISOString()}`);
  console.log(`totalSupply      : ${capUsed.toFixed(6)} AXUSD`);
  console.log(`Deployer balance : ${(Number(balance)/1e6).toFixed(6)} AXUSD`);
  console.log(`Paused           : ${paused}`);
  console.log(`Deployer in IR   : ${inReg}`);
  console.log(`Deployer verified: ${verified}`);
  const countryNum = Number(country);
  console.log(`Deployer country : ${countryNum} ${countryNum === 840 ? '(US ✓)' : '(UNEXPECTED!)'}`);
  console.log(`Cap used         : ${capUsed.toFixed(6)} / 2500 (${pct}%)`);
  console.log(`Cap remaining    : ${capRemaining.toFixed(6)} AXUSD`);
  const ok = chainId === 43114n && !paused && verified && inReg && countryNum === 840 && supply <= PILOT_CAP;
  console.log(`Result           : ${ok ? 'CLEAN ✓' : 'ANOMALY — INVESTIGATE'}`);
  if (!ok) process.exit(1);
}
main().catch(e => { console.error(e.message); process.exit(1); });
