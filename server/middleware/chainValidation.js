/**
 * Chain Validation Middleware
 * Ensures all blockchain requests are using Arbitrum One (Chain ID: 42161)
 */

const ARBITRUM_ONE_CHAIN_ID = 42161;
const ARBITRUM_ONE_CHAIN_ID_HEX = '0xa4b1';

/**
 * Middleware to validate that the user is connected to Arbitrum One
 */
function validateArbitrumChain(req, res, next) {
  const chainId = req.headers['x-chain-id'] || req.body?.chainId || req.query?.chainId;
  
  if (!chainId) {
    // If no chain ID provided, warn but don't block (optional validation)
    console.warn('⚠️ No chain ID provided in request');
    return next();
  }
  
  // Parse chain ID (handle both decimal and hex formats)
  let numericChainId;
  if (typeof chainId === 'string') {
    numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
  } else {
    numericChainId = chainId;
  }
  
  // Validate it's Arbitrum One
  if (numericChainId !== ARBITRUM_ONE_CHAIN_ID) {
    return res.status(400).json({
      success: false,
      error: 'Wrong network',
      message: `Please switch to Arbitrum One (Chain ID: ${ARBITRUM_ONE_CHAIN_ID})`,
      currentChainId: numericChainId,
      requiredChainId: ARBITRUM_ONE_CHAIN_ID,
      requiredChainIdHex: ARBITRUM_ONE_CHAIN_ID_HEX
    });
  }
  
  // Chain ID is valid
  next();
}

/**
 * Strict middleware that requires Arbitrum One connection
 */
function requireArbitrumChain(req, res, next) {
  const chainId = req.headers['x-chain-id'] || req.body?.chainId || req.query?.chainId;
  
  if (!chainId) {
    return res.status(400).json({
      success: false,
      error: 'Chain ID required',
      message: `Please connect to Arbitrum One (Chain ID: ${ARBITRUM_ONE_CHAIN_ID})`,
      requiredChainId: ARBITRUM_ONE_CHAIN_ID,
      requiredChainIdHex: ARBITRUM_ONE_CHAIN_ID_HEX
    });
  }
  
  // Parse and validate
  let numericChainId;
  if (typeof chainId === 'string') {
    numericChainId = chainId.startsWith('0x') 
      ? parseInt(chainId, 16) 
      : parseInt(chainId, 10);
  } else {
    numericChainId = chainId;
  }
  
  if (numericChainId !== ARBITRUM_ONE_CHAIN_ID) {
    return res.status(400).json({
      success: false,
      error: 'Wrong network',
      message: `Please switch to Arbitrum One (Chain ID: ${ARBITRUM_ONE_CHAIN_ID})`,
      currentChainId: numericChainId,
      requiredChainId: ARBITRUM_ONE_CHAIN_ID,
      requiredChainIdHex: ARBITRUM_ONE_CHAIN_ID_HEX
    });
  }
  
  next();
}

module.exports = {
  validateArbitrumChain,
  requireArbitrumChain,
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_ONE_CHAIN_ID_HEX
};
