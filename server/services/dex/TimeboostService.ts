import { ethers } from 'ethers';

const TIMEBOOST_AUCTION_CONTRACT = '0x5fcb496a31b7ae91e7c9078ec662bd7a55cd3079';
const TIMEBOOST_AUCTIONEER_RPC = 'https://timeboost-auctioneer.arbitrum.io';
const ARBITRUM_SEQUENCER_RPC = 'https://arb1-sequencer.arbitrum.io/rpc';
const ARBITRUM_ONE_CHAIN_ID = 42161;

export interface TimeboostConfig {
  enabled: boolean;
  maxBidAmount: bigint;
  priorityTransactionTypes: ('swap' | 'liquidation' | 'limitOrder')[];
}

const EIP712_DOMAIN = {
  name: 'ExpressLaneAuction',
  version: '1',
  chainId: ARBITRUM_ONE_CHAIN_ID,
  verifyingContract: TIMEBOOST_AUCTION_CONTRACT
};

const BID_TYPES = {
  Bid: [
    { name: 'round', type: 'uint64' },
    { name: 'expressLaneController', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ]
};

class TimeboostService {
  private provider: ethers.JsonRpcProvider;
  private config: TimeboostConfig;

  constructor() {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    this.config = {
      enabled: process.env.TIMEBOOST_ENABLED === 'true',
      maxBidAmount: ethers.parseEther(process.env.TIMEBOOST_MAX_BID || '0.1'),
      priorityTransactionTypes: ['liquidation', 'swap']
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async getCurrentRoundFromAuctioneer(): Promise<bigint> {
    try {
      const response = await fetch(TIMEBOOST_AUCTIONEER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'auctioneer_currentRound',
          params: [],
          id: 1
        })
      });
      const result = await response.json();
      if (result.result) {
        return BigInt(result.result);
      }
      const block = await this.provider.getBlock('latest');
      return block ? BigInt(Math.floor(block.timestamp / 60)) : 0n;
    } catch {
      const block = await this.provider.getBlock('latest');
      return block ? BigInt(Math.floor(block.timestamp / 60)) : 0n;
    }
  }

  async submitBid(
    wallet: ethers.Wallet,
    bidAmount: bigint
  ): Promise<{ success: boolean; round: bigint; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, round: 0n, error: 'Timeboost disabled' };
      }

      if (bidAmount > this.config.maxBidAmount) {
        return { success: false, round: 0n, error: 'Bid exceeds maximum' };
      }

      const currentRound = await this.getCurrentRoundFromAuctioneer();
      const targetRound = currentRound + 1n;

      const bid = {
        round: targetRound,
        expressLaneController: wallet.address,
        amount: bidAmount
      };

      const signature = await wallet.signTypedData(
        EIP712_DOMAIN,
        BID_TYPES,
        bid
      );

      const response = await fetch(TIMEBOOST_AUCTIONEER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'auctioneer_submitBid',
          params: [{
            chainId: ARBITRUM_ONE_CHAIN_ID,
            auctionContractAddress: TIMEBOOST_AUCTION_CONTRACT,
            round: Number(targetRound),
            expressLaneController: wallet.address,
            amount: bidAmount.toString(),
            signature
          }],
          id: 1
        })
      });

      const result = await response.json();
      
      if (result.error) {
        return { success: false, round: targetRound, error: result.error.message };
      }

      return { success: true, round: targetRound };
    } catch (error: any) {
      return { success: false, round: 0n, error: error.message };
    }
  }

  async submitExpressLaneTransaction(
    controllerWallet: ethers.Wallet,
    signedTransaction: string,
    roundNumber: bigint,
    sequenceNumber?: bigint
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, error: 'Timeboost disabled' };
      }

      const seqNum = sequenceNumber ?? BigInt('18446744073709551615');

      const chainIdBytes = ethers.zeroPadValue(ethers.toBeHex(ARBITRUM_ONE_CHAIN_ID), 32);
      const roundBytes = ethers.zeroPadValue(ethers.toBeHex(roundNumber), 8);
      const seqBytes = ethers.zeroPadValue(ethers.toBeHex(seqNum), 8);
      const txBytes = ethers.getBytes(signedTransaction);

      const messageToSign = ethers.concat([
        chainIdBytes,
        TIMEBOOST_AUCTION_CONTRACT,
        roundBytes,
        seqBytes,
        txBytes
      ]);

      const messageHash = ethers.keccak256(messageToSign);
      const signature = await controllerWallet.signingKey.sign(messageHash);
      const fullSignature = ethers.Signature.from(signature).serialized;

      const response = await fetch(ARBITRUM_SEQUENCER_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'timeboost_sendExpressLaneTransaction',
          params: [{
            chainId: ARBITRUM_ONE_CHAIN_ID,
            round: Number(roundNumber),
            auctionContractAddress: TIMEBOOST_AUCTION_CONTRACT,
            sequence: Number(seqNum),
            transaction: signedTransaction,
            signature: fullSignature
          }],
          id: 1
        })
      });

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, txHash: result.result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendPrioritySwap(
    userSignedTx: string,
    controllerWallet: ethers.Wallet
  ): Promise<{ success: boolean; txHash?: string; usedExpressLane: boolean; error?: string }> {
    if (!this.config.enabled || !this.config.priorityTransactionTypes.includes('swap')) {
      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    }

    try {
      const currentRound = await this.getCurrentRoundFromAuctioneer();
      const result = await this.submitExpressLaneTransaction(
        controllerWallet,
        userSignedTx,
        currentRound
      );

      if (result.success) {
        return { success: true, txHash: result.txHash, usedExpressLane: true };
      }

      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    } catch (error: any) {
      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    }
  }

  async sendPriorityLiquidation(
    userSignedTx: string,
    controllerWallet: ethers.Wallet
  ): Promise<{ success: boolean; txHash?: string; usedExpressLane: boolean; error?: string }> {
    if (!this.config.enabled || !this.config.priorityTransactionTypes.includes('liquidation')) {
      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    }

    try {
      const currentRound = await this.getCurrentRoundFromAuctioneer();
      const result = await this.submitExpressLaneTransaction(
        controllerWallet,
        userSignedTx,
        currentRound
      );

      if (result.success) {
        return { success: true, txHash: result.txHash, usedExpressLane: true };
      }

      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    } catch (error: any) {
      const txResponse = await this.provider.broadcastTransaction(userSignedTx);
      return { success: true, txHash: txResponse.hash, usedExpressLane: false };
    }
  }

  shouldUsePriority(transactionType: 'swap' | 'liquidation' | 'limitOrder'): boolean {
    return this.config.enabled && 
           this.config.priorityTransactionTypes.includes(transactionType);
  }

  async getAuctionStatus(): Promise<{
    currentRound: bigint;
    enabled: boolean;
    maxBid: string;
    priorityTypes: string[];
  }> {
    const currentRound = await this.getCurrentRoundFromAuctioneer();
    return {
      currentRound,
      enabled: this.config.enabled,
      maxBid: ethers.formatEther(this.config.maxBidAmount),
      priorityTypes: this.config.priorityTransactionTypes
    };
  }

  updateConfig(updates: Partial<TimeboostConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const timeboostService = new TimeboostService();
export default TimeboostService;
