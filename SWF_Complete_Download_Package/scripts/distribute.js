const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Define roles and shares (total: 10,000 basis points = 100%)
const WALLET_ROLES = [
  { address: "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6", role: "Main Distributor", share: 1500 },
  { address: "0x26A8401287cE33CC4aeb5a106cd6D282a9C2f51d", role: "Treasury", share: 2000 },
  { address: "0x7456BB1ab2FBb40B67807563595Cb6c9698d9aA1", role: "Service Wallet", share: 500 },
  { address: "0x7E9A4698788d582F3B99364071f539841693201", role: "OTC Buyer 1", share: 500 },
  { address: "0x50f7022033Ce4b1c025D7bFE56d0C27020Ae2Fe3", role: "Dividend Holder 1", share: 500 },
  { address: "0xEb02b2bC1CEb07F0B9bb78A8467CeB090A4643Fc", role: "Dividend Holder 2", share: 500 },
  { address: "0x3cCC9DEB6121aB5733a9F5715Dc92f4a40ED872A", role: "Dividend Holder 3", share: 500 },
  { address: "0x750a4dbc335D9de258D9d8297C002c4E002FdE34", role: "Dividend Holder 4", share: 500 },
  { address: "0x613afBE121004958cE6000CB2B14D1c8B0CbbB9", role: "OTC Buyer 2", share: 500 },
  { address: "0x2A5269E92C48829fdF21D8892c23E894B11D15e3", role: "Liquidity Manager", share: 500 },
  { address: "0xE6a77F0B7Fe41fe01661b8BD82aaDF95DBAA5E79", role: "OTC Buyer 3", share: 500 },
  { address: "0xCeDdb7dF2F6f1e1caC7AC767337A38Ab1D85e1eD", role: "OTC Buyer 4", share: 500 },
  { address: "0x62c62b5Bc31cA7F04910d6Be28d74E07D82b4A5", role: "LP Wallet 1", share: 300 },
  { address: "0x5013Ae54fBaEC83106afA6cD26C06Ba64D2f718d", role: "LP Wallet 2", share: 300 },
  { address: "0x62850718f02f8f5874c0ADf156876eF01Ae8bE8C", role: "LP Wallet 3", share: 300 },
  { address: "0x8Af139af51Fc53DD7575e331Fbb039Cf029e2DF", role: "Governance Wallet", share: 300 },
  { address: "0xFE60C780Ba081a03F211d7eadD4ABcd34B60f78F", role: "Reward Collector", share: 300 },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("IERC20", process.env.SWF_TOKEN_ADDRESS);
  const balance = await token.balanceOf(deployer.address);

  const totalShares = WALLET_ROLES.reduce((sum, w) => sum + w.share, 0);
  const payoutLog = [];

  console.log(`Distributing ${ethers.utils.formatUnits(balance, 18)} SWF...`);

  for (let wallet of WALLET_ROLES) {
    const amount = balance.mul(wallet.share).div(totalShares);
    const tx = await token.transfer(wallet.address, amount);
    await tx.wait();

    console.log(`Sent ${ethers.utils.formatUnits(amount, 18)} SWF to ${wallet.role}`);

    payoutLog.push({
      role: wallet.role,
      address: wallet.address,
      amount: ethers.utils.formatUnits(amount, 18),
      timestamp: new Date().toISOString(),
    });
  }

  const logPath = path.join(__dirname, "../logs/payouts.json");
  if (!fs.existsSync(logPath)) fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const existing = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath))
    : [];

  fs.writeFileSync(logPath, JSON.stringify([...existing, ...payoutLog], null, 2));
  console.log("Payouts logged to logs/payouts.json");
}

main().catch(console.error);