/**
 * Axiom Smart City - Delegation Panel Component
 * Allows users to delegate AXM voting power
 */

'use client';

import React, { useState, useEffect } from 'react';
import { delegationService, VotingPower } from '../../lib/services/DelegationService';
import { useWallet } from '../WalletConnect/WalletContext';
import { ethers } from 'ethers';

export const DelegationPanel: React.FC = () => {
  const { walletState } = useWallet();
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [currentDelegate, setCurrentDelegate] = useState<string>('');
  const [delegateTo, setDelegateTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (walletState.isConnected && walletState.address) {
      loadDelegationInfo();
    }
  }, [walletState.address, walletState.isConnected]);

  const loadDelegationInfo = async () => {
    if (!walletState.address) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [power, delegate, activated] = await Promise.all([
        delegationService.getVotingPower(walletState.address),
        delegationService.getCurrentDelegate(walletState.address),
        delegationService.isVotingPowerActivated(walletState.address)
      ]);

      setVotingPower(power);
      setCurrentDelegate(delegate);
      setIsActivated(activated);
    } catch (err: any) {
      setError(err.message || 'Failed to load delegation info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateVotingPower = async () => {
    if (!walletState.address) return;

    setIsDelegating(true);
    setError(null);
    setSuccess(null);

    try {
      const txHash = await delegationService.activateVotingPower(walletState.address);
      
      if (txHash) {
        setSuccess(`✅ Voting power activated! Transaction: ${txHash.substring(0, 10)}...`);
      } else {
        setSuccess('✅ Voting power already activated!');
      }

      // Reload delegation info
      await loadDelegationInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to activate voting power');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateTo || !ethers.isAddress(delegateTo)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setIsDelegating(true);
    setError(null);
    setSuccess(null);

    try {
      const txHash = await delegationService.delegateVotes(delegateTo);
      setSuccess(`✅ Delegation successful! Transaction: ${txHash.substring(0, 10)}...`);
      setDelegateTo('');
      
      // Reload delegation info
      await loadDelegationInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to delegate votes');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleDelegateToSelf = async () => {
    if (!walletState.address) return;
    
    setDelegateTo(walletState.address);
    
    // Auto-submit
    setTimeout(() => {
      handleDelegate();
    }, 100);
  };

  const formatAddress = (address: string) => {
    if (address === ethers.ZeroAddress) return 'None';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!walletState.isConnected) {
    return (
      <div className="delegation-panel">
        <div className="not-connected">
          <div className="icon">🗳️</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect your wallet to participate in Axiom governance</p>
        </div>

        <style jsx>{`
          .delegation-panel {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 1px solid #444;
            border-radius: 16px;
            padding: 32px;
          }

          .not-connected {
            text-align: center;
            padding: 40px 20px;
          }

          .icon {
            font-size: 64px;
            margin-bottom: 16px;
          }

          .not-connected h3 {
            color: #ffd700;
            margin-bottom: 8px;
          }

          .not-connected p {
            color: #999;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="delegation-panel">
      <div className="panel-header">
        <h2>🗳️ Voting Power Delegation</h2>
        <p>Delegate your AXM tokens to participate in governance</p>
      </div>

      {isLoading ? (
        <div className="loading">Loading delegation info...</div>
      ) : (
        <>
          {/* Voting Power Display */}
          <div className="voting-power-section">
            <h3>Your Voting Power</h3>
            
            <div className="power-grid">
              <div className="power-card">
                <div className="power-label">Direct Power</div>
                <div className="power-value">{votingPower?.direct || '0'} AXM</div>
              </div>
              
              <div className="power-card">
                <div className="power-label">Delegated To You</div>
                <div className="power-value">{votingPower?.delegated || '0'} AXM</div>
              </div>
              
              <div className="power-card total">
                <div className="power-label">Total Voting Power</div>
                <div className="power-value">{votingPower?.total || '0'} AXM</div>
              </div>
            </div>

            <div className="delegate-status">
              <span className="status-label">Current Delegate:</span>
              <span className="status-value">
                {currentDelegate === ethers.ZeroAddress ? (
                  <span className="inactive">❌ Not Activated</span>
                ) : currentDelegate === walletState.address ? (
                  <span className="self">✅ Self (Activated)</span>
                ) : (
                  <span className="delegated">🔗 {formatAddress(currentDelegate)}</span>
                )}
              </span>
            </div>
          </div>

          {/* Activation Section */}
          {!isActivated && (
            <div className="activation-section">
              <div className="info-box">
                <div className="info-icon">💡</div>
                <div className="info-content">
                  <h4>Activate Your Voting Power</h4>
                  <p>
                    You must delegate your tokens (even to yourself) to activate your voting power.
                    This is a one-time setup that enables you to vote on proposals.
                  </p>
                </div>
              </div>

              <button
                onClick={handleActivateVotingPower}
                className="activate-btn"
                disabled={isDelegating}
              >
                {isDelegating ? '⏳ Activating...' : '🔓 Activate Voting Power'}
              </button>
            </div>
          )}

          {/* Delegation Form */}
          <div className="delegation-section">
            <h3>Delegate Your Votes</h3>
            
            <div className="delegation-form">
              <div className="input-group">
                <label>Delegate To Address</label>
                <input
                  type="text"
                  value={delegateTo}
                  onChange={(e) => setDelegateTo(e.target.value)}
                  placeholder="0x..."
                  className="address-input"
                  disabled={isDelegating}
                />
              </div>

              <div className="button-group">
                <button
                  onClick={handleDelegate}
                  className="delegate-btn"
                  disabled={!delegateTo || isDelegating}
                >
                  {isDelegating ? '⏳ Delegating...' : '🗳️ Delegate'}
                </button>

                <button
                  onClick={handleDelegateToSelf}
                  className="self-btn"
                  disabled={isDelegating}
                >
                  Delegate to Self
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="message error">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="message success">
              {success}
            </div>
          )}

          {/* Info Box */}
          <div className="info-box learn-more">
            <div className="info-icon">📚</div>
            <div className="info-content">
              <h4>About Delegation</h4>
              <ul>
                <li>Delegating doesn't transfer your tokens - you keep full ownership</li>
                <li>You can change your delegate at any time</li>
                <li>Delegating to yourself activates your own voting power</li>
                <li>Your voting power equals your AXM token balance</li>
              </ul>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .delegation-panel {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border: 2px solid #ffd700;
          border-radius: 16px;
          padding: 32px;
          max-width: 800px;
          margin: 0 auto;
        }

        .panel-header {
          margin-bottom: 32px;
        }

        .panel-header h2 {
          color: #ffd700;
          margin: 0 0 8px 0;
          font-size: 28px;
        }

        .panel-header p {
          color: #999;
          margin: 0;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #ffd700;
        }

        .voting-power-section {
          background: rgba(255, 215, 0, 0.05);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .voting-power-section h3 {
          color: #fff;
          margin: 0 0 16px 0;
        }

        .power-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .power-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #444;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .power-card.total {
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
        }

        .power-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .power-value {
          font-size: 24px;
          font-weight: 700;
          color: #ffd700;
        }

        .delegate-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .status-label {
          color: #999;
          font-weight: 600;
        }

        .status-value .inactive {
          color: #ff4444;
        }

        .status-value .self {
          color: #4CAF50;
        }

        .status-value .delegated {
          color: #ffd700;
        }

        .activation-section {
          margin-bottom: 24px;
        }

        .delegation-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .delegation-section h3 {
          color: #fff;
          margin: 0 0 16px 0;
        }

        .delegation-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          color: #999;
          font-size: 14px;
          font-weight: 600;
        }

        .address-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid #444;
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-family: monospace;
          font-size: 14px;
        }

        .address-input:focus {
          outline: none;
          border-color: #ffd700;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .delegate-btn,
        .self-btn,
        .activate-btn {
          padding: 14px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .delegate-btn {
          flex: 1;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #1a1a1a;
        }

        .delegate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
        }

        .self-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #ffd700;
          border: 1px solid #ffd700;
        }

        .self-btn:hover:not(:disabled) {
          background: rgba(255, 215, 0, 0.2);
        }

        .activate-btn {
          width: 100%;
          background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
          color: white;
        }

        .activate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }

        .delegate-btn:disabled,
        .self-btn:disabled,
        .activate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .message.error {
          background: rgba(255, 68, 68, 0.2);
          color: #ff4444;
          border: 1px solid #ff4444;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
          border: 1px solid #4CAF50;
        }

        .info-box {
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.3);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .info-box.learn-more {
          background: rgba(255, 215, 0, 0.05);
          border-color: rgba(255, 215, 0, 0.2);
        }

        .info-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .info-content h4 {
          color: #fff;
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .info-content p {
          color: #ccc;
          margin: 0;
          line-height: 1.5;
          font-size: 14px;
        }

        .info-content ul {
          color: #ccc;
          margin: 8px 0 0 0;
          padding-left: 20px;
          line-height: 1.6;
          font-size: 14px;
        }

        .info-content li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};

export default DelegationPanel;
