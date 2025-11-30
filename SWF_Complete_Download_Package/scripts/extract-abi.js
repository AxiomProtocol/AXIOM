require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Polygon mainnet API URL 
const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';
const CONTRACT_ADDRESS = '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
const OUTPUT_FILE = 'SovranWealthFund.abi.json';

async function extractABI() {
  try {
    // Get API key from environment
    const apiKey = process.env.POLYGONSCAN_API_KEY;
    if (!apiKey) {
      console.error('Polygonscan API key not found in environment variables');
      return { success: false, error: 'Missing API key' };
    }

    console.log(`Extracting ABI for contract at: ${CONTRACT_ADDRESS}`);
    
    // Request ABI from Polygonscan
    const params = {
      apikey: apiKey,
      module: 'contract',
      action: 'getabi',
      address: CONTRACT_ADDRESS
    };
    
    const response = await axios.get(POLYGONSCAN_API_URL, { params });
    const data = response.data;

    if (data.status === '1' && data.result) {
      console.log('Successfully retrieved contract ABI');
      
      // Parse the ABI to ensure it's valid JSON
      try {
        const abiJSON = JSON.parse(data.result);
        console.log(`ABI contains ${abiJSON.length} function definitions`);
        
        // Save the ABI to a file
        fs.writeFileSync(OUTPUT_FILE, data.result);
        console.log(`✅ ABI saved to ${OUTPUT_FILE}`);
        
        // Log the functions
        console.log('\nContract Functions:');
        abiJSON.forEach(item => {
          if (item.type === 'function') {
            const inputs = item.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            console.log(`- ${item.name}(${inputs})`);
          }
        });
        
        return { success: true, abi: abiJSON };
      } catch (parseError) {
        console.error('Error parsing ABI JSON:', parseError.message);
        return { success: false, error: parseError.message };
      }
    } else {
      console.error('Failed to retrieve contract ABI:', data.message || data.result);
      return { success: false, error: data.message || data.result };
    }
  } catch (error) {
    console.error('Error extracting ABI:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the extraction function
extractABI()
  .then(result => {
    if (result.success) {
      console.log('\nABI extraction completed successfully');
    } else {
      console.error('\nABI extraction failed:', result.error);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });