const { ethers } = require('hardhat');

const AXM          = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const AXUSD        = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const eAXM_VAULT   = '0x8e28ffa89d168599156004db4f4d12c2af7c250e'; // eAXM-1
const eAXUSD_VAULT = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6
const AXM_POOL     = '0x981763699D269E129a08E216b1AeC7caa376A8a8'; // AXM/AXUSD EulerSwap pool
const EVC          = '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function allowance(address,address) view returns (uint256)'];
const EVK_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function convertToAssets(uint256) view returns (uint256)',
];
const POOL_ABI = [
  'function getStaticParams() view returns (address supplyVault0, address supplyVault1, address borrowVault0, address borrowVault1, address eulerAccount, address feeRecipient)',
  'function getDynamicParams() view returns (uint112 equilibriumReserve0, uint112 equilibriumReserve1, uint112 minReserve0, uint112 minReserve1, uint80 priceX, uint80 priceY, uint64 concentrationX, uint64 concentrationY, uint64 fee0, uint64 fee1, uint40 expiration, uint8 swapHookedOperations, address swapHook)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function asset0() view returns (address)',
  'function asset1() view returns (address)',
];
const EVC_ABI = ['function isOperatorAuthenticated(address onBehalfOfAccount, address operator) view returns (bool)'];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Deployer:', signer.address);
  const ethBal = await ethers.provider.getBalance(signer.address);
  console.log('ETH:', ethers.formatEther(ethBal));

  const axm  = new ethers.Contract(AXM, ERC20_ABI, signer);
  const axusd = new ethers.Contract(AXUSD, ERC20_ABI, signer);
  const eAxm  = new ethers.Contract(eAXM_VAULT, EVK_ABI, signer);
  const eAxusd = new ethers.Contract(eAXUSD_VAULT, EVK_ABI, signer);
  const pool  = new ethers.Contract(AXM_POOL, POOL_ABI, signer);
  const evc   = new ethers.Contract(EVC, EVC_ABI, signer);

  const [axmBal, axusdBal, axmDec, axusdDec] = await Promise.all([
    axm.balanceOf(signer.address),
    axusd.balanceOf(signer.address).catch(() => BigInt(0)),
    axm.decimals(),
    axusd.decimals(),
  ]);
  console.log('\n--- Deployer Token Balances ---');
  console.log('AXM  :', ethers.formatUnits(axmBal, axmDec), `(${axmDec} dec)`);
  console.log('AXUSD:', ethers.formatUnits(axusdBal, axusdDec), `(${axusdDec} dec)`);

  const [eAxmAssets, eAxusdAssets, eAxmShares, eAxusdShares] = await Promise.all([
    eAxm.totalAssets(),
    eAxusd.totalAssets(),
    eAxm.balanceOf(signer.address),
    eAxusd.balanceOf(signer.address),
  ]);
  console.log('\n--- EVK Vault State ---');
  console.log('eAXM-1  totalAssets:', ethers.formatUnits(eAxmAssets, 18), '| deployer shares:', ethers.formatUnits(eAxmShares, 18));
  console.log('eAXUSD-6 totalAssets:', ethers.formatUnits(eAxusdAssets, 18), '| deployer shares:', ethers.formatUnits(eAxusdShares, 18));

  console.log('\n--- AXM/AXUSD Pool ---');
  const [s, d, r] = await Promise.all([
    pool.getStaticParams(),
    pool.getDynamicParams(),
    pool.getReserves(),
  ]);
  console.log('supplyVault0:', s.supplyVault0, '(should be eAXM-1)');
  console.log('supplyVault1:', s.supplyVault1, '(should be eAXUSD-6)');
  console.log('eulerAccount:', s.eulerAccount);
  console.log('feeRecipient:', s.feeRecipient);
  console.log('DParams: equil0=', d.equilibriumReserve0.toString(), 'equil1=', d.equilibriumReserve1.toString());
  console.log('         priceX=', d.priceX.toString(), 'priceY=', d.priceY.toString());
  console.log('         fee0=', d.fee0.toString(), 'fee1=', d.fee1.toString());
  console.log('Reserves: r0=', r.reserve0.toString(), 'r1=', r.reserve1.toString());

  // EVC operator check
  const isOp = await evc.isOperatorAuthenticated(signer.address, AXM_POOL).catch(() => 'err');
  console.log('\nEVC: pool operator for deployer:', isOp);
}
main().catch(e => { console.error(e?.message?.slice(0,200)); process.exit(1); });
