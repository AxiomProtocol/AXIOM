const hardhatEthers = require('hardhat').ethers;
const { ethers } = require('ethers');
const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USD   = '0x0000000000000000000000000000000000000348';
(async () => {
  const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log('Deployer:', deployer.address);
  const bal = await provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(bal), 'ETH');
  const Factory = await hardhatEthers.getContractFactory('AXUSDPegOracleAdapter');
  const bytecode = Factory.bytecode;
  const est = await provider.estimateGas({ from: deployer.address, data: bytecode });
  console.log('Est gas:', est.toString());
  const fee = await provider.getFeeData();
  console.log('Net base/maxFee/prio:', ethers.formatUnits(fee.gasPrice||0n,'gwei'), '/', ethers.formatUnits(fee.maxFeePerGas||0n,'gwei'), '/', ethers.formatUnits(fee.maxPriorityFeePerGas||0n,'gwei'));
  // Tight EIP-1559
  const gasLimit = est * 12n / 10n;
  const maxFeePerGas = ethers.parseUnits('0.03', 'gwei');         // ~2.5x current base
  const maxPriorityFeePerGas = ethers.parseUnits('0.001', 'gwei'); // tiny tip
  const cap = gasLimit * maxFeePerGas;
  console.log('gasLimit:', gasLimit.toString(), 'maxFeePerGas:', ethers.formatUnits(maxFeePerGas,'gwei'),'gwei -> cap:', ethers.formatEther(cap), 'ETH');
  if (cap > bal) { console.error('FAIL cap > balance'); process.exit(1); }
  const nonce = await provider.getTransactionCount(deployer.address, 'pending');
  console.log('Nonce:', nonce);
  const tx = await deployer.sendTransaction({
    type: 2, data: bytecode, nonce, gasLimit, maxFeePerGas, maxPriorityFeePerGas,
  });
  console.log('Sent:', tx.hash);
  const r = await tx.wait(1);
  console.log('Mined block:', r.blockNumber, 'gasUsed:', r.gasUsed.toString());
  console.log('DEPLOYED:', r.contractAddress);
  const abi = ['function getQuote(uint256,address,address) view returns (uint256)','function name() view returns (string)','function adapterType() view returns (string)'];
  const a = new ethers.Contract(r.contractAddress, abi, provider);
  console.log('name:', await a.name(), '| adapterType:', await a.adapterType());
  console.log('1 AXUSD->USD:', (await a.getQuote(ethers.parseUnits('1',18), AXUSD, USD)).toString());
  console.log('1 USD->AXUSD:', (await a.getQuote(ethers.parseUnits('1',8), USD, AXUSD)).toString());
})().catch(e => { console.error('ERR:', e.shortMessage || e.message, e.code||''); process.exit(1); });
