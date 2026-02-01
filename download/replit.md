# Sovran Wealth Fund Platform - Replit Project

## Overview
The Sovran Wealth Fund Platform is a comprehensive decentralized wealth management system built on Binance Smart Chain. It integrates institutional-grade real estate tokenization, Kinesis gold-backed certificates, and advanced DeFi protocols. The platform's vision is to provide a robust, secure, and transparent environment for digital wealth management, empowering users with diverse investment opportunities. Key capabilities include the SWF Token (a verified contract on BSC Mainnet), an enhanced staking system, a professional banking dashboard, Merkle airdrop distribution, and a complete smart contract security suite. The platform also features advanced risk management, decentralized autonomous organization (DAO) governance, and a community savings circle (SouSou Circle) system, aiming for significant market potential in the DeFi space.

**Current Status:** Platform fully operational with streamlined wallet connectivity. Navigation routing issues resolved, Metal of the Gods section removed from navigation, and wallet connection system optimized from 8+ competing scripts down to a single unified connector. SWF token balance display now working with real-time balance fetching from BSC mainnet contract (August 2025).

## User Preferences
- Focus on fixing navigation and user experience issues
- Prioritize mobile device compatibility
- Ensure all sections display properly on deployed site
- Maintain BSC mainnet integration for production environment
- Remove duplicate wallet connection components (COMPLETED: 2025-08-01)
- Simple MetaMask-only wallet connection with reliable functionality (UPDATED: 2025-08-01)
- Must work specifically in web3 browsers like MetaMask mobile browser (CRITICAL: 2025-08-01)
- MetaMask wallet connection now working with proper mobile guidance (COMPLETED: 2025-08-01)
- Official MetaMask SDK integration following GitHub patterns (COMPLETED: 2025-08-01)
- Enhanced MetaMask Delegation Toolkit integration with smart account features (ADDED: 2025-08-01)
- Fixed duplicate class declaration errors in deployment (RESOLVED: 2025-08-01)
- Platform deployment issues resolved with proper entry point configuration (COMPLETED: 2025-08-01)
- Deployment hanging issues resolved with bulletproof raw HTTP server architecture (FIXED: 2025-08-01)
- Eliminated Express.js dependencies and external CDN blocking operations for reliable deployment (COMPLETED: 2025-08-01)
- Wallet connection system optimized - removed 8+ redundant MetaMask scripts, created single unified connector (COMPLETED: 2025-08-23)
- Real SWF token balance display integrated with BSC mainnet contract interaction (COMPLETED: 2025-08-23)
- Metal of the Gods navigation section removed per user request (COMPLETED: 2025-08-23)
- Mobile wallet detection implemented - shows MetaMask app instructions on mobile devices (COMPLETED: 2025-08-23)
- Banking page wallet connection UI properly integrated with unified system (COMPLETED: 2025-08-23)
- Text visibility issues resolved across all dark background sections (COMPLETED: 2025-08-23)
- Footer, CTA section, and Token Information text improved for better contrast (COMPLETED: 2025-08-23)
- Comprehensive system optimization: security, performance, and error handling improvements (COMPLETED: 2025-08-24)
- Script loading optimized with defer attributes for better page load performance (COMPLETED: 2025-08-24)
- Security utilities added to prevent DOM injection vulnerabilities (COMPLETED: 2025-08-24)
- Performance monitoring system with loading indicators and metrics tracking (COMPLETED: 2025-08-24)
- Global error handling system with user-friendly error messages (COMPLETED: 2025-08-24)

## System Architecture
The platform is built on a robust architecture featuring a professional HTML5/CSS3 frontend with a distinctive gold/black theme, a Node.js backend utilizing Express for API management, and Binance Smart Chain (BSC) integration via `ethers.js`. PostgreSQL is used for comprehensive data management. Core smart contracts include the verified SWF Token, which supports gold backing, real estate tokenization, and is designed with an UUPS upgradeability pattern. Wallet integration is primarily handled via MetaMask, with automatic BSC Mainnet network switching.

