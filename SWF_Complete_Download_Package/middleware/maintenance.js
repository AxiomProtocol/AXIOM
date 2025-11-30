/**
 * Maintenance Mode Middleware
 * 
 * This middleware restricts access to all application routes except:
 * 1. The landing page and registration routes
 * 2. Admin access with proper authentication
 * 3. Essential static assets
 */

const MAINTENANCE_MODE = false; // Set to false when ready to launch

function maintenanceMiddleware(req, res, next) {
  // Always allow access to these paths
  const allowedPaths = [
    '/',
    '/welcome',
    '/landing',
    '/register', 
    '/api/register',
    '/css',
    '/js',
    '/images',
    '/favicon.ico',
    '/login',
    '/api/login',
  ];
  
  // Check if the path is in the allowed list or starts with any of the allowed prefixes
  const isAllowedPath = allowedPaths.some(path => 
    req.path === path || 
    req.path.startsWith(`${path}/`) ||
    (path.includes('.') && req.path.endsWith(path))
  );
  
  // Always allow static assets
  const isStaticAsset = req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|ttf|woff|woff2)$/i);
  
  // Check if user is authenticated as admin
  const isAdmin = req.session && req.session.loggedIn;
  
  if (MAINTENANCE_MODE && !isAllowedPath && !isStaticAsset && !isAdmin) {
    // Send a maintenance page
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sovran Wealth Fund - Coming Soon</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #000B31 0%, #001952 100%);
            color: white;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          h1 {
            font-size: 42px;
            margin-bottom: 20px;
            background: linear-gradient(90deg, #FFC107, #FF9800);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h2 {
            font-size: 24px;
            margin: 30px 0 15px;
            color: #FFC107;
          }
          p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(90deg, #FFC107, #FF9800);
            color: #000;
            font-weight: bold;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 30px;
            transition: all 0.3s ease;
            margin-top: 20px;
          }
          .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }
          .tokenomics {
            background-color: rgba(0,0,0,0.2);
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
          }
          .tokenomics ul {
            list-style-type: none;
            padding-left: 10px;
            columns: 2;
          }
          .tokenomics li {
            margin-bottom: 10px;
            padding-left: 20px;
            position: relative;
          }
          .tokenomics li::before {
            content: "•";
            color: #FFC107;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          .cta {
            text-align: center;
            margin-top: 40px;
          }
          .phase {
            margin-bottom: 20px;
          }
          @media (max-width: 768px) {
            .tokenomics ul {
              columns: 1;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SOVRAN WEALTH FUND (SWF)</h1>
            <p>A sovereign-backed digital economy designed to empower communities, reward creators, and redistribute wealth through decentralized technology.</p>
          </div>
          
          <h2>ABOUT US</h2>
          <p>The Sovran Wealth Fund is a decentralized financial ecosystem governed by the Moabite Federation PMA. We serve Indigenous communities, decentralized investors, and artists by offering a platform where wealth is created, governed, and shared transparently.</p>
          
          <h2>MISSION STATEMENT</h2>
          <p>To create a sovereign economic infrastructure that empowers people through financial access, cultural ownership, and digital governance. We believe every sovereign has the right to own their data, currency, voice — and destiny.</p>
          
          <div class="tokenomics">
            <h2>TOKENOMICS</h2>
            <p><strong>Total Supply:</strong> 10,000,000,000 SWF</p>
            <p><strong>Token Type:</strong> BEP-20 (BNB Chain)</p>
            <p><strong>Contract:</strong> 0x7e243288B287BEe84A7D40E8520444f47af88335</p>
            
            <h3>Distribution:</h3>
            <ul>
              <li>Liquidity: 20%</li>
              <li>Rewards: 15%</li>
              <li>Treasury: 5%</li>
              <li>Development: 5%</li>
              <li>Marketing: 5%</li>
              <li>Team: 5%</li>
              <li>Governance: 4%</li>
              <li>Community: 4%</li>
              <li>Solo Operator: 5%</li>
              <li>Advisors: 4%</li>
              <li>Foundation: 5%</li>
              <li>Charity: 5%</li>
            </ul>
          </div>
          
          <h2>CURRENT DEVELOPMENT PHASE</h2>
          <div class="phase">
            <p>We're currently in <strong>Phase II: Community Launch</strong> which includes:</p>
            <ul>
              <li>Early Adopter Onboarding</li>
              <li>DAO Council Activation</li>
              <li>Airdrop + Rewards Program</li>
              <li>Cross-Collateralization with 11 Crypto Assets</li>
            </ul>
          </div>
          
          <div class="cta">
            <p>Our platform is currently under development and will be available soon.</p>
            <p>In the meantime, you can register for early access on our landing page.</p>
            <a href="/" class="btn">Register for Early Access</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  
  // If not in maintenance mode or path is allowed, continue to the next middleware
  next();
}

module.exports = maintenanceMiddleware;