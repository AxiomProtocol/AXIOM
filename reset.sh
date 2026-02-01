#!/bin/bash

echo "---------------------------------------------"
echo "Starting Replit Cleanup and Ethereum Reset..."
echo "---------------------------------------------"

# Step 1: Remove old Polygon environment variables
echo "Cleaning up old .env variables..."
sed -i '/ALCHEMY/d' .env || true
sed -i '/POLYGON/d' .env || true

# Step 2: Set correct Ethereum environment variables
echo "Setting up Ethereum Mainnet connection..."
cat <<EOT >> .env
PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
PRIVATE_KEY=YOUR_PRIVATE_KEY
CONTRACT_ADDRESS=YOUR_VERIFIED_SWF_CONTRACT_ADDRESS
EOT

# Step 3: Remove old Polygon dependencies if installed
echo "Checking for old Polygon dependencies..."
npm uninstall @maticnetwork/maticjs || true
npm uninstall @maticnetwork/maticjs-ethers || true
npm uninstall polygon-js || true

# Step 4: Ensure ethers.js and dotenv are installed
echo "Installing required dependencies..."
npm install ethers dotenv --save

# Step 5: Check and update provider connection script
echo "Updating provider connection..."
if grep -q "polygon" ./scripts/connectSWF.js; then
  sed -i 's|.*new ethers.providers.JsonRpcProvider.*|const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);|' ./scripts/connectSWF.js
else
  echo "No Polygon reference found in connection script, good."
fi

# Step 6: Final confirmation
echo "---------------------------------------------"
echo "Replit Cleaned and Updated for Ethereum Mainnet!"
echo "Please manually replace the placeholders:"
echo "  - YOUR_PRIVATE_KEY"
echo "  - YOUR_VERIFIED_SWF_CONTRACT_ADDRESS"
echo "inside the .env file."
echo "---------------------------------------------"