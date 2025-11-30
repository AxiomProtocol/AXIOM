/**
 * Direct Bytecode Analysis Tool for SWF Token
 * 
 * This specialized tool analyzes the exact differences between the on-chain bytecode
 * and various compiled versions to generate a report with specific mismatch details.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { ethers } = require('ethers');
const axios = require('axios');

// The address of the deployed contract
const CONTRACT_ADDRESS = "0xa0b0AaCbf4E7261691689e5F240C278fB295edF7";

// The transaction hash from deployment
const DEPLOYMENT_TX_HASH = "0x13c3d11fe7bcc40bd45acf107ee9d3398575030106cfdad74bd0dca123dd6c6e";

// Output file for the report
const REPORT_FILE = path.join(__dirname, '../bytecode-analysis-report.md');

// Track total function calls for precise debug in case we hit a 4096 char limit
let functionCallCount = 0;

/**
 * Fetches the deployed bytecode directly from the blockchain
 */
async function getDeployedBytecode() {
  try {
    console.log(`Fetching deployed bytecode for ${CONTRACT_ADDRESS}...`);
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ALCHEMY_API_KEY
        ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://polygon-rpc.com"
    );
    
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);
    const size = (bytecode.length - 2) / 2;
    
    console.log(`Fetched deployed bytecode (${size} bytes)`);
    
    // Look for function signatures to help with analysis
    const signatures = {};
    
    // Common ERC20 function signatures
    const commonSignatures = {
      '06fdde03': 'name()',
      '095ea7b3': 'approve(address,uint256)',
      '18160ddd': 'totalSupply()',
      '23b872dd': 'transferFrom(address,address,uint256)',
      '313ce567': 'decimals()',
      '70a08231': 'balanceOf(address)',
      '95d89b41': 'symbol()',
      'a9059cbb': 'transfer(address,uint256)',
      'dd62ed3e': 'allowance(address,address)',
      // AccessControl functions
      '248a9ca3': 'getRoleAdmin(bytes32)',
      '2f2ff15d': 'grantRole(bytes32,address)',
      '36568abe': 'renounceRole(bytes32,address)',
      '91d14854': 'hasRole(bytes32,address)',
      // Pausable functions
      '5c975abb': 'paused()',
      '8456cb59': 'pause()',
      '3f4ba83a': 'unpause()',
      // ERC20Burnable functions
      '42966c68': 'burn(uint256)',
      '79cc6790': 'burnFrom(address,uint256)',
    };
    
    for (const [sig, name] of Object.entries(commonSignatures)) {
      if (bytecode.includes(sig)) {
        signatures[sig] = name;
      }
    }
    
    return { bytecode, size, signatures };
  } catch (error) {
    console.error('Error fetching deployed bytecode:', error);
    throw error;
  }
}

/**
 * Gets the transaction data and attempts to extract constructor args
 */
async function getTransactionData() {
  try {
    console.log(`Fetching transaction data for ${DEPLOYMENT_TX_HASH}...`);
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ALCHEMY_API_KEY
        ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://polygon-rpc.com"
    );
    
    const tx = await provider.getTransaction(DEPLOYMENT_TX_HASH);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    const receipt = await provider.getTransactionReceipt(DEPLOYMENT_TX_HASH);
    if (!receipt || !receipt.contractAddress) {
      throw new Error('Not a contract creation transaction');
    }
    
    if (receipt.contractAddress.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      console.warn(`Warning: Created contract address (${receipt.contractAddress}) doesn't match our target (${CONTRACT_ADDRESS})`);
    }
    
    return { 
      tx, 
      receipt,
      data: tx.data,
      dataSize: (tx.data.length - 2) / 2
    };
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    throw error;
  }
}

/**
 * Cleans up Solidity source code to a uniform format
 */
function cleanSource(source) {
  // Convert line endings to LF
  source = source.replace(/\r\n/g, '\n');
  
  // Remove extra whitespace
  source = source.replace(/\s+$/gm, '');
  
  // Normalize import paths to fix case
  source = source.replace(
    /@openzeppelin\/contracts\//gi, 
    '@openzeppelin/contracts/'
  );
  
  return source;
}

/**
 * Runs the compiler with specific settings and returns bytecode
 */
