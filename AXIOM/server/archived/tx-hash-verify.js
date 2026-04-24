/**
 * Transaction Hash Verification Module for SWF Token
 * 
 * This module adds an API endpoint to verify the SWF token using
 * the original deployment transaction hash.
 */

const { spawn } = require('child_process');
const express = require('express');
const path = require('path');

// Routes for transaction hash verification
function registerTxHashVerificationRoutes(app) {
  console.log('Registering transaction hash verification routes');

  // API endpoint to run verification script
  app.get('/api/verify-with-tx-hash', async (req, res) => {
    try {
      // Get the transaction hash from query params or use the default
      const txHash = req.query.txHash || '0x13c3d11fe7bcc40bd45acf107ee9d3398575030106cfdad74bd0dca123dd6c6e';
      const contractAddress = req.query.address || '0xa0b0AaCbf4E7261691689e5F240C278fB295edF7';
      
      console.log(`Starting verification with transaction hash: ${txHash}`);
      console.log(`Contract address: ${contractAddress}`);
      
      // Start the verification process
      const verification = spawn('node', [
        path.join(__dirname, '../scripts/txhash-verify.js')
      ], {
        env: {
          ...process.env,
          TX_HASH: txHash,
          CONTRACT_ADDRESS: contractAddress
        }
      });
      
      // Create a response object
      const responseData = {
        status: 'started',
        message: `Verification process started for transaction ${txHash}`,
        logs: []
      };
      
      // Send the initial response
      res.json(responseData);
      
      // Set up listeners for the verification process
      verification.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`Verification stdout: ${output}`);
        responseData.logs.push(output);
      });
      
      verification.stderr.on('data', (data) => {
        const output = data.toString().trim();
        console.error(`Verification stderr: ${output}`);
        responseData.logs.push(`ERROR: ${output}`);
      });
      
      verification.on('close', (code) => {
        console.log(`Verification process exited with code ${code}`);
        
        if (code === 0) {
          responseData.status = 'success';
          responseData.message = 'Verification completed successfully';
        } else {
          responseData.status = 'error';
          responseData.message = `Verification failed with exit code ${code}`;
        }
        
        // Log but don't send response again
        console.log('Verification completed', responseData);
      });
      
    } catch (error) {
      console.error('Error starting verification:', error);
      res.status(500).json({
        status: 'error',
        message: `Error starting verification: ${error.message}`
      });
    }
  });

  // Server-sent events endpoint for verification status updates
  app.get('/api/verification-status-stream', (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send a heartbeat every 15 seconds to keep the connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({type: 'heartbeat'})}\n\n`);
    }, 15000);
    
    // Clean up when client disconnects
    req.on('close', () => {
      clearInterval(heartbeatInterval);
    });
  });

  // Dedicated route for the tx hash verification UI
  app.get('/admin/tx-hash-verification', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin/tx-hash-verification.html'));
  });

  console.log('Transaction hash verification routes registered');
}

module.exports = {
  registerTxHashVerificationRoutes
};