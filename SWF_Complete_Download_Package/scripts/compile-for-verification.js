const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Path to the contract
const contractPath = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.flat.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Compiler input
const input = {
  language: 'Solidity',
  sources: {
    'SovranWealthFund.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    },
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

console.log('Compiling contract with Solidity 0.8.17...');
console.log('Optimization enabled with 200 runs...');

// Compile the contract
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  output.errors.forEach(error => {
    console.log(error.formattedMessage);
  });
}

// Extract contract
const contract = output.contracts['SovranWealthFund.sol']['SovranWealthFund'];

// Output directory
const buildPath = path.resolve(__dirname, '../compiled-0.8.17');
fs.mkdirSync(buildPath, { recursive: true });

// Write ABI
fs.writeFileSync(
  path.resolve(buildPath, 'SovranWealthFund.abi'),
  JSON.stringify(contract.abi, null, 2)
);

// Write bytecode
fs.writeFileSync(
  path.resolve(buildPath, 'SovranWealthFund.bin'),
  contract.evm.bytecode.object
);

console.log('Contract compiled successfully!');
console.log(`ABI and bytecode saved to ${buildPath}`);
console.log('Use this contract and settings when submitting for verification on Polygonscan:');
console.log('1. Compiler Version: 0.8.17+commit.8df45f5f');
console.log('2. Enable optimization: Yes');
console.log('3. Optimization runs: 200');