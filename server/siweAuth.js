const { SiweMessage, generateNonce } = require('siwe');
const { pool } = require('./db');

const ARBITRUM_CHAIN_ID = 42161;
const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

async function verifySiweSession(req) {
  return req.session && req.session.siwe && req.session.siwe.address;
}

function requireSiweAuth(req, res, next) {
  if (req.session && req.session.siwe && req.session.siwe.address) {
    return next();
  }
  return res.status(401).json({ 
    error: 'Wallet authentication required', 
    code: 'SIWE_AUTH_REQUIRED'
  });
}

function verifySiweAddress(req, res, next) {
  const suppliedAddress = req.body.ownerAddress || req.body.proposerAddress || req.body.walletAddress;
  
  if (!suppliedAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }
  
  if (!req.session || !req.session.siwe || !req.session.siwe.address) {
    return res.status(401).json({ 
      error: 'Please sign in with your wallet first',
      code: 'SIWE_AUTH_REQUIRED'
    });
  }
  
  const sessionAddress = req.session.siwe.address.toLowerCase();
  const requestAddress = suppliedAddress.toLowerCase();
  
  if (sessionAddress !== requestAddress) {
    return res.status(403).json({ 
      error: 'Address mismatch. You can only submit on behalf of your authenticated wallet.',
      code: 'ADDRESS_MISMATCH'
    });
  }
  
  return next();
}

function setupSiweRoutes(app) {
  app.get('/api/auth/siwe/nonce', (req, res) => {
    try {
      const nonce = generateNonce();
      req.session.siweNonce = nonce;
      req.session.siweNonceTimestamp = Date.now();
      
      res.json({ 
        nonce,
        expiresIn: MESSAGE_EXPIRY_MS / 1000
      });
    } catch (error) {
      console.error('Nonce generation error:', error);
      res.status(500).json({ error: 'Failed to generate nonce' });
    }
  });

  app.post('/api/auth/siwe/verify', async (req, res) => {
    try {
      const { message, signature } = req.body;
      
      if (!message || !signature) {
        return res.status(400).json({ error: 'Message and signature required' });
      }
      
      const storedNonce = req.session.siweNonce;
      const nonceTimestamp = req.session.siweNonceTimestamp;
      
      if (!storedNonce || !nonceTimestamp) {
        return res.status(400).json({ 
          error: 'No nonce found. Please request a new nonce first.',
          code: 'NONCE_MISSING'
        });
      }
      
      if (Date.now() - nonceTimestamp > MESSAGE_EXPIRY_MS) {
        delete req.session.siweNonce;
        delete req.session.siweNonceTimestamp;
        return res.status(400).json({ 
          error: 'Nonce expired. Please request a new nonce.',
          code: 'NONCE_EXPIRED'
        });
      }
      
      const siweMessage = new SiweMessage(message);
      
      if (siweMessage.nonce !== storedNonce) {
        return res.status(400).json({ 
          error: 'Invalid nonce. Please request a new nonce.',
          code: 'NONCE_INVALID'
        });
      }
      
      const fields = await siweMessage.verify({ 
        signature,
        nonce: storedNonce
      });
      
      if (!fields.success) {
        return res.status(401).json({ 
          error: 'Invalid signature',
          code: 'SIGNATURE_INVALID'
        });
      }
      
      delete req.session.siweNonce;
      delete req.session.siweNonceTimestamp;
      
      req.session.siwe = {
        address: fields.data.address,
        chainId: fields.data.chainId,
        authenticatedAt: new Date().toISOString(),
        domain: fields.data.domain
      };
      
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO wallet_auth_sessions (
            wallet_address, chain_id, authenticated_at, domain, session_id
          ) VALUES ($1, $2, NOW(), $3, $4)
          ON CONFLICT (wallet_address) 
          DO UPDATE SET 
            authenticated_at = NOW(),
            chain_id = EXCLUDED.chain_id,
            domain = EXCLUDED.domain,
            session_id = EXCLUDED.session_id
        `, [
          fields.data.address.toLowerCase(), 
          fields.data.chainId || ARBITRUM_CHAIN_ID,
          fields.data.domain,
          req.session.id
        ]);
      } catch (dbError) {
        console.warn('Failed to log auth session to database:', dbError.message);
      } finally {
        client.release();
      }
      
      res.json({ 
        success: true, 
        address: fields.data.address,
        chainId: fields.data.chainId,
        message: 'Wallet successfully authenticated'
      });
    } catch (error) {
      console.error('SIWE verification error:', error);
      res.status(401).json({ 
        error: 'Signature verification failed',
        details: error.message
      });
    }
  });

  app.get('/api/auth/siwe/session', (req, res) => {
    if (req.session && req.session.siwe) {
      res.json({
        authenticated: true,
        address: req.session.siwe.address,
        chainId: req.session.siwe.chainId,
        authenticatedAt: req.session.siwe.authenticatedAt
      });
    } else {
      res.json({
        authenticated: false,
        address: null
      });
    }
  });

  app.post('/api/auth/siwe/logout', (req, res) => {
    if (req.session && req.session.siwe) {
      delete req.session.siwe;
      delete req.session.siweNonce;
      delete req.session.siweNonceTimestamp;
      
      res.json({ 
        success: true, 
        message: 'Wallet session ended' 
      });
    } else {
      res.json({ 
        success: true, 
        message: 'No active wallet session' 
      });
    }
  });
}

module.exports = {
  setupSiweRoutes,
  requireSiweAuth,
  verifySiweAddress,
  verifySiweSession,
  ARBITRUM_CHAIN_ID
};
