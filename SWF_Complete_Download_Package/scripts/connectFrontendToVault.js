const fs = require('fs');
const path = require('path');

/**
 * This script generates the necessary configuration files to connect the frontend
 * with the deployed SWFBasketVault and SWF token contracts.
 */
async function main() {
  try {
    console.log("Generating frontend configuration for SWFBasketVault...");
    
    // Check if latest deployment info exists
    const latestDeploymentPath = path.join(__dirname, "../basket-vault-latest.json");
    if (!fs.existsSync(latestDeploymentPath)) {
      throw new Error("SWFBasketVault deployment information not found. Please deploy the contract first.");
    }
    
    // Read deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync(latestDeploymentPath, 'utf8'));
    
    // Create frontend config directory if it doesn't exist
    const configDir = path.join(__dirname, "../frontend/config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Generate contract addresses configuration
    const contractConfig = {
      swfToken: {
        address: deploymentInfo.swfTokenAddress,
        abi: ["function approve(address spender, uint256 amount) public returns (bool)",
              "function balanceOf(address account) public view returns (uint256)",
              "function decimals() public view returns (uint8)"]
      },
      swfBasketVault: {
        address: deploymentInfo.basketVaultAddress,
        abi: ["function deposit(uint256 amount) public",
              "function withdraw(uint256 amount) public",
              "function balanceOf(address account) public view returns (uint256)",
              "function totalDeposited() public view returns (uint256)",
              "function deposits(address account) public view returns (uint256)",
              "function getVaultBalance() public view returns (uint256)"]
      },
      network: deploymentInfo.network
    };
    
    // Save contract configuration for frontend
    const configPath = path.join(configDir, "contracts.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(contractConfig, null, 2)
    );
    
    console.log(`Frontend configuration saved to: ${configPath}`);
    
    // Generate example HTML file to demonstrate usage
    const exampleHtmlPath = path.join(__dirname, "../frontend/vault-example.html");
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWF Basket Vault Demo</title>
  <script src="https://cdn.ethers.io/lib/ethers-5.6.umd.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100 min-h-screen p-4">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8 text-center">Sovran Wealth Fund - Basket Vault</h1>
    
    <div id="vault-app"></div>
    
    <div class="mt-8 bg-white p-4 rounded shadow">
      <h2 class="text-xl font-semibold mb-2">Connection Details</h2>
      <pre id="connection-info" class="bg-gray-100 p-3 rounded overflow-auto"></pre>
    </div>
  </div>

  <script type="text/babel">
    // Import React component (example only - in production this would be properly bundled)
    
    // VaultDeposit component would be imported from './VaultDeposit' in a real app
    // This is a simplified version for demonstration
    function VaultDeposit({ vaultAddress, swfAddress, provider }) {
      const [depositAmount, setDepositAmount] = React.useState("");
      const [withdrawAmount, setWithdrawAmount] = React.useState("");
      const [swfBalance, setSWFBalance] = React.useState("0");
      const [basketBalance, setBasketBalance] = React.useState("0");
      const [loading, setLoading] = React.useState(false);
      const [message, setMessage] = React.useState("");
      const [connected, setConnected] = React.useState(false);
      
      React.useEffect(() => {
        const checkConnection = async () => {
          if (window.ethereum) {
            try {
              // Request account access
              const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
              if (accounts.length > 0) {
                setConnected(true);
                // Update connection info display
                document.getElementById('connection-info').textContent = JSON.stringify({
                  connected: true,
                  account: accounts[0],
                  vaultAddress,
                  swfAddress
                }, null, 2);
              }
            } catch (error) {
              console.error("Error connecting to MetaMask", error);
              setMessage("Failed to connect to wallet");
            }
          } else {
            setMessage("Please install MetaMask to use this application");
          }
        };
        
        checkConnection();
      }, []);
      
      // In the real component, we would implement deposit/withdraw functionality here
      
      if (!connected) {
        return (
          <div className="p-4 text-center">
            <button 
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium"
              onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}
            >
              Connect Wallet
            </button>
            {message && <p className="mt-2 text-red-600">{message}</p>}
          </div>
        );
      }
      
      return (
        <div className="p-4 space-y-4 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold">SWF Basket Vault</h2>
          
          <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded">
            <div>Connected:</div>
            <div className="text-right font-medium">✅</div>
            
            <div>Vault Address:</div>
            <div className="text-right font-medium text-xs truncate">{vaultAddress}</div>
            
            <div>SWF Address:</div>
            <div className="text-right font-medium text-xs truncate">{swfAddress}</div>
          </div>
          
          <div className="text-center py-4">
            <p>This is a demonstration interface. For full functionality, implement the complete VaultDeposit component.</p>
          </div>
        </div>
      );
    }
    
    // Main App
    function App() {
      const [provider, setProvider] = React.useState(null);
      
      React.useEffect(() => {
        const setupProvider = async () => {
          if (window.ethereum) {
            const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(ethersProvider);
          }
        };
        
        setupProvider();
      }, []);
      
      if (!provider) {
        return <div className="text-center py-8">Loading provider...</div>;
      }
      
      // Contract addresses would come from config in a real app
      // For this example, we're using the values from the deployment
      const vaultAddress = "${deploymentInfo.basketVaultAddress}";
      const swfAddress = "${deploymentInfo.swfTokenAddress}";
      
      return (
        <VaultDeposit 
          vaultAddress={vaultAddress}
          swfAddress={swfAddress}
          provider={provider}
        />
      );
    }
    
    // Render the app
    ReactDOM.render(<App />, document.getElementById('vault-app'));
  </script>
</body>
</html>`;

    fs.writeFileSync(exampleHtmlPath, htmlContent);
    console.log(`Example HTML interface saved to: ${exampleHtmlPath}`);
    
    console.log("\nFrontend configuration completed successfully!");
    console.log("\nTo use the SWFBasketVault in your frontend application:");
    console.log("1. Import the VaultDeposit component from 'frontend/VaultDeposit.jsx'");
    console.log("2. Load contract addresses from 'frontend/config/contracts.json'");
    console.log("3. Connect to the user's wallet provider (e.g., MetaMask)");
    console.log("4. See 'frontend/vault-example.html' for a basic example");
    
  } catch (error) {
    console.error("Configuration generation failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main execution:", error);
    process.exit(1);
  });