Key architectural decisions and design patterns include:
- **Modular Design:** The platform is segmented into distinct modules such as the SWF Token Contract, Enhanced Staking System, Banking Dashboard, Airdrop System, and Real Estate Tokenization, each with dedicated functionalities.
- **Security by Design:** Comprehensive smart contract security measures, including audit tools, verification systems, access control (e.g., ORACLE_ADMIN_ROLE, ANALYTICS_ADMIN_ROLE, FEED_ROLE), emergency pause functionality, and timelocked governance, are integrated throughout.
- **Responsive UI/UX:** A professional, responsive design ensures optimal viewing and interaction across various devices, with a consistent gold/black theme and intuitive navigation. Specific attention has been paid to mobile deep-linking for wallet connectivity and mobile-first component optimization.
- **Dynamic Data Handling:** The system relies on real-time data integration from blockchain and external APIs, with robust error handling, loading states, and fallback mechanisms to ensure data authenticity and system stability. This includes real-time balance displays, oracle price feeds, and risk assessment dashboards.
- **Enhanced Delegation Wallet System:** An advanced MetaMask connector integrating the official MetaMask Delegation Toolkit (https://github.com/MetaMask/delegation-toolkit) for embedded smart account functionality. Provides reliable wallet connectivity with delegation capabilities, smart account features, immediate web3 provider detection, mobile browser guidance, and automatic BSC network switching when connected.
- **Single-Route Architecture:** The platform is designed to operate primarily from a single root route (`/`), simplifying deployment and access by serving both frontend assets and API endpoints from a consolidated server.
- **Bulletproof Deployment:** Uses raw Node.js HTTP server with zero external dependencies, inline HTML, and no file system operations to ensure reliable deployment without hanging or blocking operations.
- **Decentralized Governance:** Integration of the SWFMasterDAO allows for decentralized proposal voting and treasury management with multi-signature controls.
- **Community-Oriented Features:** The SouSou Circle smart contract provides a blockchain-powered rotating savings group system with multi-token support and integrated staking requirements.
- **Revenue Acceleration Infrastructure:** Integration of premium educational courses, enterprise DeFi services, and tokenization transaction fees is supported by a comprehensive revenue management system, including Stripe payment integration.
- **Scalability and Maintainability:** Architectural choices prioritize clean code, modularity, and adherence to official SDK documentation patterns to facilitate future enhancements and long-term maintainability.

## External Dependencies
The Sovran Wealth Fund Platform integrates with several key external services and technologies:
- **Binance Smart Chain (BSC):** The primary blockchain for all smart contract deployments and transactions.
- **ethers.js:** JavaScript library for interacting with the Ethereum blockchain and its ecosystem, used for BSC integration.
- **MetaMask SDK:** Official MetaMask SDK from https://github.com/MetaMask/metamask-sdk for secure wallet connection, transaction signing, and mobile deep-linking.
- **MetaMask Delegation Toolkit:** Advanced delegation framework from https://github.com/MetaMask/delegation-toolkit enabling embedded smart contract wallets, granular permission sharing, and frictionless user experiences through delegation mechanisms.
- **PostgreSQL:** Relational database for persistent data storage and management.
- **Node.js (with Express):** Backend runtime environment and web application framework for API development.
- **Chainlink Price Feeds:** Utilized by the SWFOracleManager for real-time cryptocurrency price data (BTC, ETH, USDT, USDC, ADA, XRP, DOT, LINK, LTC, DOGE).
- **CoinGecko API:** For live cryptocurrency data and market prices.
- **DeNet Protocol:** For decentralized storage node management, tracking, and earnings.
- **Stripe:** Payment processing for premium educational courses and enterprise services.
- **OpenZeppelin Contracts:** Audited smart contract libraries providing foundational security and upgradeability patterns (e.g., UUPS, ERC20, AccessControl, ReentrancyGuard, Pausable, Ownable).
- **Chart.js:** For interactive data visualization and charting within dashboards.
- **Bootstrap:** Frontend framework for responsive design and UI components.
- **Font Awesome:** Icon library for visual enhancements.
- **IPFS:** Used for decentralized storage of documents, such as the Moabite Constitution and ritual archives.