const { ethers } = require('ethers');
require('dotenv').config();

const MORPHO_BLUE = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb';
const AXUSD = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';

const MARKETS = {
  'AXUSD/USDY': {
    id: '0xe0bd68a4ce092798347c7fe73b9b05576e50adae34ef8a0bdc67f4eb01b873ac',
    name: 'AXUSD/USDY'
  },
  'AXUSD/USDC': {
    id: '0x9be349db1d04f1b5e4324185188bbd0bde1da0115215451f49a4289e25ecc364',
    name: 'AXUSD/USDC'
  },
  'AXUSD/USTBL': {
    id: '0x77c76d2851621381ecd4b7c56bda949387c8286ac4dfbd593fc1452f15802715',
    name: 'AXUSD/USTBL'
  }
};

const MORPHO_ABI = [
  'function supply(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsSupplied, uint256 sharesSupplied)',
  'function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)',
  'function idToMarketParams(bytes32 id) external view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  const marketChoice = process.argv[2] || 'AXUSD/USDC';
  const amountArg = process.argv[3] || 'all';
  
  console.log('='.repeat(60));
  console.log('Seed Morpho Market with AXUSD');
  console.log('='.repeat(60));
  
  const pk = process.env.DEPLOYER_PK || process.env.PRIVATE_KEY;
  if (!pk) {
    console.log('\nERROR: DEPLOYER_PK or PRIVATE_KEY not set');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log('\nWallet:', wallet.address);
  
  const axusd = new ethers.Contract(AXUSD, ERC20_ABI, wallet);
  const morpho = new ethers.Contract(MORPHO_BLUE, MORPHO_ABI, wallet);
  
  const balance = await axusd.balanceOf(wallet.address);
  console.log('AXUSD Balance:', ethers.formatUnits(balance, 18), 'AXUSD');
  
  if (balance === 0n) {
    console.log('\nERROR: No AXUSD to deposit');
    process.exit(1);
  }
  
  const market = MARKETS[marketChoice];
  if (!market) {
    console.log('\nERROR: Unknown market. Options:', Object.keys(MARKETS).join(', '));
    process.exit(1);
  }
  
  console.log('\nMarket:', market.name);
  console.log('Market ID:', market.id);
  
  const marketParams = await morpho.idToMarketParams(market.id);
  console.log('\n--- Market Params ---');
  console.log('Loan Token:', marketParams.loanToken);
  console.log('Collateral:', marketParams.collateralToken);
  console.log('Oracle:', marketParams.oracle);
  console.log('IRM:', marketParams.irm);
  console.log('LLTV:', Number(marketParams.lltv) / 1e16, '%');
  
  let amountToDeposit;
  if (amountArg === 'all') {
    amountToDeposit = balance;
  } else {
    amountToDeposit = ethers.parseUnits(amountArg, 18);
  }
  
  if (amountToDeposit > balance) {
    console.log('\nERROR: Insufficient balance');
    process.exit(1);
  }
  
  console.log('\n--- Deposit ---');
  console.log('Amount:', ethers.formatUnits(amountToDeposit, 18), 'AXUSD');
  
  const currentAllowance = await axusd.allowance(wallet.address, MORPHO_BLUE);
  if (currentAllowance < amountToDeposit) {
    console.log('\nApproving AXUSD...');
    const approveTx = await axusd.approve(MORPHO_BLUE, amountToDeposit);
    console.log('Approve TX:', approveTx.hash);
    await approveTx.wait();
    console.log('Approved!');
  }
  
  console.log('\nSupplying to Morpho...');
  
  const marketParamsTuple = {
    loanToken: marketParams.loanToken,
    collateralToken: marketParams.collateralToken,
    oracle: marketParams.oracle,
    irm: marketParams.irm,
    lltv: marketParams.lltv
  };
  
  const supplyTx = await morpho.supply(
    marketParamsTuple,
    amountToDeposit,
    0,
    wallet.address,
    '0x'
  );
  
  console.log('TX Hash:', supplyTx.hash);
  console.log('Waiting for confirmation...');
  
  const receipt = await supplyTx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  
  const marketInfo = await morpho.market(market.id);
  console.log('\n--- Market Status ---');
  console.log('Total Supply:', ethers.formatUnits(marketInfo.totalSupplyAssets, 18), 'AXUSD');
  console.log('Total Borrow:', ethers.formatUnits(marketInfo.totalBorrowAssets, 18), 'AXUSD');
  
  const newBalance = await axusd.balanceOf(wallet.address);
  console.log('\n--- Result ---');
  console.log('Remaining AXUSD:', ethers.formatUnits(newBalance, 18), 'AXUSD');
  console.log('Deposited:', ethers.formatUnits(amountToDeposit, 18), 'AXUSD');
  
  console.log('\n' + '='.repeat(60));
  console.log('Market is now seeded! LPs can view at:');
  console.log('https://app.morpho.org/arbitrum/market/' + market.id);
  console.log('='.repeat(60));
}

main().catch(console.error);