async function compileWithSettings(settings) {
  functionCallCount++;
  console.log(`[Call #${functionCallCount}] Compiling with settings:`, settings);
  
  return new Promise((resolve, reject) => {
    const tempDir = path.resolve(__dirname, '../temp-compile-' + functionCallCount);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create hardhat config
    const configPath = path.resolve(tempDir, 'hardhat.config.js');
    const configContent = `
      module.exports = {
        solidity: {
          version: "${settings.version}",
          settings: {
            optimizer: {
              enabled: ${settings.optimizer.enabled},
              runs: ${settings.optimizer.runs}
            },
            evmVersion: "${settings.evmVersion}",
            outputSelection: {
              "*": {
                "*": [
                  "abi",
                  "evm.bytecode",
                  "evm.deployedBytecode",
                  "evm.methodIdentifiers"
                ]
              }
            }
          }
        }
      };
    `;
    fs.writeFileSync(configPath, configContent);
    
    // Create contracts directory
    const contractsDir = path.resolve(tempDir, 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    
    // Decide whether to use full contract or flattened
    let sourceFile;
    if (settings.useFlattened) {
      sourceFile = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.flat.sol');
    } else {
      sourceFile = path.resolve(__dirname, '../contracts/verified/SovranWealthFund.sol');
    }
    
    // Create the source file in the temp directory
    let source = fs.readFileSync(sourceFile, 'utf8');
    
    // Apply force pragma if needed
    if (settings.forceVersion) {
      source = source.replace(
        /pragma solidity \^0\.8\.\d+;/g,
        `pragma solidity ${settings.version};`
      );
    }
    
    // Handle interface directories if needed
    if (!settings.useFlattened) {
      const interfacesDir = path.resolve(contractsDir, 'interfaces');
      if (!fs.existsSync(interfacesDir)) {
        fs.mkdirSync(interfacesDir, { recursive: true });
      }
      
      // Copy interfaces
      const interfaceFiles = [
        'IAggregatorV3Interface.sol',
        'IPegManagement.sol',
        'ISovranWealthFund.sol'
      ];
      
      for (const file of interfaceFiles) {
        const interfaceSource = fs.readFileSync(
          path.resolve(__dirname, `../contracts/verified/interfaces/${file}`),
          'utf8'
        );
        
        // Apply force pragma if needed
        let processedSource = interfaceSource;
        if (settings.forceVersion) {
          processedSource = processedSource.replace(
            /pragma solidity \^0\.8\.\d+;/g,
            `pragma solidity ${settings.version};`
          );
        }
        
        fs.writeFileSync(
          path.resolve(interfacesDir, file),
          processedSource
        );
      }
    }
    
    // Write contract source
    const contractPath = path.resolve(contractsDir, 'SovranWealthFund.sol');
    fs.writeFileSync(contractPath, source);
    
    // Run compiler
    console.log(`Running compiler in directory: ${tempDir}`);
    const cmd = `cd ${tempDir} && npx hardhat compile`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compilation error: ${error.message}`);
        if (stderr) console.error(stderr);
        return reject(error);
      }
      
      // Try to read the compiled artifact
      try {
        const artifactPath = path.resolve(
          tempDir, 
          'artifacts/contracts/SovranWealthFund.sol',
          'SovranWealthFund.json'
        );
        
        if (!fs.existsSync(artifactPath)) {
          return reject(new Error('Compiled artifact not found'));
        }
        
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Extract method identifiers to help analyze bytecode
        const methodIds = {};
        if (artifact.evm && artifact.evm.methodIdentifiers) {
          for (const [method, id] of Object.entries(artifact.evm.methodIdentifiers)) {
            methodIds[id] = method;
          }
        }
        
        resolve({
          settings,
          bytecode: artifact.evm.bytecode.object,
          deployedBytecode: artifact.evm.deployedBytecode.object,
          size: artifact.evm.deployedBytecode.object.length / 2,
          methodIds
        });
      } catch (err) {
        reject(err);
      } finally {
        // Clean up temp directory to save space
        try {
          fs.rmdirSync(tempDir, { recursive: true });
        } catch (e) {
          console.warn(`Failed to clean up temp directory: ${e.message}`);
        }
      }
    });
  });
}

/**
 * Compares bytecodes and returns a detailed comparison
 */
function compareDeployedBytecodes(deployed, compiled, methodIds = {}) {
  console.log(`Comparing bytecodes...`);
  
  // Ensure both bytecodes start with 0x
  const deployedCode = deployed.startsWith('0x') ? deployed : `0x${deployed}`;
  const compiledCode = compiled.startsWith('0x') ? compiled : `0x${compiled}`;
  
  // Calculate sizes
  const deployedSize = (deployedCode.length - 2) / 2;
  const compiledSize = (compiledCode.length - 2) / 2;
  
  console.log(`Deployed bytecode size: ${deployedSize} bytes`);
  console.log(`Compiled bytecode size: ${compiledSize} bytes`);
  
  // Check for exact match
  if (deployedCode === compiledCode) {
    return {
      match: true,
      deployedSize,
      compiledSize,
      matchPercentage: 100,
      message: 'Perfect bytecode match!'
    };
  }
  
  // Count matching bytes
  let matchingBytes = 0;
  const minLength = Math.min(deployedCode.length, compiledCode.length);
  
  for (let i = 2; i < minLength; i += 2) {
    if (deployedCode.substring(i, i + 2) === compiledCode.substring(i, i + 2)) {
      matchingBytes++;
    }
  }
  
  // Calculate match percentage
  const matchPercentage = (matchingBytes / Math.max(deployedSize, compiledSize)) * 100;
  
  // Find where the differences start
  let diffStartIdx = 2;  // Start after 0x
  for (; diffStartIdx < minLength; diffStartIdx += 2) {
    if (deployedCode.substring(diffStartIdx, diffStartIdx + 2) !== 
        compiledCode.substring(diffStartIdx, diffStartIdx + 2)) {
      break;
    }
  }
  
  // Check if diff is within a function
  let functionContext = null;
  for (const [id, name] of Object.entries(methodIds)) {
    const offset = deployedCode.indexOf(id, 2);
    if (offset > 0 && offset < diffStartIdx && offset + id.length > diffStartIdx) {
      functionContext = `Function ${name} (ID: ${id})`;
      break;
    }
  }
  
  // Check for metadata hash differences (usually at the end)
  const metadataHashMatch = false; // Implementation goes here
  
  // Calculate total different bytes and segment analysis
  const differentBytes = Math.max(deployedSize, compiledSize) - matchingBytes;
  
  // Find all continuous segments of differences
  let segments = [];
  let inDiffSegment = false;
  let segmentStart = 0;
  
  for (let i = 2; i < minLength; i += 2) {
    const deployedByte = deployedCode.substring(i, i + 2);
    const compiledByte = compiledCode.substring(i, i + 2);
    
    if (deployedByte !== compiledByte && !inDiffSegment) {
      inDiffSegment = true;
      segmentStart = i;
    } else if (deployedByte === compiledByte && inDiffSegment) {
      inDiffSegment = false;
      segments.push({
        start: segmentStart,
        end: i - 2,
        size: (i - segmentStart) / 2
      });
    }
  }
  
  // Handle case where difference extends to the end
  if (inDiffSegment) {
    segments.push({
      start: segmentStart,
      end: minLength - 2,
      size: (minLength - segmentStart) / 2
    });
  }
  
  // Handle different lengths
  if (deployedCode.length !== compiledCode.length) {
    const lengthDiff = Math.abs(deployedCode.length - compiledCode.length) / 2;
    segments.push({
      start: Math.min(deployedCode.length, compiledCode.length),
      end: Math.max(deployedCode.length, compiledCode.length),
      size: lengthDiff,
      lengthDifference: true
    });
  }
  
  // Prepare result
  return {
    match: false,
    deployedSize,
    compiledSize,
    matchingBytes,
    diffStartIdx,
    matchPercentage,
    functionContext,
    metadataHashMatch,
    differentBytes,
    segments,
    message: `First difference at byte offset: ${diffStartIdx/2 - 1}`
  };
}

/**
 * Analyzes bytecode differences and creates a markdown report
 */
async function analyzeBytecode() {
  const report = [
    '# SWF Token Bytecode Analysis Report',
    '',
    `Generated on: ${new Date().toLocaleString()}`,
    '',
    '## Contract Information',
    '',
    `- Contract Address: ${CONTRACT_ADDRESS}`,
    '',
    '## Deployed Bytecode Analysis',
    ''
  ];
  
  try {
    // Fetch deployed bytecode
    const deployed = await getDeployedBytecode();
    report.push(`- Deployed bytecode size: ${deployed.size} bytes`);
    report.push(`- Function signatures detected: ${Object.keys(deployed.signatures).length}`);
    
    if (Object.keys(deployed.signatures).length > 0) {
      report.push('- Detected functions:');
      for (const [sig, name] of Object.entries(deployed.signatures)) {
        report.push(`  - ${sig}: ${name}`);
      }
    }
    
    report.push('');
    
    // Compiler settings to try
    const settingsToTry = [
      // Try with correct pragma version
      {
        version: "0.8.17",
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "london",
        useFlattened: false,
        forceVersion: false,
        description: "Standard 0.8.17 with optimization (200 runs)"
      },
      {
        version: "0.8.17",
        optimizer: { enabled: false, runs: 0 },
        evmVersion: "london",
        useFlattened: false,
        forceVersion: false,
        description: "Standard 0.8.17 without optimization"
      },
      // Try with flattened file
      {
        version: "0.8.17",
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "london",
        useFlattened: true,
        forceVersion: false,
        description: "Flattened 0.8.17 with optimization (200 runs)"
      },
      // Try with different pragma versions
      {
        version: "0.8.16",
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "london",
        useFlattened: false,
        forceVersion: true,
        description: "Forced 0.8.16 with optimization (200 runs)"
      },
      {
        version: "0.8.18",
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "london",
        useFlattened: false,
        forceVersion: true,
        description: "Forced 0.8.18 with optimization (200 runs)"
      },
      // Try different optimization settings
      {
        version: "0.8.17",
        optimizer: { enabled: true, runs: 1000 },
        evmVersion: "london",
        useFlattened: false,
        forceVersion: false,
        description: "Standard 0.8.17 with high optimization (1000 runs)"
      },
      // Try different EVM versions
      {
        version: "0.8.17",
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "paris",
        useFlattened: false,
        forceVersion: false,
        description: "Standard 0.8.17 with Paris EVM"
      }
    ];
    
    // Compile with each setting and compare
    report.push('## Compilation Results');
    report.push('');
    
    const results = [];
    let bestMatch = null;
    let bestMatchPercentage = 0;
    
    for (const settings of settingsToTry) {
      try {
        report.push(`### ${settings.description}`);
        report.push('');
        
        const compiled = await compileWithSettings(settings);
        const comparison = compareDeployedBytecodes(
          deployed.bytecode, 
          compiled.deployedBytecode,
          compiled.methodIds
        );
        
        // Store result for later analysis
        const result = {
          settings,
          compiled,
          comparison
        };
        results.push(result);
        
        // Update best match
        if (comparison.matchPercentage > bestMatchPercentage) {
          bestMatch = result;
          bestMatchPercentage = comparison.matchPercentage;
        }
        
        // Add result to report
        report.push(`- Compiled bytecode size: ${compiled.size} bytes`);
        report.push(`- Match percentage: ${comparison.matchPercentage.toFixed(2)}%`);
        report.push(`- First difference at byte: ${comparison.diffStartIdx/2 - 1}`);
        
        if (comparison.functionContext) {
          report.push(`- Difference occurs within: ${comparison.functionContext}`);
        }
        
        report.push(`- Total different bytes: ${comparison.differentBytes}`);
        report.push('');
        
        if (comparison.segments.length > 0) {
          report.push('#### Difference Segments:');
          for (const segment of comparison.segments) {
            if (segment.lengthDifference) {
              report.push(`- Length difference: ${segment.size} bytes`);
            } else {
              const start = segment.start/2 - 1;
              const end = segment.end/2 - 1;
              report.push(`- Bytes ${start}-${end} (${segment.size} bytes)`);
            }
          }
          report.push('');
        }
        
        // Add bytecode snippets for first difference
        if (!comparison.match) {
          const contextSize = 20; // Show 20 bytes before and after the difference
          const start = Math.max(2, comparison.diffStartIdx - contextSize * 2);
          const end = Math.min(
            comparison.diffStartIdx + contextSize * 2,
            Math.min(deployed.bytecode.length, compiled.deployedBytecode.length)
          );
          
          report.push('#### Bytecode Diff Preview:');
          report.push('```');
          report.push(`Deployed: ${deployed.bytecode.substring(start, end)}`);
          report.push(`Compiled: ${compiled.deployedBytecode.substring(start, end)}`);
          report.push(`          ${''.padEnd((comparison.diffStartIdx - start) / 2, ' ')}^ Difference starts here`);
          report.push('```');
          report.push('');
        }
      } catch (error) {
        report.push(`❌ Compilation failed: ${error.message}`);
        report.push('');
      }
    }
    
    // Summarize findings
    report.push('## Summary and Recommendations');
    report.push('');
    
    if (bestMatch && bestMatch.comparison.matchPercentage > 95) {
      report.push(`✅ Best match: **${bestMatch.settings.description}** with ${bestMatch.comparison.matchPercentage.toFixed(2)}% match`);
      report.push('');
      report.push('### Recommended Verification Method:');
      report.push('');
      report.push('1. Use the following compiler settings:');
      report.push(`   - Solidity Version: ${bestMatch.settings.version}`);
      report.push(`   - Optimization: ${bestMatch.settings.optimizer.enabled ? 'Enabled' : 'Disabled'}`);
      report.push(`   - Runs: ${bestMatch.settings.optimizer.runs}`);
      report.push(`   - EVM Version: ${bestMatch.settings.evmVersion}`);
      report.push(`   - Use flattened source: ${bestMatch.settings.useFlattened ? 'Yes' : 'No'}`);
      report.push('');
      report.push('2. For manual verification on Polygonscan:');
      report.push(`   - Go to https://polygonscan.com/address/${CONTRACT_ADDRESS}#code`);
      report.push('   - Click "Verify & Publish"');
      report.push(`   - Select Single File verification`);
      report.push(`   - Use compiler version v${bestMatch.settings.version}`);
      report.push(`   - Set optimization to ${bestMatch.settings.optimizer.enabled ? 'Yes' : 'No'} with ${bestMatch.settings.optimizer.runs} runs`);
      report.push(`   - Copy the ${bestMatch.settings.useFlattened ? 'flattened' : 'regular'} source code`);
      report.push('');
    } else if (bestMatch) {
      report.push(`⚠️ Best match is only ${bestMatch.comparison.matchPercentage.toFixed(2)}% with ${bestMatch.settings.description}`);
      report.push('');
      report.push('The compiled bytecode differs significantly from the deployed bytecode. This could be due to:');
      report.push('1. Different compiler version used during actual deployment');
      report.push('2. Constructor arguments not being accounted for');
      report.push('3. Different source code than what we currently have');
      report.push('4. Library linking or other deployment parameters');
      report.push('');
      report.push('Try manual verification with different compiler versions and settings.');
      report.push('');
    } else {
      report.push('❌ Could not find any good matches.');
      report.push('');
    }
    
    report.push('## Next Steps');
    report.push('');
    report.push('If the recommended settings do not work, consider:');
    report.push('');
    report.push('1. Manual verification through Polygonscan UI with multiple settings');
    report.push('2. Using Remix IDE for verification (often has better results)');
    report.push('3. Checking if the contract depends on any libraries');
    report.push('4. Verifying with a different contract source if available');
    
  } catch (error) {
    report.push(`## Error During Analysis`);
    report.push('');
    report.push(`❌ Analysis failed: ${error.message}`);
    console.error('Error during analysis:', error);
  }
  
  // Write report to file
  fs.writeFileSync(REPORT_FILE, report.join('\n'));
  console.log(`Report written to ${REPORT_FILE}`);
  
  return REPORT_FILE;
}

/**
 * Main function
 */
async function main() {
  console.log('SWF Token Bytecode Analysis Tool');
  console.log('--------------------------------');
  
  try {
    const reportPath = await analyzeBytecode();
    console.log(`\nAnalysis complete! Report saved to: ${reportPath}`);
    console.log('Use this report to determine the exact compiler settings needed for verification');
  } catch (error) {
    console.error(`Error during analysis:`, error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });