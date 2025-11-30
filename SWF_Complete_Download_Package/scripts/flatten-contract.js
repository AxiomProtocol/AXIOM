/**
 * Flatten Contract Script for SWF
 * 
 * This script creates a flattened version of the contract that includes all its dependencies
 * making it easier to verify on Polygonscan.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Contract name to flatten (without .sol extension)
const CONTRACT_NAME = 'SovranWealthFund';

async function flattenContract() {
  try {
    console.log(`Flattening ${CONTRACT_NAME} contract...`);
    
    // Path to the contract file
    const contractPath = path.join(__dirname, '..', 'contracts', `${CONTRACT_NAME}.sol`);
    
    // Path to save the flattened contract
    const flattenedDir = path.join(__dirname, '..', 'contracts', 'flattened');
    const flattenedPath = path.join(flattenedDir, `${CONTRACT_NAME}Flattened.sol`);
    
    // Create flattened directory if it doesn't exist
    if (!fs.existsSync(flattenedDir)) {
      console.log('Creating flattened directory...');
      fs.mkdirSync(flattenedDir, { recursive: true });
    }
    
    // Command to flatten the contract using Hardhat
    const flattenCommand = `npx hardhat flatten ${contractPath} > ${flattenedPath}`;
    
    console.log(`Executing: ${flattenCommand}`);
    const { stdout, stderr } = await execPromise(flattenCommand);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Error flattening contract:', stderr);
      return false;
    }
    
    // Check if the flattened file was created
    if (fs.existsSync(flattenedPath)) {
      const stats = fs.statSync(flattenedPath);
      console.log(`Successfully flattened ${CONTRACT_NAME} contract (${stats.size} bytes)`);
      
      // Fix license identifier issues if needed - Hardhat flattening can result in duplicate SPDX identifiers
      console.log('Fixing license identifiers...');
      let content = fs.readFileSync(flattenedPath, 'utf8');
      
      // Add a comment to mark this as a flattened file
      content = `// FLATTENED VERSION OF ${CONTRACT_NAME} FOR POLYGONSCAN VERIFICATION\n${content}`;
      
      // Remove duplicate SPDX license identifiers
      let lines = content.split('\n');
      let licenseFound = false;
      let fixedLines = [];
      
      for (const line of lines) {
        if (line.includes('SPDX-License-Identifier')) {
          if (!licenseFound) {
            fixedLines.push(line);
            licenseFound = true;
          }
        } else {
          fixedLines.push(line);
        }
      }
      
      // Write the fixed content back to the file
      fs.writeFileSync(flattenedPath, fixedLines.join('\n'), 'utf8');
      console.log('License identifiers fixed.');
      
      // Also create a backup in the main contracts directory
      const backupPath = path.join(__dirname, '..', 'contracts', `${CONTRACT_NAME}Flattened.sol`);
      fs.copyFileSync(flattenedPath, backupPath);
      console.log(`Backup copy saved to: ${backupPath}`);
      
      return true;
    } else {
      console.error('Failed to create flattened contract file.');
      return false;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  flattenContract()
    .then(success => {
      if (success) {
        console.log('Contract flattening completed successfully!');
        process.exit(0);
      } else {
        console.error('Contract flattening failed.');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = { flattenContract };