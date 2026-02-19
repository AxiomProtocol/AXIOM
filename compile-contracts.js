const solc = require('solc');
const fs = require('fs');
const path = require('path');

console.log('Starting compilation...\n');

// Contract files to compile
const contracts = [
  'LandAcquisitionPool.sol',
  'LandOptionRegistry.sol',
  'RegCFCrowdfunding.sol'
];

// Read OpenZeppelin contracts needed
function findImports(importPath) {
  try {
    const fullPath = path.resolve(__dirname, 'node_modules', importPath);
    if (fs.existsSync(fullPath)) {
      return {
        contents: fs.readFileSync(fullPath, 'utf8')
      };
    }
  } catch (e) {
    console.error(`Error reading import ${importPath}:`, e.message);
  }
  return { error: 'File not found' };
}

let allSuccess = true;

// Compile each contract
for (const contractName of contracts) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Compiling: ${contractName}`);
  console.log('='.repeat(60));
  
  const contractPath = path.join(__dirname, 'contracts', contractName);
  const source = fs.readFileSync(contractPath, 'utf8');
  
  const input = {
    language: 'Solidity',
    sources: {
      [contractName]: {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
        }
      }
    }
  };
  
  try {
    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    
    if (output.errors) {
      let hasError = false;
      output.errors.forEach((error) => {
        if (error.severity === 'error') {
          console.error(`❌ ERROR: ${error.formattedMessage}`);
          hasError = true;
          allSuccess = false;
        } else {
          console.warn(`⚠️  WARNING: ${error.formattedMessage}`);
        }
      });
      
      if (hasError) {
        continue;
      }
    }
    
    // Check if compilation was successful
    const contractKey = Object.keys(output.contracts[contractName])[0];
    if (output.contracts && output.contracts[contractName] && contractKey) {
      const contract = output.contracts[contractName][contractKey];
      const bytecodeSize = contract.evm.bytecode.object.length / 2;
      const deployedBytecodeSize = contract.evm.deployedBytecode.object.length / 2;
      
      console.log(`✅ SUCCESS: ${contractName} compiled successfully!`);
      console.log(`   Contract: ${contractKey}`);
      console.log(`   Bytecode size: ${bytecodeSize} bytes`);
      console.log(`   Deployed bytecode size: ${deployedBytecodeSize} bytes`);
      
      // Check if within size limit (24KB = 24576 bytes)
      if (deployedBytecodeSize > 24576) {
        console.warn(`   ⚠️  WARNING: Contract exceeds 24KB size limit (${deployedBytecodeSize} > 24576)`);
      } else {
        console.log(`   ✓ Contract size OK (within 24KB limit)`);
      }
      
      // Save compiled artifacts
      const artifactDir = path.join(__dirname, 'artifacts', 'contracts');
      if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
      }
      
      const artifact = {
        contractName: contractKey,
        abi: contract.abi,
        bytecode: '0x' + contract.evm.bytecode.object,
        deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
        metadata: contract.metadata
      };
      
      fs.writeFileSync(
        path.join(artifactDir, `${contractName.replace('.sol', '')}.json`),
        JSON.stringify(artifact, null, 2)
      );
    } else {
      console.error(`❌ ERROR: No contract output found for ${contractName}`);
      allSuccess = false;
    }
  } catch (e) {
    console.error(`❌ ERROR compiling ${contractName}:`, e.message);
    allSuccess = false;
  }
}

console.log(`\n${'='.repeat(60)}`);
if (allSuccess) {
  console.log('✅ ALL CONTRACTS COMPILED SUCCESSFULLY!');
  console.log('='.repeat(60));
  process.exit(0);
} else {
  console.log('❌ COMPILATION FAILED FOR SOME CONTRACTS');
  console.log('='.repeat(60));
  process.exit(1);
}
