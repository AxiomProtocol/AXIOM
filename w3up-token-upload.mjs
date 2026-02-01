// Import required modules
import dotenv from 'dotenv';
import { create } from '@web3-storage/w3up-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
dotenv.config();

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The DID (Decentralized Identifier) key provided
const DID_KEY = 'did:key:z6MkhSGtxHMRvprAUyo41EGQ28xAfaaz3nNEPkLrJ8kxm7M6';

// Path to token metadata file
const metadataPath = path.join(__dirname, 'SovranWealthFund.token.json');

// Function to create a File object from the metadata file
function makeFileFromPath(filePath) {
  const content = fs.readFileSync(filePath);
  const basename = path.basename(filePath);
  return new File([content], basename, { type: 'application/json' });
}

async function main() {
  try {
    console.log('Starting upload to IPFS using w3up client...');
    
    // Create a client
    const client = await create();
    
    // Try to authorize with the provided DID key
    console.log(`Authorizing with DID key: ${DID_KEY}`);
    await client.setCurrentSpace(DID_KEY);
    
    // Read the token metadata
    console.log(`Reading metadata from: ${metadataPath}`);
    const metadataFile = makeFileFromPath(metadataPath);
    
    // Upload to IPFS
    console.log('Uploading to IPFS...');
    const uploadResult = await client.uploadFile(metadataFile);
    
    console.log('\n✅ Upload successful!');
    console.log('IPFS CID:', uploadResult.toString());
    console.log('\nYour metadata is available at:');
    console.log(`https://w3s.link/ipfs/${uploadResult.toString()}`);
    
    // Save the CID information
    const cidInfo = {
      cid: uploadResult.toString(),
      timestamp: new Date().toISOString(),
      gateway_url: `https://w3s.link/ipfs/${uploadResult.toString()}`
    };
    
    fs.writeFileSync('w3up-cid.json', JSON.stringify(cidInfo, null, 2));
    console.log('\nCID information saved to w3up-cid.json');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.name === 'UnknownSpaceError') {
      console.error('\nThe DID key provided was not recognized or does not have proper permissions.');
      console.error('Please make sure you are using the correct DID key associated with your web3.storage account.');
    }
  }
}

main().catch(console.error);