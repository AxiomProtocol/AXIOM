const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Fix & Flip Vault - Initial Liquidity Seeding");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("Seeder:", deployer.address);

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const VAULT_ADDRESS = "0xAd1Fb0467139bbaA50E4A5F3E3f8CF34D6B54a65";

  const axusd = await hre.ethers.getContractAt("IERC20", AXUSD_ADDRESS);
  const vault = await hre.ethers.getContractAt("FixFlipPoolVault", VAULT_ADDRESS);

  const balance = await axusd.balanceOf(deployer.address);
  console.log("\nAXUSD Balance:", hre.ethers.formatUnits(balance, 18), "AXUSD");

  const vaultBalance = await axusd.balanceOf(VAULT_ADDRESS);
  console.log("Current Vault Balance:", hre.ethers.formatUnits(vaultBalance, 18), "AXUSD");

  const seedAmount = hre.ethers.parseUnits(process.env.SEED_AMOUNT || "10000", 18);
  console.log("\nSeed Amount:", hre.ethers.formatUnits(seedAmount, 18), "AXUSD");

  if (balance < seedAmount) {
    console.log("\nInsufficient AXUSD balance!");
    console.log("Required:", hre.ethers.formatUnits(seedAmount, 18));
    console.log("Available:", hre.ethers.formatUnits(balance, 18));
    console.log("\nTo seed the vault, transfer AXUSD to:", deployer.address);
    return;
  }

  console.log("\n1. Approving AXUSD for vault...");
  const approveTx = await axusd.approve(VAULT_ADDRESS, seedAmount);
  await approveTx.wait();
  console.log("   Approved:", approveTx.hash);

  console.log("\n2. Depositing AXUSD to vault...");
  const depositTx = await vault.deposit(seedAmount, deployer.address);
  const receipt = await depositTx.wait();
  console.log("   Deposited:", depositTx.hash);

  const shares = await vault.balanceOf(deployer.address);
  console.log("\n3. Vault shares received:", hre.ethers.formatUnits(shares, 18));

  const newVaultBalance = await axusd.balanceOf(VAULT_ADDRESS);
  console.log("   New vault balance:", hre.ethers.formatUnits(newVaultBalance, 18), "AXUSD");

  console.log("\n" + "=".repeat(60));
  console.log("VAULT SEEDING COMPLETE");
  console.log("=".repeat(60));
  console.log("\nThe vault now has initial liquidity for lending.");
  console.log("Investors can deposit AXUSD to earn yield from bridge loans.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
