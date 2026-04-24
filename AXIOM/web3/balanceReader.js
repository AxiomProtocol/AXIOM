// /web3/balanceReader.js
const { swfToken, provider, ethers } = require('./connect');
const wallets = require('../wallets.json'); // Path to your organized wallets list

async function getWalletBalances() {
  const balances = [];

  for (const wallet of wallets) {
    const balance = await swfToken.balanceOf(wallet.address);
    const decimals = await swfToken.decimals();
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);

    balances.push({
      name: wallet.name,
      address: wallet.address,
      balance: formattedBalance
    });
  }

  return balances;
}

async function getAdminWalletBalance(adminAddress) {
  const balance = await swfToken.balanceOf(adminAddress);
  const decimals = await swfToken.decimals();
  return ethers.utils.formatUnits(balance, decimals);
}

async function getTotalSupply() {
  const totalSupply = await swfToken.totalSupply();
  const decimals = await swfToken.decimals();
  return ethers.utils.formatUnits(totalSupply, decimals);
}

module.exports = {
  getWalletBalances,
  getAdminWalletBalance,
  getTotalSupply
};