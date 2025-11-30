require('dotenv').config();
const axios = require('axios');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const POLYGONSCAN_EXPLORER_URL = 'https://polygonscan.com';

// Contract details
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';

async function checkContractVerification() {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Checking verification status for contract at: ${CONTRACT_ADDRESS}`);
    
    // Check if source code is available
    const params = {
      apikey: apiKey,
      module: 'contract',
      action: 'getsourcecode',
      address: CONTRACT_ADDRESS
    };
    
    const response = await axios.get(POLYGONSCAN_API_URL, { params });
    const data = response.data;

    if (data.status === '1' && data.result.length > 0) {
      const contractInfo = data.result[0];
      console.log('Contract Info:', {
        ContractName: contractInfo.ContractName,
        CompilerVersion: contractInfo.CompilerVersion,
        Implementation: contractInfo.Implementation,
        ABI: contractInfo.ABI ? 'Available' : 'Not Available',
        SourceCode: contractInfo.SourceCode ? 
          (contractInfo.SourceCode.length > 100 ? 
           'Available (' + contractInfo.SourceCode.length + ' chars)' : 
           contractInfo.SourceCode) : 
          'Not Available'
      });
      
      const isVerified = contractInfo.SourceCode && contractInfo.SourceCode.length > 0 && contractInfo.SourceCode !== '{}';
      
      if (isVerified) {
        console.log('\n✅ Contract is verified on Polygonscan!');
        console.log(`View at: ${POLYGONSCAN_EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code`);
        return { success: true, verified: true };
      } else {
        console.log('\n❌ Contract is NOT verified on Polygonscan');
        console.log('You need to run the verification script.');
        return { success: true, verified: false };
      }
    } else {
      console.error('Failed to retrieve contract info:', data.message || 'Unknown error');
      return { success: false, error: data.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error checking contract verification:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the main function
checkContractVerification()
  .then(result => {
    console.log('Check completed with result:', result.success ? 'Success' : 'Failure');
    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });