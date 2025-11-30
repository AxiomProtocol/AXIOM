require('dotenv').config();
const axios = require('axios');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const GUID = 'd1alvpwiaswmqzdjsig8tfxn9vckp5sbmewzke48vmldpurqxl'; // From the latest verification attempt

async function checkVerificationStatus() {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }
    
    console.log(`Checking verification status for GUID: ${GUID}`);
    
    const statusParams = {
      apikey: apiKey,
      module: 'contract',
      action: 'checkverifystatus',
      guid: GUID
    };
    
    const response = await axios.get(POLYGONSCAN_API_URL, {
      params: statusParams
    });
    
    const data = response.data;
    console.log(`Verification status response:`, data);
    
    // Check the verification result
    if (data.status === '1') {
      console.log('✅ Contract verification completed successfully!');
      return { success: true, status: 'complete' };
    } else {
      if (data.result.includes('Pending')) {
        console.log('⏳ Verification still in progress...');
      } else {
        console.error('❌ Verification failed:', data.result);
      }
      return { success: false, error: data.result };
    }
  } catch (error) {
    console.error('Error checking verification status:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the check function
checkVerificationStatus()
  .then(result => {
    console.log('Check completed with result:', result);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });