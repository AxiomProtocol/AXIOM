const express = require('express');
const { exec } = require('child_process');
const { requireAdmin } = require('./auth');
const router = express.Router();
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// Apply admin authorization middleware to all routes
router.use(requireAdmin);

// Get token information
router.get('/token-info', async (req, res) => {
  try {
    const { stdout, stderr } = await execPromise('npx hardhat run scripts/token-info.js --network polygon');
    
    // Parse the output to get structured data
    const data = parseTokenInfoOutput(stdout);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Token info error:', stderr);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching token info:', error);
    res.status(500).json({ error: 'Failed to fetch token information' });
  }
});

// Run token verification
router.post('/verify-token', async (req, res) => {
  try {
    const { stdout, stderr } = await execPromise('npx hardhat run scripts/verify-token.js --network polygon');
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Token verification error:', stderr);
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ 
      success: true, 
      message: 'Token verification complete',
      details: stdout 
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Deploy new token (should rarely be used)
router.post('/deploy-token', async (req, res) => {
  try {
    const { stdout, stderr } = await execPromise('npx hardhat run scripts/deploy-token.js --network polygon');
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('Token deployment error:', stderr);
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ 
      success: true, 
      message: 'Token deployment complete',
      details: stdout 
    });
  } catch (error) {
    console.error('Error deploying token:', error);
    res.status(500).json({ error: 'Failed to deploy token' });
  }
});

// Get deployment information
router.get('/deployment-info', (req, res) => {
  try {
    const deploymentFilePath = path.join(process.cwd(), 'token-deployment-info.json');
    
    if (fs.existsSync(deploymentFilePath)) {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
      res.json(deploymentInfo);
    } else {
      res.status(404).json({ error: 'Deployment info not found' });
    }
  } catch (error) {
    console.error('Error reading deployment info:', error);
    res.status(500).json({ error: 'Failed to read deployment information' });
  }
});

// Helper function to parse the token info output
function parseTokenInfoOutput(output) {
  try {
    const lines = output.split('\n');
    const result = {
      address: '',
      name: '',
      symbol: '',
      decimals: 0,
      totalSupply: '',
      owner: '',
      balances: {}
    };
    
    // Extract information using regex
    const addressMatch = output.match(/SWF token address: (0x[a-fA-F0-9]{40})/);
    if (addressMatch) result.address = addressMatch[1];
    
    const nameMatch = output.match(/Name: ([^\n]+)/);
    if (nameMatch) result.name = nameMatch[1];
    
    const symbolMatch = output.match(/Symbol: ([^\n]+)/);
    if (symbolMatch) result.symbol = symbolMatch[1];
    
    const decimalsMatch = output.match(/Decimals: ([0-9]+)/);
    if (decimalsMatch) result.decimals = parseInt(decimalsMatch[1]);
    
    const supplyMatch = output.match(/Total Supply: ([0-9.]+) SWF/);
    if (supplyMatch) result.totalSupply = supplyMatch[1];
    
    const ownerMatch = output.match(/Token Owner:[^0]+([0x][a-fA-F0-9]{40})/);
    if (ownerMatch) result.owner = ownerMatch[1];
    
    // Extract wallet balances
    const currentWalletMatch = output.match(/Current Wallet:\s*------------------\s*Address: (0x[a-fA-F0-9]{40})\s*Balance: ([0-9.]+) SWF/);
    if (currentWalletMatch) {
      result.balances.currentWallet = {
        address: currentWalletMatch[1],
        balance: currentWalletMatch[2]
      };
    }
    
    const distributorMatch = output.match(/Main Distributor:\s*------------------\s*Address: (0x[a-fA-F0-9]{40})\s*Balance: ([0-9.]+) SWF/);
    if (distributorMatch) {
      result.balances.mainDistributor = {
        address: distributorMatch[1],
        balance: distributorMatch[2]
      };
    }
    
    const treasuryMatch = output.match(/Treasury Wallet:\s*------------------\s*Address: (0x[a-fA-F0-9]{40})\s*Balance: ([0-9.]+) SWF/);
    if (treasuryMatch) {
      result.balances.treasury = {
        address: treasuryMatch[1],
        balance: treasuryMatch[2]
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing token info output:', error);
    return { error: 'Failed to parse token information' };
  }
}

module.exports = router;