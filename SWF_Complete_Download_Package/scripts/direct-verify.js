require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const POLYGONSCAN_EXPLORER_URL = 'https://polygonscan.com';

// Contract details
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
const CONTRACT_NAME = 'SovranWealthFund';

// Compiler settings - use one of Polygonscan's supported versions
const COMPILER_VERSION = "v0.8.17+commit.8df45f5f";

// Simplified ERC20 source for verification
const SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SovranWealthFund is ERC20, ERC20Burnable, Pausable, Ownable {
    constructor() ERC20("Sovran Wealth Fund", "SWF") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}`;

async function verifyContract() {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Starting verification for SWF Token at address: ${CONTRACT_ADDRESS}`);
    console.log(`Using compiler version: ${COMPILER_VERSION}`);

    // Create verification request data
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', CONTRACT_ADDRESS);
    formData.append('sourceCode', SOURCE_CODE);
    formData.append('codeformat', 'solidity-single-file');
    formData.append('contractname', CONTRACT_NAME);
    formData.append('compilerversion', COMPILER_VERSION);
    formData.append('optimizationUsed', '1');
    formData.append('runs', '200');
    formData.append('evmversion', '');
    formData.append('licenseType', '3'); // MIT License

    console.log('Submitting verification request to Polygonscan...');

    // Submit verification request
    const response = await axios.post(POLYGONSCAN_API_URL, formData, {
      headers: formData.getHeaders()
    });

    const data = response.data;
    console.log('Verification response:', data);

    if (data.status === '1') {
      console.log(`\n✅ Verification submitted successfully! GUID: ${data.result}`);
      console.log(`\nTo check verification status manually, visit:\n${POLYGONSCAN_EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code`);
      
      return { success: true, guid: data.result };
    } else {
      console.error('\n❌ Verification submission failed:', data.result);
      return { success: false, error: data.result };
    }
  } catch (error) {
    console.error('\n❌ Error during contract verification:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    return { success: false, error: error.message };
  }
}

// Run the verification function
verifyContract()
  .then(result => {
    if (result.success) {
      console.log('\nVerification process initiated successfully!');
      console.log('Please allow some time for Polygonscan to process the verification.');
    } else {
      console.error('\nVerification process failed:', result.error);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });